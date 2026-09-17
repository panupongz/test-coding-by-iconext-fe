import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { NEVER, Subject, switchMap, takeUntil, timer } from 'rxjs';

import {
  PaymentApiResponse,
  PaymentMethod
} from '../../../core/models/payment-api.models';
import {
  PaymentOperation,
  SaleApiService
} from '../../../core/services/sale-api.service';
import { mapSaleToActiveSale } from '../mappers/sale.mapper';
import {
  ActiveSaleViewModel,
  CancellationState,
  PaymentErrorViewModel,
  PaymentState,
  PosSaleState,
  SaleCancellationReason
} from '../models/pos.models';
import {
  mapCancellationError,
  mapCreateSaleError,
  mapPaymentError
} from '../pos-error-messages';

const READY_STATE: PosSaleState = {
  status: 'ready',
  activeSale: null,
  submittedProductCode: null,
  error: null
};

const IDLE_PAYMENT_STATE: PaymentState = {
  status: 'idle',
  payment: null,
  error: null
};

const IDLE_CANCELLATION_STATE: CancellationState = {
  status: 'idle',
  reason: null,
  error: null
};

const EXPIRED_SALE_ERROR: PaymentErrorViewModel = {
  code: 'SALE_EXPIRED',
  message: 'รายการขายหมดอายุแล้ว กรุณาเริ่มรายการใหม่'
};

const THANK_YOU_DURATION_MS = 5000;

interface RetryableCreateSaleAttempt {
  readonly productCode: string;
  readonly idempotencyKey: string;
}

interface RetryablePaymentAttempt {
  readonly saleId: string;
  readonly paymentMethod: PaymentMethod;
  readonly amountReceived: number;
  readonly idempotencyKey: string;
}

interface RetryableCancellationAttempt {
  readonly saleId: string;
  readonly reason: SaleCancellationReason;
  readonly idempotencyKey: string;
}

export type PosFacadeEvent =
  | 'state-changed'
  | 'create-started'
  | 'create-succeeded'
  | 'create-definite-error'
  | 'payment-succeeded'
  | 'transaction-cleared';

@Injectable()
export class PosFacadeService implements OnDestroy {
  private readonly destroyed$ = new Subject<void>();
  private readonly activeSaleExpiry$ = new Subject<ActiveSaleViewModel | null>();
  private readonly thankYouReset$ = new Subject<boolean>();
  private readonly eventsSubject = new Subject<PosFacadeEvent>();
  private retryableCreateSaleAttempt: RetryableCreateSaleAttempt | null = null;
  private retryablePaymentAttempt: RetryablePaymentAttempt | null = null;
  private retryableCancellationAttempt: RetryableCancellationAttempt | null =
    null;
  private unavailable = false;

  readonly events$ = this.eventsSubject.asObservable();

  saleState: PosSaleState = READY_STATE;
  paymentState: PaymentState = IDLE_PAYMENT_STATE;
  cancellationState: CancellationState = IDLE_CANCELLATION_STATE;
  amountReceived = 0;
  selectedPaymentMethod: PaymentMethod | null = null;

  constructor(private readonly saleApi: SaleApiService) {
    this.activeSaleExpiry$
      .pipe(
        switchMap((sale) => {
          if (sale === null || sale.status !== 'PENDING') {
            return NEVER;
          }

          const expiresAt = Date.parse(sale.expiresAt);
          return Number.isFinite(expiresAt)
            ? timer(Math.max(0, expiresAt - Date.now()))
            : NEVER;
        }),
        takeUntil(this.destroyed$)
      )
      .subscribe(() => this.cancelActiveSale('expiry'));

    this.thankYouReset$
      .pipe(
        switchMap((shouldReset) =>
          shouldReset ? timer(THANK_YOU_DURATION_MS) : NEVER
        ),
        takeUntil(this.destroyed$)
      )
      .subscribe(() => this.clearTransaction());
  }

  get activeSale(): ActiveSaleViewModel | null {
    return this.saleState.activeSale;
  }

  get saleUnavailable(): boolean {
    return this.unavailable;
  }

  get isLoading(): boolean {
    return this.saleState.status === 'loading';
  }

  get isPaymentSubmitting(): boolean {
    return this.paymentState.status === 'submitting';
  }

  get isCancellationSubmitting(): boolean {
    return this.cancellationState.status === 'submitting';
  }

  canSubmitProductCode(productCode: string, isValid: boolean): boolean {
    if (this.isLoading) {
      return false;
    }

    return this.retryableCreateSaleAttempt === null
      ? isValid
      : productCode.trim() === this.retryableCreateSaleAttempt.productCode;
  }

  canReset(hasProductCodeInput: boolean): boolean {
    return (
      !this.isLoading &&
      !this.isPaymentSubmitting &&
      !this.isCancellationSubmitting &&
      this.paymentState.status !== 'paid' &&
      this.retryableCreateSaleAttempt === null &&
      this.retryablePaymentAttempt === null &&
      (this.saleState.status !== 'ready' || hasProductCodeInput)
    );
  }

  get canSelectPaymentMethod(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      !this.isPaymentSubmitting &&
      this.cancellationState.status === 'idle' &&
      !this.unavailable &&
      this.retryablePaymentAttempt === null
    );
  }

  get canAddCash(): boolean {
    return this.isCashPaymentAvailable && this.retryablePaymentAttempt === null;
  }

  get canConfirmCashPayment(): boolean {
    return (
      this.isCashPaymentAvailable &&
      this.activeSale !== null &&
      this.amountReceived >= this.activeSale.total
    );
  }

  get canConfirmQrPayment(): boolean {
    return this.isQrPaymentAvailable && this.activeSale !== null;
  }

  submitProductCode(productCode: string): void {
    if (!this.canSubmitProductCode(productCode, true)) {
      return;
    }

    const normalizedProductCode = productCode.trim();
    this.saleState = {
      status: 'loading',
      activeSale: null,
      submittedProductCode: normalizedProductCode,
      error: null
    };
    this.emit('create-started');

    const retryKey =
      this.retryableCreateSaleAttempt?.productCode === normalizedProductCode
        ? this.retryableCreateSaleAttempt.idempotencyKey
        : undefined;
    const operation =
      retryKey === undefined
        ? this.saleApi.createSale(normalizedProductCode)
        : this.saleApi.createSale(normalizedProductCode, retryKey);
    this.retryableCreateSaleAttempt = null;

    operation.response$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (response) => {
        this.retryableCreateSaleAttempt = null;
        const activeSale = mapSaleToActiveSale(response);
        this.saleState = {
          status: 'active',
          activeSale,
          submittedProductCode: normalizedProductCode,
          error: null
        };
        this.activeSaleExpiry$.next(activeSale);
        this.emit('create-succeeded');
      },
      error: (error: unknown) => {
        if (this.isAmbiguousRequestFailure(error)) {
          this.retryableCreateSaleAttempt = {
            productCode: normalizedProductCode,
            idempotencyKey: operation.idempotencyKey
          };
        }
        this.saleState = {
          status: 'error',
          activeSale: null,
          submittedProductCode: normalizedProductCode,
          error: mapCreateSaleError(error)
        };
        this.emit(
          this.retryableCreateSaleAttempt === null
            ? 'create-definite-error'
            : 'state-changed'
        );
      }
    });
  }

  selectPaymentMethod(paymentMethod: PaymentMethod): void {
    if (!this.canSelectPaymentMethod) {
      return;
    }

    if (this.selectedPaymentMethod !== paymentMethod) {
      this.selectedPaymentMethod = paymentMethod;
      this.paymentState = IDLE_PAYMENT_STATE;
      this.emit('state-changed');
    }
  }

  addCash(amount: 100 | 500 | 1000): void {
    if (!this.canAddCash) {
      return;
    }

    this.amountReceived += amount;
    this.paymentState = IDLE_PAYMENT_STATE;
    this.emit('state-changed');
  }

  confirmCashPayment(): void {
    if (!this.canConfirmCashPayment) {
      return;
    }

    this.submitPayment('CASH', this.amountReceived);
  }

  confirmQrPayment(): void {
    if (!this.canConfirmQrPayment || this.activeSale === null) {
      return;
    }

    this.submitPayment('QR_PAYMENT', this.activeSale.total);
  }

  resetTransaction(): void {
    if (this.activeSale?.status === 'PENDING' && !this.unavailable) {
      const reason =
        this.cancellationState.status === 'error'
          ? this.cancellationState.reason
          : 'user';
      this.cancelActiveSale(reason);
      return;
    }

    this.clearTransaction();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.activeSaleExpiry$.complete();
    this.thankYouReset$.complete();
    this.eventsSubject.complete();
  }

  private get isCashPaymentAvailable(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      this.selectedPaymentMethod === 'CASH' &&
      !this.isPaymentSubmitting &&
      this.cancellationState.status === 'idle' &&
      !this.unavailable
    );
  }

  private get isQrPaymentAvailable(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      this.selectedPaymentMethod === 'QR_PAYMENT' &&
      !this.isPaymentSubmitting &&
      this.cancellationState.status === 'idle' &&
      !this.unavailable
    );
  }

  private submitPayment(
    paymentMethod: PaymentMethod,
    amountReceived: number
  ): void {
    const activeSale = this.activeSale;
    if (activeSale === null) {
      return;
    }

    const saleId = activeSale.saleId;
    const retryKey =
      this.retryablePaymentAttempt?.saleId === saleId &&
      this.retryablePaymentAttempt.paymentMethod === paymentMethod &&
      this.retryablePaymentAttempt.amountReceived === amountReceived
        ? this.retryablePaymentAttempt.idempotencyKey
        : undefined;
    const operation = this.createPaymentOperation(
      paymentMethod,
      saleId,
      amountReceived,
      retryKey
    );

    this.retryablePaymentAttempt = null;
    this.paymentState = {
      status: 'submitting',
      payment: null,
      error: null
    };
    this.emit('state-changed');

    operation.response$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (response: PaymentApiResponse) => {
        this.retryablePaymentAttempt = null;

        if ('payment_id' in response) {
          this.paymentState = {
            status: 'paid',
            payment: response,
            error: null
          };
          this.updateActiveSaleStatus('PAID');
        } else {
          this.paymentState = {
            status: 'expired',
            payment: null,
            error: EXPIRED_SALE_ERROR
          };
          this.updateActiveSaleStatus('CANCELLED');
        }
        this.activeSaleExpiry$.next(null);
        if (this.paymentState.status === 'paid') {
          this.thankYouReset$.next(true);
          this.emit('payment-succeeded');
        } else {
          this.emit('state-changed');
        }
      },
      error: (error: unknown) => {
        if (this.isAmbiguousRequestFailure(error)) {
          this.retryablePaymentAttempt = {
            saleId,
            paymentMethod,
            amountReceived,
            idempotencyKey: operation.idempotencyKey
          };
        }
        this.paymentState = {
          status: 'error',
          payment: null,
          error: mapPaymentError(error)
        };
        this.synchronizeSaleAfterPaymentError(this.paymentState.error.code);
        this.emit('state-changed');
      }
    });
  }

  private cancelActiveSale(reason: SaleCancellationReason): void {
    const activeSale = this.activeSale;
    if (
      activeSale === null ||
      activeSale.status !== 'PENDING' ||
      this.unavailable ||
      this.isPaymentSubmitting ||
      this.retryablePaymentAttempt !== null ||
      this.isCancellationSubmitting
    ) {
      return;
    }

    const retryKey =
      this.retryableCancellationAttempt?.saleId === activeSale.saleId &&
      this.retryableCancellationAttempt.reason === reason
        ? this.retryableCancellationAttempt.idempotencyKey
        : undefined;
    const operation =
      retryKey === undefined
        ? this.saleApi.cancelSale(activeSale.saleId)
        : this.saleApi.cancelSale(activeSale.saleId, retryKey);

    this.retryableCancellationAttempt = null;
    this.cancellationState = {
      status: 'submitting',
      reason,
      error: null
    };
    this.emit('state-changed');

    operation.response$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: () => {
        this.retryableCancellationAttempt = null;
        this.cancellationState = {
          status: 'cancelled',
          reason,
          error: null
        };
        this.paymentState =
          reason === 'expiry'
            ? {
                status: 'expired',
                payment: null,
                error: EXPIRED_SALE_ERROR
              }
            : IDLE_PAYMENT_STATE;
        this.selectedPaymentMethod = null;
        this.amountReceived = 0;
        this.updateActiveSaleStatus('CANCELLED');
        this.activeSaleExpiry$.next(null);
        this.emit('state-changed');
      },
      error: (error: unknown) => {
        if (this.isAmbiguousRequestFailure(error)) {
          this.retryableCancellationAttempt = {
            saleId: activeSale.saleId,
            reason,
            idempotencyKey: operation.idempotencyKey
          };
        }

        const cancellationError = mapCancellationError(error);
        this.cancellationState = {
          status: 'error',
          reason,
          error: cancellationError
        };
        this.synchronizeSaleAfterCancellationError(cancellationError.code);
        this.emit('state-changed');
      }
    });
  }

  private clearTransaction(): void {
    this.activeSaleExpiry$.next(null);
    this.thankYouReset$.next(false);
    this.retryableCreateSaleAttempt = null;
    this.retryablePaymentAttempt = null;
    this.retryableCancellationAttempt = null;
    this.unavailable = false;
    this.saleState = READY_STATE;
    this.paymentState = IDLE_PAYMENT_STATE;
    this.cancellationState = IDLE_CANCELLATION_STATE;
    this.amountReceived = 0;
    this.selectedPaymentMethod = null;
    this.emit('transaction-cleared');
  }

  private createPaymentOperation(
    paymentMethod: PaymentMethod,
    saleId: string,
    amountReceived: number,
    retryKey?: string
  ): PaymentOperation {
    if (paymentMethod === 'CASH') {
      return retryKey === undefined
        ? this.saleApi.payCash(saleId, amountReceived)
        : this.saleApi.payCash(saleId, amountReceived, retryKey);
    }

    return retryKey === undefined
      ? this.saleApi.payQr(saleId, amountReceived)
      : this.saleApi.payQr(saleId, amountReceived, retryKey);
  }

  private isAmbiguousRequestFailure(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      (error.status === 0 || error.status === 408 || error.status >= 500)
    );
  }

  private synchronizeSaleAfterPaymentError(code: string): void {
    if (code === 'SALE_ALREADY_PAID') {
      this.retryablePaymentAttempt = null;
      this.updateActiveSaleStatus('PAID');
      this.activeSaleExpiry$.next(null);
    } else if (code === 'SALE_CANCELLED') {
      this.retryablePaymentAttempt = null;
      this.updateActiveSaleStatus('CANCELLED');
      this.activeSaleExpiry$.next(null);
    } else if (code === 'SALE_NOT_FOUND') {
      this.retryablePaymentAttempt = null;
      this.unavailable = true;
      this.activeSaleExpiry$.next(null);
    }
  }

  private synchronizeSaleAfterCancellationError(code: string): void {
    if (code === 'SALE_ALREADY_PAID') {
      this.retryableCancellationAttempt = null;
      this.updateActiveSaleStatus('PAID');
      this.activeSaleExpiry$.next(null);
    } else if (code === 'SALE_NOT_FOUND') {
      this.retryableCancellationAttempt = null;
      this.unavailable = true;
      this.activeSaleExpiry$.next(null);
    }
  }

  private updateActiveSaleStatus(status: 'PAID' | 'CANCELLED'): void {
    if (this.saleState.status !== 'active') {
      return;
    }

    this.saleState = {
      ...this.saleState,
      activeSale: {
        ...this.saleState.activeSale,
        status
      }
    };
  }

  private emit(event: PosFacadeEvent): void {
    this.eventsSubject.next(event);
  }
}

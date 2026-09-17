import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  AfterViewChecked,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { NEVER, Subject, switchMap, takeUntil, timer } from 'rxjs';

import {
  CashPaymentResponse,
  PaymentApiResponse,
  PaymentMethod,
  QrPaymentResponse
} from '../../core/models/payment-api.models';
import { CreateSaleResponse } from '../../core/models/sale-api.models';
import {
  PaymentOperation,
  SaleApiService
} from '../../core/services/sale-api.service';
import {
  mapCancellationError,
  mapCreateSaleError,
  mapPaymentError
} from './pos-error-messages';
import {
  ActiveSaleViewModel,
  CancellationState,
  CancelSaleErrorViewModel,
  CreateSaleErrorViewModel,
  PaymentErrorViewModel,
  PaymentState,
  PosSaleState,
  SaleCancellationReason
} from './models/pos.models';

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

const EXPIRED_SALE_ERROR: PaymentErrorViewModel = {
  code: 'SALE_EXPIRED',
  message: 'รายการขายหมดอายุแล้ว กรุณาเริ่มรายการใหม่'
};

const IDLE_CANCELLATION_STATE: CancellationState = {
  status: 'idle',
  reason: null,
  error: null
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

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('productCodeInput')
  private productCodeInput?: ElementRef<HTMLInputElement>;

  @ViewChild('thankYouDialog')
  private thankYouDialog?: ElementRef<HTMLElement>;

  readonly productCodeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\s*P\d{3}\s*$/)]
  });
  private readonly destroyed$ = new Subject<void>();
  private readonly activeSaleExpiry$ = new Subject<ActiveSaleViewModel | null>();
  private readonly thankYouReset$ = new Subject<boolean>();
  private retryableCreateSaleAttempt: RetryableCreateSaleAttempt | null = null;
  private retryablePaymentAttempt: RetryablePaymentAttempt | null = null;
  private retryableCancellationAttempt: RetryableCancellationAttempt | null =
    null;
  private saleUnavailable = false;
  private shouldFocusThankYouDialog = false;

  saleState: PosSaleState = READY_STATE;
  paymentState: PaymentState = IDLE_PAYMENT_STATE;
  cancellationState: CancellationState = IDLE_CANCELLATION_STATE;
  amountReceived = 0;
  selectedPaymentMethod: PaymentMethod | null = null;

  constructor(
    private readonly saleApi: SaleApiService,
    private readonly changeDetector: ChangeDetectorRef
  ) {
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

  get isLoading(): boolean {
    return this.saleState.status === 'loading';
  }

  get isPaymentSubmitting(): boolean {
    return this.paymentState.status === 'submitting';
  }

  get isCancellationSubmitting(): boolean {
    return this.cancellationState.status === 'submitting';
  }

  get activeSale(): ActiveSaleViewModel | null {
    return this.saleState.activeSale;
  }

  get submittedProductCode(): string | null {
    return this.saleState.submittedProductCode;
  }

  get createSaleError(): CreateSaleErrorViewModel | null {
    return this.saleState.error;
  }

  get canSubmitProductCode(): boolean {
    if (this.isLoading) {
      return false;
    }

    if (this.retryableCreateSaleAttempt !== null) {
      return (
        this.productCodeControl.value.trim() ===
        this.retryableCreateSaleAttempt.productCode
      );
    }

    return this.productCodeControl.valid;
  }

  get canReset(): boolean {
    return (
      !this.isLoading &&
      !this.isPaymentSubmitting &&
      !this.isCancellationSubmitting &&
      this.paymentState.status !== 'paid' &&
      this.retryableCreateSaleAttempt === null &&
      this.retryablePaymentAttempt === null &&
      (this.saleState.status !== 'ready' ||
        this.productCodeControl.value.length > 0)
    );
  }

  get canSelectPaymentMethod(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      !this.isPaymentSubmitting &&
      this.cancellationState.status === 'idle' &&
      !this.saleUnavailable &&
      this.retryablePaymentAttempt === null
    );
  }

  get canAddCash(): boolean {
    return (
      this.isCashPaymentAvailable && this.retryablePaymentAttempt === null
    );
  }

  get changeDue(): number {
    const total = this.activeSale?.total ?? 0;
    return Math.max(0, this.amountReceived - total);
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

  get paymentError(): PaymentErrorViewModel | null {
    return this.paymentState.error;
  }

  get isThankYouVisible(): boolean {
    return this.paymentState.status === 'paid';
  }

  get cancellationError(): CancelSaleErrorViewModel | null {
    return this.cancellationState.error;
  }

  get transactionActionLabel(): string {
    if (this.isCancellationSubmitting) {
      return 'กำลังยกเลิกรายการขาย…';
    }

    if (this.saleUnavailable) {
      return 'เริ่มรายการใหม่';
    }

    if (this.activeSale?.status === 'PENDING') {
      return this.cancellationState.status === 'error'
        ? 'ลองยกเลิกรายการขายอีกครั้ง'
        : 'ยกเลิกรายการขาย';
    }

    return this.saleState.status === 'ready'
      ? 'ล้างข้อมูล'
      : 'เริ่มรายการใหม่';
  }

  get saleStatusMessage(): string | null {
    if (this.saleUnavailable) {
      return 'ไม่พบรายการขายนี้ในระบบ กรุณาเริ่มรายการใหม่';
    }

    if (this.activeSale?.status === 'PAID') {
      return 'รายการขายนี้ชำระเงินแล้ว ไม่สามารถทำรายการซ้ำได้';
    }

    if (this.activeSale?.status === 'CANCELLED') {
      return this.cancellationState.reason === 'user'
        ? 'ยกเลิกรายการขายเรียบร้อยแล้ว'
        : 'รายการขายหมดอายุหรือถูกยกเลิกแล้ว กรุณาเริ่มรายการใหม่';
    }

    return null;
  }

  get completedCashPayment(): CashPaymentResponse | null {
    const payment = this.paymentState.payment;
    return payment?.payment_method === 'CASH' ? payment : null;
  }

  get completedQrPayment(): QrPaymentResponse | null {
    const payment = this.paymentState.payment;
    return payment?.payment_method === 'QR_PAYMENT' ? payment : null;
  }

  get statusLabel(): string {
    switch (this.saleState.status) {
      case 'loading':
        return 'Loading product';
      case 'active':
        if (this.isCancellationSubmitting) {
          return 'กำลังยกเลิกรายการขาย';
        }
        if (this.saleState.activeSale.status === 'CANCELLED') {
          return this.cancellationState.reason === 'user'
            ? 'ยกเลิกรายการขายแล้ว'
            : 'รายการขายหมดอายุ';
        }
        if (this.isPaymentSubmitting) {
          return 'กำลังดำเนินการชำระเงิน';
        }
        if (this.paymentState.status === 'paid') {
          return 'ชำระเงินสำเร็จ';
        }
        if (this.saleState.activeSale.status === 'PAID') {
          return 'ชำระเงินแล้ว';
        }
        if (this.paymentState.status === 'expired') {
          return 'รายการขายหมดอายุ';
        }
        return 'พร้อมรับชำระเงิน';
      case 'error':
        return 'พร้อมลองอีกครั้ง';
      default:
        return 'พร้อมสร้างรายการขายใหม่';
    }
  }

  addCash(amount: 100 | 500 | 1000): void {
    if (!this.canAddCash) {
      return;
    }

    this.amountReceived += amount;
    this.paymentState = IDLE_PAYMENT_STATE;
  }

  selectCashPayment(): void {
    if (!this.canSelectPaymentMethod) {
      return;
    }

    if (this.selectedPaymentMethod !== 'CASH') {
      this.selectedPaymentMethod = 'CASH';
      this.paymentState = IDLE_PAYMENT_STATE;
    }
  }

  selectQrPayment(): void {
    if (!this.canSelectPaymentMethod) {
      return;
    }

    if (this.selectedPaymentMethod !== 'QR_PAYMENT') {
      this.selectedPaymentMethod = 'QR_PAYMENT';
      this.paymentState = IDLE_PAYMENT_STATE;
    }
  }

  confirmCashPayment(): void {
    if (!this.canConfirmCashPayment || this.activeSale === null) {
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

  submitProductCode(): void {
    this.productCodeControl.markAsTouched();

    if (!this.canSubmitProductCode) {
      return;
    }

    const productCode = this.productCodeControl.value.trim();
    this.saleState = {
      status: 'loading',
      activeSale: null,
      submittedProductCode: productCode,
      error: null
    };
    this.productCodeControl.disable({ emitEvent: false });

    const retryKey =
      this.retryableCreateSaleAttempt?.productCode === productCode
        ? this.retryableCreateSaleAttempt.idempotencyKey
        : undefined;
    const operation =
      retryKey === undefined
        ? this.saleApi.createSale(productCode)
        : this.saleApi.createSale(productCode, retryKey);
    this.retryableCreateSaleAttempt = null;

    operation.response$
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (response) => {
          this.retryableCreateSaleAttempt = null;
          const activeSale = this.toActiveSale(response);
          this.saleState = {
            status: 'active',
            activeSale,
            submittedProductCode: productCode,
            error: null
          };
          this.productCodeControl.disable({ emitEvent: false });
          this.activeSaleExpiry$.next(activeSale);
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          if (this.isAmbiguousCreateSaleFailure(error)) {
            this.retryableCreateSaleAttempt = {
              productCode,
              idempotencyKey: operation.idempotencyKey
            };
          }
          this.saleState = {
            status: 'error',
            activeSale: null,
            submittedProductCode: productCode,
            error: mapCreateSaleError(error)
          };
          if (this.retryableCreateSaleAttempt === null) {
            this.productCodeControl.enable({ emitEvent: false });
            this.focusProductCodeEntry();
          }
          this.changeDetector.markForCheck();
        }
      });
  }

  resetTransaction(): void {
    if (!this.canReset) {
      return;
    }

    if (this.activeSale?.status === 'PENDING' && !this.saleUnavailable) {
      const reason =
        this.cancellationState.status === 'error'
          ? this.cancellationState.reason
          : 'user';
      this.cancelActiveSale(reason);
      return;
    }

    this.clearTransaction();
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocusThankYouDialog && this.isThankYouVisible) {
      this.shouldFocusThankYouDialog = false;
      this.thankYouDialog?.nativeElement.focus();
    }
  }

  private clearTransaction(): void {
    this.activeSaleExpiry$.next(null);
    this.thankYouReset$.next(false);

    this.retryableCreateSaleAttempt = null;
    this.retryablePaymentAttempt = null;
    this.retryableCancellationAttempt = null;
    this.saleUnavailable = false;
    this.shouldFocusThankYouDialog = false;
    this.saleState = READY_STATE;
    this.paymentState = IDLE_PAYMENT_STATE;
    this.cancellationState = IDLE_CANCELLATION_STATE;
    this.amountReceived = 0;
    this.selectedPaymentMethod = null;
    this.productCodeControl.reset('', { emitEvent: false });
    this.productCodeControl.enable({ emitEvent: false });
    this.changeDetector.markForCheck();
    this.focusProductCodeEntry();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.activeSaleExpiry$.complete();
    this.thankYouReset$.complete();
  }

  private toActiveSale(response: CreateSaleResponse): ActiveSaleViewModel {
    return {
      saleId: response.sale_id,
      productCode: response.product_code,
      productName: response.name,
      unitPrice: response.unit_price,
      quantity: response.quantity,
      total: response.total,
      status: response.status,
      createdAt: response.created_at,
      expiresAt: response.expires_at
    };
  }

  private isAmbiguousCreateSaleFailure(error: unknown): boolean {
    return this.isAmbiguousRequestFailure(error);
  }

  private focusProductCodeEntry(): void {
    timer(0)
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        if (
          this.productCodeControl.enabled &&
          this.saleState.status !== 'active'
        ) {
          this.productCodeInput?.nativeElement.focus();
        }
      });
  }

  private get isCashPaymentAvailable(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      this.selectedPaymentMethod === 'CASH' &&
      !this.isPaymentSubmitting &&
      this.cancellationState.status === 'idle' &&
      !this.saleUnavailable
    );
  }

  private get isQrPaymentAvailable(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      this.selectedPaymentMethod === 'QR_PAYMENT' &&
      !this.isPaymentSubmitting &&
      this.cancellationState.status === 'idle' &&
      !this.saleUnavailable
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

    operation.response$
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
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
            this.shouldFocusThankYouDialog = true;
            this.thankYouReset$.next(true);
          }
          this.changeDetector.markForCheck();
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
          this.changeDetector.markForCheck();
        }
      });
  }

  private cancelActiveSale(reason: SaleCancellationReason): void {
    const activeSale = this.activeSale;
    if (
      activeSale === null ||
      activeSale.status !== 'PENDING' ||
      this.saleUnavailable ||
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

    operation.response$
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
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
          this.changeDetector.markForCheck();
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
          this.changeDetector.markForCheck();
        }
      });
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
      this.saleUnavailable = true;
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
      this.saleUnavailable = true;
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

}

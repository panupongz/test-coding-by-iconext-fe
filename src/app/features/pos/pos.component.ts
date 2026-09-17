import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  ActiveSaleViewModel,
  CashPaymentResponse,
  CreateSaleErrorViewModel,
  CreateSaleResponse,
  isCreateSaleApiErrorCode,
  isPaymentApiErrorCode,
  PaymentApiResponse,
  PaymentApiErrorResponse,
  PaymentErrorViewModel,
  PaymentMethod,
  PaymentState,
  PosSaleState,
  QrPaymentResponse,
  SaleApiErrorResponse
} from '../../core/models/sale.models';
import {
  PaymentOperation,
  SaleApiService
} from '../../core/services/sale-api.service';

const READY_STATE: PosSaleState = {
  status: 'ready',
  activeSale: null,
  submittedProductCode: null,
  error: null
};

const DEFAULT_CREATE_SALE_ERROR: CreateSaleErrorViewModel = {
  code: 'CREATE_SALE_FAILED',
  message: 'Unable to create the sale. Please try again.'
};

const IDLE_PAYMENT_STATE: PaymentState = {
  status: 'idle',
  payment: null,
  error: null
};

const DEFAULT_PAYMENT_ERROR: PaymentErrorViewModel = {
  code: 'PAYMENT_FAILED',
  message: 'Unable to process the payment. Please try again.'
};

const EXPIRED_SALE_ERROR: PaymentErrorViewModel = {
  code: 'SALE_EXPIRED',
  message: 'This sale has expired. Reset the transaction to start again.'
};

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

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosComponent implements OnDestroy {
  readonly productCodeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\s*P\d{3}\s*$/)]
  });
  private readonly destroyed$ = new Subject<void>();
  private retryableCreateSaleAttempt: RetryableCreateSaleAttempt | null = null;
  private retryablePaymentAttempt: RetryablePaymentAttempt | null = null;

  saleState: PosSaleState = READY_STATE;
  paymentState: PaymentState = IDLE_PAYMENT_STATE;
  amountReceived = 0;
  selectedPaymentMethod: PaymentMethod | null = null;

  constructor(
    private readonly saleApi: SaleApiService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  get isLoading(): boolean {
    return this.saleState.status === 'loading';
  }

  get isPaymentSubmitting(): boolean {
    return this.paymentState.status === 'submitting';
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
    return !this.isLoading && this.productCodeControl.valid;
  }

  get canReset(): boolean {
    return (
      !this.isLoading &&
      !this.isPaymentSubmitting &&
      (this.saleState.status !== 'ready' ||
        this.productCodeControl.value.length > 0)
    );
  }

  get canSelectPaymentMethod(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      !this.isPaymentSubmitting &&
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
        if (this.isPaymentSubmitting) {
          return 'Processing payment';
        }
        if (this.paymentState.status === 'paid') {
          return 'Payment complete';
        }
        if (this.paymentState.status === 'expired') {
          return 'Sale expired';
        }
        return 'Sale ready for payment';
      case 'error':
        return 'Ready to retry';
      default:
        return 'Ready for a new sale';
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

    this.selectedPaymentMethod = 'CASH';
  }

  selectQrPayment(): void {
    if (!this.canSelectPaymentMethod) {
      return;
    }

    this.selectedPaymentMethod = 'QR_PAYMENT';
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
          this.saleState = {
            status: 'active',
            activeSale: this.toActiveSale(response),
            submittedProductCode: productCode,
            error: null
          };
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
            error: this.toSaleApiError(error)
          };
          this.productCodeControl.enable({ emitEvent: false });
          this.changeDetector.markForCheck();
        }
      });
  }

  resetTransaction(): void {
    if (!this.canReset) {
      return;
    }

    this.retryableCreateSaleAttempt = null;
    this.retryablePaymentAttempt = null;
    this.saleState = READY_STATE;
    this.paymentState = IDLE_PAYMENT_STATE;
    this.amountReceived = 0;
    this.selectedPaymentMethod = null;
    this.productCodeControl.reset('', { emitEvent: false });
    this.productCodeControl.enable({ emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
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

  private toSaleApiError(error: unknown): CreateSaleErrorViewModel {
    if (
      error instanceof HttpErrorResponse &&
      this.isSaleApiErrorResponse(error.error)
    ) {
      return error.error.error;
    }

    return DEFAULT_CREATE_SALE_ERROR;
  }

  private isAmbiguousCreateSaleFailure(error: unknown): boolean {
    return this.isAmbiguousRequestFailure(error);
  }

  private get isCashPaymentAvailable(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      this.selectedPaymentMethod === 'CASH' &&
      !this.isPaymentSubmitting
    );
  }

  private get isQrPaymentAvailable(): boolean {
    return (
      this.saleState.status === 'active' &&
      this.saleState.activeSale.status === 'PENDING' &&
      this.selectedPaymentMethod === 'QR_PAYMENT' &&
      !this.isPaymentSubmitting
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
            error: this.toPaymentApiError(error)
          };
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

  private toPaymentApiError(error: unknown): PaymentErrorViewModel {
    if (
      error instanceof HttpErrorResponse &&
      this.isPaymentApiErrorResponse(error.error)
    ) {
      return error.error.error;
    }

    return DEFAULT_PAYMENT_ERROR;
  }

  private isPaymentApiErrorResponse(
    value: unknown
  ): value is PaymentApiErrorResponse {
    if (typeof value !== 'object' || value === null || !('error' in value)) {
      return false;
    }

    const apiError = (value as { readonly error: unknown }).error;
    return (
      typeof apiError === 'object' &&
      apiError !== null &&
      'code' in apiError &&
      isPaymentApiErrorCode((apiError as { readonly code: unknown }).code) &&
      'message' in apiError &&
      typeof (apiError as { readonly message: unknown }).message === 'string'
    );
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

  private isSaleApiErrorResponse(value: unknown): value is SaleApiErrorResponse {
    if (typeof value !== 'object' || value === null || !('error' in value)) {
      return false;
    }

    const apiError = (value as { readonly error: unknown }).error;
    return (
      typeof apiError === 'object' &&
      apiError !== null &&
      'code' in apiError &&
      isCreateSaleApiErrorCode(
        (apiError as { readonly code: unknown }).code
      ) &&
      'message' in apiError &&
      typeof (apiError as { readonly message: unknown }).message === 'string'
    );
  }
}

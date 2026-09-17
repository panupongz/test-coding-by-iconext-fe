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
  CreateSaleErrorViewModel,
  CreateSaleResponse,
  isCreateSaleApiErrorCode,
  PosSaleState,
  SaleApiErrorResponse
} from '../../core/models/sale.models';
import { SaleApiService } from '../../core/services/sale-api.service';

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

interface RetryableCreateSaleAttempt {
  readonly productCode: string;
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

  saleState: PosSaleState = READY_STATE;

  constructor(
    private readonly saleApi: SaleApiService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  get isLoading(): boolean {
    return this.saleState.status === 'loading';
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
      (this.saleState.status !== 'ready' ||
        this.productCodeControl.value.length > 0)
    );
  }

  get statusLabel(): string {
    switch (this.saleState.status) {
      case 'loading':
        return 'Loading product';
      case 'active':
        return 'Sale ready for payment';
      case 'error':
        return 'Ready to retry';
      default:
        return 'Ready for a new sale';
    }
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
    this.saleState = READY_STATE;
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
    return (
      error instanceof HttpErrorResponse &&
      (error.status === 0 || error.status === 408 || error.status >= 500)
    );
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

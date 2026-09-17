import { PaymentResponse } from '../../../core/models/payment-api.models';
import { SaleStatus } from '../../../core/models/sale-api.models';

export interface CreateSaleErrorViewModel {
  readonly code: string;
  readonly message: string;
}

export interface PaymentErrorViewModel {
  readonly code: string;
  readonly message: string;
}

export interface CancelSaleErrorViewModel {
  readonly code: string;
  readonly message: string;
}

export type SaleCancellationReason = 'user' | 'expiry';

export type CancellationState =
  | {
      readonly status: 'idle';
      readonly reason: null;
      readonly error: null;
    }
  | {
      readonly status: 'submitting';
      readonly reason: SaleCancellationReason;
      readonly error: null;
    }
  | {
      readonly status: 'cancelled';
      readonly reason: SaleCancellationReason;
      readonly error: null;
    }
  | {
      readonly status: 'error';
      readonly reason: SaleCancellationReason;
      readonly error: CancelSaleErrorViewModel;
    };

export type PaymentState =
  | {
      readonly status: 'idle';
      readonly payment: null;
      readonly error: null;
    }
  | {
      readonly status: 'submitting';
      readonly payment: null;
      readonly error: null;
    }
  | {
      readonly status: 'paid';
      readonly payment: PaymentResponse;
      readonly error: null;
    }
  | {
      readonly status: 'expired';
      readonly payment: null;
      readonly error: PaymentErrorViewModel;
    }
  | {
      readonly status: 'error';
      readonly payment: null;
      readonly error: PaymentErrorViewModel;
    };

export interface ActiveSaleViewModel {
  readonly saleId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly unitPrice: number;
  readonly quantity: 1;
  readonly total: number;
  readonly status: SaleStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export type PosSaleState =
  | {
      readonly status: 'ready';
      readonly activeSale: null;
      readonly submittedProductCode: null;
      readonly error: null;
    }
  | {
      readonly status: 'loading';
      readonly activeSale: null;
      readonly submittedProductCode: string;
      readonly error: null;
    }
  | {
      readonly status: 'active';
      readonly activeSale: ActiveSaleViewModel;
      readonly submittedProductCode: string;
      readonly error: null;
    }
  | {
      readonly status: 'error';
      readonly activeSale: null;
      readonly submittedProductCode: string;
      readonly error: CreateSaleErrorViewModel;
    };

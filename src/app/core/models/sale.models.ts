export type SaleStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export const CREATE_SALE_API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'MALFORMED_JSON',
  'INVALID_PRODUCT_CODE',
  'PRODUCT_NOT_FOUND',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_TOO_LONG',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_FAILED',
  'INTERNAL_SERVER_ERROR'
] as const;

export type CreateSaleApiErrorCode =
  (typeof CREATE_SALE_API_ERROR_CODES)[number];

export const isCreateSaleApiErrorCode = (
  value: unknown
): value is CreateSaleApiErrorCode =>
  typeof value === 'string' &&
  CREATE_SALE_API_ERROR_CODES.some((errorCode) => errorCode === value);

export interface CreateSaleRequest {
  readonly product_code: string;
}

export interface CreateSaleResponse {
  readonly sale_id: string;
  readonly product_code: string;
  readonly name: string;
  readonly unit_price: number;
  readonly quantity: 1;
  readonly total: number;
  readonly status: SaleStatus;
  readonly created_at: string;
  readonly expires_at: string;
}

export interface SaleApiError {
  readonly code: CreateSaleApiErrorCode;
  readonly message: string;
}

export interface SaleApiErrorResponse {
  readonly error: SaleApiError;
}

export interface CreateSaleErrorViewModel {
  readonly code: string;
  readonly message: string;
}

export const PAYMENT_API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'MALFORMED_JSON',
  'SALE_NOT_FOUND',
  'SALE_ALREADY_PAID',
  'SALE_CANCELLED',
  'INSUFFICIENT_CASH_AMOUNT',
  'QR_AMOUNT_MISMATCH',
  'UNSUPPORTED_PAYMENT_METHOD',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_TOO_LONG',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_FAILED',
  'INTERNAL_SERVER_ERROR'
] as const;

export type PaymentApiErrorCode = (typeof PAYMENT_API_ERROR_CODES)[number];

export const isPaymentApiErrorCode = (
  value: unknown
): value is PaymentApiErrorCode =>
  typeof value === 'string' &&
  PAYMENT_API_ERROR_CODES.some((errorCode) => errorCode === value);

export type PaymentMethod = 'CASH' | 'QR_PAYMENT';

export interface CashPaymentRequest {
  readonly payment_method: 'CASH';
  readonly amount_received: number;
}

export interface QrPaymentRequest {
  readonly payment_method: 'QR_PAYMENT';
  readonly amount_received: number;
}

export type PaymentRequest = CashPaymentRequest | QrPaymentRequest;

export interface CashPaymentResponse {
  readonly payment_id: string;
  readonly payment_method: 'CASH';
  readonly amount_received: number;
  readonly paid_at: string;
  readonly change: number;
}

export interface QrPaymentResponse {
  readonly payment_id: string;
  readonly payment_method: 'QR_PAYMENT';
  readonly amount_received: number;
  readonly paid_at: string;
}

export type PaymentResponse = CashPaymentResponse | QrPaymentResponse;

export interface ExpiredSaleResponse {
  readonly sale_id: string;
  readonly status: 'CANCELLED';
}

export type CashPaymentApiResponse =
  | CashPaymentResponse
  | ExpiredSaleResponse;

export type QrPaymentApiResponse = QrPaymentResponse | ExpiredSaleResponse;

export type PaymentApiResponse = PaymentResponse | ExpiredSaleResponse;

export interface PaymentErrorViewModel {
  readonly code: string;
  readonly message: string;
}

export interface PaymentApiErrorResponse {
  readonly error: {
    readonly code: PaymentApiErrorCode;
    readonly message: string;
  };
}

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

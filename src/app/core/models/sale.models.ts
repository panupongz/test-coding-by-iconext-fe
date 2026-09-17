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

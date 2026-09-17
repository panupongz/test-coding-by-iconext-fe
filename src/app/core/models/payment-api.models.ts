import { ExpiredSaleResponse } from './sale-api.models';

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

export type CashPaymentApiResponse =
  | CashPaymentResponse
  | ExpiredSaleResponse;

export type QrPaymentApiResponse = QrPaymentResponse | ExpiredSaleResponse;

export type PaymentApiResponse = PaymentResponse | ExpiredSaleResponse;

export interface PaymentApiErrorResponse {
  readonly error: {
    readonly code: PaymentApiErrorCode;
    readonly message: string;
  };
}

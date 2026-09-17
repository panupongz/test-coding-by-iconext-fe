import { HttpErrorResponse } from '@angular/common/http';

import {
  CancelSaleApiErrorCode,
  CancelSaleApiErrorResponse,
  CancelSaleErrorViewModel,
  CreateSaleApiErrorCode,
  CreateSaleErrorViewModel,
  isCancelSaleApiErrorCode,
  isCreateSaleApiErrorCode,
  isPaymentApiErrorCode,
  PaymentApiErrorCode,
  PaymentApiErrorResponse,
  PaymentErrorViewModel,
  SaleApiErrorResponse
} from '../../core/models/sale.models';

const DEFAULT_CREATE_SALE_ERROR: CreateSaleErrorViewModel = {
  code: 'CREATE_SALE_FAILED',
  message: 'ไม่สามารถสร้างรายการขายได้ กรุณาลองอีกครั้ง'
};

const DEFAULT_PAYMENT_ERROR: PaymentErrorViewModel = {
  code: 'PAYMENT_FAILED',
  message: 'ไม่สามารถดำเนินการชำระเงินได้ กรุณาลองอีกครั้ง'
};

const DEFAULT_CANCELLATION_ERROR: CancelSaleErrorViewModel = {
  code: 'CANCEL_SALE_FAILED',
  message: 'ไม่สามารถยกเลิกรายการขายได้ กรุณาลองอีกครั้ง'
};

export const mapCreateSaleError = (
  error: unknown
): CreateSaleErrorViewModel => {
  if (
    error instanceof HttpErrorResponse &&
    isSaleApiErrorResponse(error.error)
  ) {
    return {
      code: error.error.error.code,
      message: createSaleErrorMessage(error.error.error.code)
    };
  }

  return DEFAULT_CREATE_SALE_ERROR;
};

export const mapPaymentError = (error: unknown): PaymentErrorViewModel => {
  if (
    error instanceof HttpErrorResponse &&
    isPaymentApiErrorResponse(error.error)
  ) {
    return {
      code: error.error.error.code,
      message: paymentErrorMessage(error.error.error.code)
    };
  }

  return DEFAULT_PAYMENT_ERROR;
};

export const mapCancellationError = (
  error: unknown
): CancelSaleErrorViewModel => {
  if (
    error instanceof HttpErrorResponse &&
    isCancelSaleApiErrorResponse(error.error)
  ) {
    return {
      code: error.error.error.code,
      message: cancellationErrorMessage(error.error.error.code)
    };
  }

  return DEFAULT_CANCELLATION_ERROR;
};

const createSaleErrorMessage = (code: CreateSaleApiErrorCode): string => {
  switch (code) {
    case 'PRODUCT_NOT_FOUND':
      return 'ไม่พบสินค้าสำหรับรหัสนี้ กรุณาตรวจสอบแล้วลองอีกครั้ง';
    case 'INVALID_PRODUCT_CODE':
    case 'VALIDATION_ERROR':
    case 'MALFORMED_JSON':
      return 'รหัสสินค้าไม่ถูกต้อง กรุณาใช้รูปแบบ P ตามด้วยตัวเลข 3 หลัก';
    case 'IDEMPOTENCY_CONFLICT':
    case 'IDEMPOTENCY_FAILED':
      return 'ไม่สามารถยืนยันรายการเดิมได้ กรุณาลองสร้างรายการอีกครั้ง';
    default:
      return DEFAULT_CREATE_SALE_ERROR.message;
  }
};

const paymentErrorMessage = (code: PaymentApiErrorCode): string => {
  switch (code) {
    case 'SALE_NOT_FOUND':
      return 'ไม่พบรายการขายนี้ในระบบ กรุณาเริ่มรายการใหม่';
    case 'SALE_ALREADY_PAID':
      return 'รายการขายนี้ชำระเงินแล้ว ไม่สามารถชำระซ้ำได้';
    case 'SALE_CANCELLED':
      return 'รายการขายนี้ถูกยกเลิกหรือหมดอายุแล้ว กรุณาเริ่มรายการใหม่';
    case 'INSUFFICIENT_CASH_AMOUNT':
      return 'จำนวนเงินสดไม่เพียงพอ กรุณารับเงินให้ครบก่อนยืนยัน';
    case 'QR_AMOUNT_MISMATCH':
      return 'ยอดชำระ QR ไม่ตรงกับยอดรวม กรุณาลองอีกครั้ง';
    case 'VALIDATION_ERROR':
    case 'MALFORMED_JSON':
    case 'UNSUPPORTED_PAYMENT_METHOD':
      return 'ข้อมูลการชำระเงินไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง';
    case 'IDEMPOTENCY_CONFLICT':
    case 'IDEMPOTENCY_FAILED':
      return 'ไม่สามารถยืนยันคำขอชำระเงินเดิมได้ กรุณาลองอีกครั้ง';
    default:
      return DEFAULT_PAYMENT_ERROR.message;
  }
};

const cancellationErrorMessage = (code: CancelSaleApiErrorCode): string => {
  switch (code) {
    case 'SALE_NOT_FOUND':
      return 'ไม่พบรายการขายนี้ในระบบ กรุณาเริ่มรายการใหม่';
    case 'SALE_ALREADY_PAID':
      return 'รายการขายนี้ชำระเงินแล้ว จึงไม่สามารถยกเลิกได้';
    case 'VALIDATION_ERROR':
      return 'ไม่สามารถส่งคำขอยกเลิกรายการขายได้ กรุณาลองอีกครั้ง';
    case 'IDEMPOTENCY_CONFLICT':
    case 'IDEMPOTENCY_FAILED':
      return 'ไม่สามารถยืนยันคำขอยกเลิกเดิมได้ กรุณาลองอีกครั้ง';
    default:
      return DEFAULT_CANCELLATION_ERROR.message;
  }
};

const isSaleApiErrorResponse = (
  value: unknown
): value is SaleApiErrorResponse => {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  const apiError = (value as { readonly error: unknown }).error;
  return hasApiErrorShape(apiError, isCreateSaleApiErrorCode);
};

const isPaymentApiErrorResponse = (
  value: unknown
): value is PaymentApiErrorResponse => {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  const apiError = (value as { readonly error: unknown }).error;
  return hasApiErrorShape(apiError, isPaymentApiErrorCode);
};

const isCancelSaleApiErrorResponse = (
  value: unknown
): value is CancelSaleApiErrorResponse => {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }

  const apiError = (value as { readonly error: unknown }).error;
  return hasApiErrorShape(apiError, isCancelSaleApiErrorCode);
};

const hasApiErrorShape = <TCode extends string>(
  value: unknown,
  isCode: (code: unknown) => code is TCode
): value is { readonly code: TCode; readonly message: string } =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  isCode((value as { readonly code: unknown }).code) &&
  'message' in value &&
  typeof (value as { readonly message: unknown }).message === 'string';

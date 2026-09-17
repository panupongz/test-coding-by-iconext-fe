import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api-config.token';
import {
  CashPaymentApiResponse,
  CashPaymentRequest,
  PaymentApiResponse,
  PaymentRequest,
  QrPaymentApiResponse,
  QrPaymentRequest
} from '../models/payment-api.models';
import {
  CancelSaleResponse,
  CreateSaleRequest,
  CreateSaleResponse
} from '../models/sale-api.models';

export interface CreateSaleOperation {
  readonly idempotencyKey: string;
  readonly response$: Observable<CreateSaleResponse>;
}

export interface PaymentOperation<
  TResponse extends PaymentApiResponse = PaymentApiResponse
> {
  readonly idempotencyKey: string;
  readonly response$: Observable<TResponse>;
}

export type CashPaymentOperation = PaymentOperation<CashPaymentApiResponse>;

export type QrPaymentOperation = PaymentOperation<QrPaymentApiResponse>;

export interface CancelSaleOperation {
  readonly idempotencyKey: string;
  readonly response$: Observable<CancelSaleResponse>;
}

@Injectable({ providedIn: 'root' })
export class SaleApiService {
  private readonly salesUrl: string;

  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) apiBaseUrl: string
  ) {
    this.salesUrl = `${apiBaseUrl.replace(/\/$/, '')}/sales`;
  }

  createSale(
    productCode: string,
    idempotencyKey: string = crypto.randomUUID()
  ): CreateSaleOperation {
    const request: CreateSaleRequest = { product_code: productCode };
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey
    });

    return {
      idempotencyKey,
      response$: this.http.post<CreateSaleResponse>(this.salesUrl, request, {
        headers
      })
    };
  }

  payCash(
    saleId: string,
    amountReceived: number,
    idempotencyKey: string = crypto.randomUUID()
  ): CashPaymentOperation {
    const request: CashPaymentRequest = {
      payment_method: 'CASH',
      amount_received: amountReceived
    };

    return this.pay<CashPaymentApiResponse>(saleId, request, idempotencyKey);
  }

  payQr(
    saleId: string,
    amountReceived: number,
    idempotencyKey: string = crypto.randomUUID()
  ): QrPaymentOperation {
    const request: QrPaymentRequest = {
      payment_method: 'QR_PAYMENT',
      amount_received: amountReceived
    };

    return this.pay<QrPaymentApiResponse>(saleId, request, idempotencyKey);
  }

  cancelSale(
    saleId: string,
    idempotencyKey: string = crypto.randomUUID()
  ): CancelSaleOperation {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey
    });

    return {
      idempotencyKey,
      response$: this.http.request<CancelSaleResponse>(
        'POST',
        `${this.salesUrl}/${encodeURIComponent(saleId)}/cancel`,
        { headers }
      )
    };
  }

  private pay<TResponse extends PaymentApiResponse>(
    saleId: string,
    request: PaymentRequest,
    idempotencyKey: string
  ): PaymentOperation<TResponse> {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey
    });

    return {
      idempotencyKey,
      response$: this.http.post<TResponse>(
        `${this.salesUrl}/${encodeURIComponent(saleId)}/payment`,
        request,
        { headers }
      )
    };
  }
}

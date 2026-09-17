import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api-config.token';
import {
  CashPaymentApiResponse,
  CashPaymentRequest,
  CreateSaleRequest,
  CreateSaleResponse
} from '../models/sale.models';

export interface CreateSaleOperation {
  readonly idempotencyKey: string;
  readonly response$: Observable<CreateSaleResponse>;
}

export interface CashPaymentOperation {
  readonly idempotencyKey: string;
  readonly response$: Observable<CashPaymentApiResponse>;
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
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey
    });

    return {
      idempotencyKey,
      response$: this.http.post<CashPaymentApiResponse>(
        `${this.salesUrl}/${encodeURIComponent(saleId)}/payment`,
        request,
        { headers }
      )
    };
  }
}

import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api-config.token';
import { CreateSaleResponse } from '../models/sale.models';
import { SaleApiService } from './sale-api.service';

describe('SaleApiService', () => {
  let service: SaleApiService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: API_BASE_URL, useValue: '/api/v1' }]
    });

    service = TestBed.inject(SaleApiService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('posts the exact create-sale request with a client idempotency key', () => {
    const response: CreateSaleResponse = {
      sale_id: '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176',
      product_code: 'P001',
      name: 'Iced Americano',
      unit_price: 60,
      quantity: 1,
      total: 60,
      status: 'PENDING',
      created_at: '2026-09-17T00:00:00.000Z',
      expires_at: '2026-09-17T00:05:00.000Z'
    };
    let actualResponse: CreateSaleResponse | undefined;

    service
      .createSale('P001')
      .response$.subscribe((sale) => (actualResponse = sale));

    const request = httpController.expectOne('/api/v1/sales');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ product_code: 'P001' });
    expect(request.request.headers.get('Idempotency-Key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    request.flush(response, { status: 201, statusText: 'Created' });

    expect(actualResponse).toEqual(response);
  });

  it('uses distinct keys for distinct operations and reuses a supplied retry key', () => {
    const firstOperation = service.createSale('P001');
    const secondOperation = service.createSale('P001');
    const retryOperation = service.createSale(
      'P001',
      firstOperation.idempotencyKey
    );

    expect(secondOperation.idempotencyKey).not.toBe(
      firstOperation.idempotencyKey
    );
    expect(retryOperation.idempotencyKey).toBe(firstOperation.idempotencyKey);

    firstOperation.response$.subscribe();
    secondOperation.response$.subscribe();
    retryOperation.response$.subscribe();

    const requests = httpController.match('/api/v1/sales');
    expect(requests.length).toBe(3);
    expect(requests[0].request.headers.get('Idempotency-Key')).toBe(
      firstOperation.idempotencyKey
    );
    expect(requests[1].request.headers.get('Idempotency-Key')).toBe(
      secondOperation.idempotencyKey
    );
    expect(requests[2].request.headers.get('Idempotency-Key')).toBe(
      firstOperation.idempotencyKey
    );
    requests.forEach((request) => request.flush({}));
  });
});

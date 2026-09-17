import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';

import {
  CashPaymentApiResponse,
  CashPaymentResponse
} from '../../../core/models/payment-api.models';
import {
  CancelSaleResponse,
  CreateSaleResponse
} from '../../../core/models/sale-api.models';
import {
  CancelSaleOperation,
  CashPaymentOperation,
  CreateSaleOperation,
  SaleApiService
} from '../../../core/services/sale-api.service';
import { PosFacadeService } from './pos-facade.service';

const SALE_RESPONSE: CreateSaleResponse = {
  sale_id: 'sale-1',
  product_code: 'P001',
  name: 'Iced Americano',
  unit_price: 60,
  quantity: 1,
  total: 60,
  status: 'PENDING',
  created_at: '2026-09-17T00:00:00.000Z',
  expires_at: new Date(Date.now() + 60_000).toISOString()
};

const CASH_PAYMENT: CashPaymentResponse = {
  payment_id: 'payment-1',
  payment_method: 'CASH',
  amount_received: 100,
  paid_at: '2026-09-17T00:01:00.000Z',
  change: 40
};

const createOperation = (
  response$: Observable<CreateSaleResponse>,
  idempotencyKey = 'create-key'
): CreateSaleOperation => ({ response$, idempotencyKey });

const cashOperation = (
  response$: Observable<CashPaymentApiResponse>,
  idempotencyKey = 'payment-key'
): CashPaymentOperation => ({ response$, idempotencyKey });

const cancelOperation = (
  response$: Observable<CancelSaleResponse>,
  idempotencyKey = 'cancel-key'
): CancelSaleOperation => ({ response$, idempotencyKey });

describe('PosFacadeService', () => {
  let facade: PosFacadeService;
  let saleApi: jasmine.SpyObj<SaleApiService>;

  beforeEach(() => {
    saleApi = jasmine.createSpyObj<SaleApiService>('SaleApiService', [
      'createSale',
      'payCash',
      'payQr',
      'cancelSale'
    ]);

    TestBed.configureTestingModule({
      providers: [
        PosFacadeService,
        { provide: SaleApiService, useValue: saleApi }
      ]
    });
    facade = TestBed.inject(PosFacadeService);
  });

  it('maps a created sale and owns the active transaction state', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));

    facade.submitProductCode('  P001  ');

    expect(saleApi.createSale).toHaveBeenCalledOnceWith('P001');
    expect(facade.saleState.status).toBe('active');
    expect(facade.activeSale).toEqual({
      saleId: 'sale-1',
      productCode: 'P001',
      productName: 'Iced Americano',
      unitPrice: 60,
      quantity: 1,
      total: 60,
      status: 'PENDING',
      createdAt: '2026-09-17T00:00:00.000Z',
      expiresAt: SALE_RESPONSE.expires_at
    });
  });

  it('submits cash once, transitions to paid, then resets after five seconds', fakeAsync(() => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payCash.and.returnValue(cashOperation(of(CASH_PAYMENT)));
    facade.submitProductCode('P001');
    facade.selectPaymentMethod('CASH');
    facade.addCash(100);

    facade.confirmCashPayment();
    facade.confirmCashPayment();

    expect(saleApi.payCash).toHaveBeenCalledOnceWith('sale-1', 100);
    expect(facade.paymentState.status).toBe('paid');
    expect(facade.activeSale?.status).toBe('PAID');
    tick(4999);
    expect(facade.paymentState.status).toBe('paid');
    tick(1);
    expect(facade.saleState.status).toBe('ready');
    expect(facade.amountReceived).toBe(0);
    expect(facade.selectedPaymentMethod).toBeNull();
  }));

  it('cancels a pending sale through the API before allowing a reset', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValue(
      cancelOperation(of({ sale_id: 'sale-1', status: 'CANCELLED' }))
    );
    facade.submitProductCode('P001');

    facade.resetTransaction();

    expect(saleApi.cancelSale).toHaveBeenCalledOnceWith('sale-1');
    expect(facade.cancellationState.status).toBe('cancelled');
    expect(facade.activeSale?.status).toBe('CANCELLED');
    facade.resetTransaction();
    expect(facade.saleState.status).toBe('ready');
  });

  it('reuses create and payment idempotency keys after ambiguous failures', () => {
    const networkError = new HttpErrorResponse({ status: 0 });
    saleApi.createSale.and.returnValues(
      createOperation(throwError(() => networkError), 'create-retry-key'),
      createOperation(of(SALE_RESPONSE), 'create-retry-key')
    );

    facade.submitProductCode('P001');
    facade.submitProductCode('P001');

    expect(saleApi.createSale.calls.allArgs()).toEqual([
      ['P001'],
      ['P001', 'create-retry-key']
    ]);

    facade.selectPaymentMethod('CASH');
    facade.addCash(100);
    saleApi.payCash.and.returnValues(
      cashOperation(throwError(() => networkError), 'payment-retry-key'),
      cashOperation(of(CASH_PAYMENT), 'payment-retry-key')
    );
    facade.confirmCashPayment();
    facade.confirmCashPayment();

    expect(saleApi.payCash.calls.allArgs()).toEqual([
      ['sale-1', 100],
      ['sale-1', 100, 'payment-retry-key']
    ]);
  });

  it('reuses the cancellation key after an ambiguous failure', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValues(
      cancelOperation(
        throwError(() => new HttpErrorResponse({ status: 500 })),
        'cancel-retry-key'
      ),
      cancelOperation(of({ sale_id: 'sale-1', status: 'CANCELLED' }))
    );
    facade.submitProductCode('P001');

    facade.resetTransaction();
    facade.resetTransaction();

    expect(saleApi.cancelSale.calls.allArgs()).toEqual([
      ['sale-1'],
      ['sale-1', 'cancel-retry-key']
    ]);
    expect(facade.activeSale?.status).toBe('CANCELLED');
  });

  it('coordinates expiry through one backend cancellation timer', fakeAsync(() => {
    const expiringSale = {
      ...SALE_RESPONSE,
      expires_at: new Date(Date.now() + 1000).toISOString()
    };
    saleApi.createSale.and.returnValue(createOperation(of(expiringSale)));
    saleApi.cancelSale.and.returnValue(
      cancelOperation(of({ sale_id: 'sale-1', status: 'CANCELLED' }))
    );

    facade.submitProductCode('P001');
    tick(1000);

    expect(saleApi.cancelSale).toHaveBeenCalledOnceWith('sale-1');
    expect(facade.cancellationState.reason).toBe('expiry');
    expect(facade.paymentState.status).toBe('expired');
    tick(60_000);
    expect(saleApi.cancelSale).toHaveBeenCalledTimes(1);
  }));

  it('maps a definite create error without retaining a retry attempt', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: {
        error: { code: 'PRODUCT_NOT_FOUND', message: 'not found' }
      }
    });
    saleApi.createSale.and.returnValues(
      createOperation(throwError(() => error), 'failed-key'),
      createOperation(of(SALE_RESPONSE), 'new-key')
    );

    facade.submitProductCode('P999');
    expect(facade.saleState.status).toBe('error');
    expect(facade.saleState.error?.code).toBe('PRODUCT_NOT_FOUND');
    facade.submitProductCode('P001');

    expect(saleApi.createSale.calls.allArgs()).toEqual([['P999'], ['P001']]);
  });

  it('does not start a competing expiry cancellation during payment', fakeAsync(() => {
    const payment$ = new Subject<CashPaymentApiResponse>();
    const expiringSale = {
      ...SALE_RESPONSE,
      expires_at: new Date(Date.now() + 1000).toISOString()
    };
    saleApi.createSale.and.returnValue(createOperation(of(expiringSale)));
    saleApi.payCash.and.returnValue(cashOperation(payment$));
    facade.submitProductCode('P001');
    facade.selectPaymentMethod('CASH');
    facade.addCash(100);
    facade.confirmCashPayment();

    tick(1000);

    expect(saleApi.cancelSale).not.toHaveBeenCalled();
    payment$.next({ sale_id: 'sale-1', status: 'CANCELLED' });
    payment$.complete();
    expect(facade.paymentState.status).toBe('expired');
  }));
});

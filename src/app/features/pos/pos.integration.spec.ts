import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { API_BASE_URL } from '../../core/config/api-config.token';
import {
  CashPaymentResponse,
  QrPaymentResponse
} from '../../core/models/payment-api.models';
import { CreateSaleResponse } from '../../core/models/sale-api.models';
import { SaleApiService } from '../../core/services/sale-api.service';
import { PosComponent } from './pos.component';

const SALE_ID = '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176';

const saleResponse = (
  overrides: Partial<CreateSaleResponse> = {}
): CreateSaleResponse => ({
  sale_id: SALE_ID,
  product_code: 'P001',
  name: 'Backend Product',
  unit_price: 160,
  quantity: 1,
  total: 160,
  status: 'PENDING',
  created_at: '2026-09-17T00:00:00.000Z',
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  ...overrides
});

describe('PosComponent HTTP integration', () => {
  let component: PosComponent;
  let fixture: ComponentFixture<PosComponent>;
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosComponent],
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        SaleApiService,
        { provide: API_BASE_URL, useValue: '/api/v1' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PosComponent);
    component = fixture.componentInstance;
    httpController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpController.verify());

  it('runs create sale through repeated cash input, payment, Thank You, and clean reset', fakeAsync(() => {
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    const createRequest = httpController.expectOne('/api/v1/sales');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({ product_code: 'P001' });
    createRequest.flush(saleResponse(), {
      status: 201,
      statusText: 'Created'
    });

    expect(component.activeSale?.saleId).toBe(SALE_ID);
    expect(component.activeSale?.productName).toBe('Backend Product');
    expect(component.activeSale?.total).toBe(160);

    component.selectCashPayment();
    component.addCash(100);
    expect(component.canConfirmCashPayment).toBeFalse();
    component.addCash(100);
    expect(component.amountReceived).toBe(200);
    expect(component.changeDue).toBe(40);
    expect(component.canConfirmCashPayment).toBeTrue();

    component.confirmCashPayment();
    component.confirmCashPayment();

    const paymentRequest = httpController.expectOne(
      `/api/v1/sales/${SALE_ID}/payment`
    );
    expect(paymentRequest.request.method).toBe('POST');
    expect(paymentRequest.request.body).toEqual({
      payment_method: 'CASH',
      amount_received: 200
    });

    const payment: CashPaymentResponse = {
      payment_id: '68b2aa0d-1f12-4d06-981a-d5bdad5d8336',
      payment_method: 'CASH',
      amount_received: 200,
      paid_at: '2026-09-17T00:01:00.000Z',
      change: 40
    };
    paymentRequest.flush(payment, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(component.activeSale?.status).toBe('PAID');
    expect(component.isThankYouVisible).toBeTrue();
    expect(component.canConfirmCashPayment).toBeFalse();

    tick(4999);
    expect(component.isThankYouVisible).toBeTrue();
    tick(1);

    expect(component.saleState.status).toBe('ready');
    expect(component.activeSale).toBeNull();
    expect(component.amountReceived).toBe(0);
    expect(component.selectedPaymentMethod).toBeNull();
    expect(component.productCodeControl.enabled).toBeTrue();
  }));

  it('uses the shared payment endpoint for QR with amount_received equal to total', () => {
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    httpController.expectOne('/api/v1/sales').flush(saleResponse());

    component.selectQrPayment();
    component.confirmQrPayment();
    component.confirmQrPayment();

    const paymentRequest = httpController.expectOne(
      `/api/v1/sales/${SALE_ID}/payment`
    );
    expect(paymentRequest.request.method).toBe('POST');
    expect(paymentRequest.request.body).toEqual({
      payment_method: 'QR_PAYMENT',
      amount_received: 160
    });

    const payment: QrPaymentResponse = {
      payment_id: '4bb8eb24-ce83-4fe7-915f-c84bb74bb9aa',
      payment_method: 'QR_PAYMENT',
      amount_received: 160,
      paid_at: '2026-09-17T00:01:00.000Z'
    };
    paymentRequest.flush(payment, { status: 201, statusText: 'Created' });

    expect(component.activeSale?.status).toBe('PAID');
    expect(component.completedQrPayment).toEqual(payment);
    expect(component.isThankYouVisible).toBeTrue();
  });

  it('uses the backend cancel endpoint and only clears after confirmed cancellation', () => {
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    httpController.expectOne('/api/v1/sales').flush(saleResponse());

    component.resetTransaction();
    expect(component.cancellationState.status).toBe('submitting');
    expect(component.activeSale?.status).toBe('PENDING');

    const cancelRequest = httpController.expectOne(
      `/api/v1/sales/${SALE_ID}/cancel`
    );
    expect(cancelRequest.request.method).toBe('POST');
    expect(cancelRequest.request.body).toBeNull();
    cancelRequest.flush({ sale_id: SALE_ID, status: 'CANCELLED' });

    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.cancellationState.status).toBe('cancelled');
    component.resetTransaction();
    expect(component.saleState.status).toBe('ready');
  });

  it('cancels an expired sale through the backend without fabricating success', fakeAsync(() => {
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    httpController.expectOne('/api/v1/sales').flush(
      saleResponse({ expires_at: new Date(Date.now() + 1000).toISOString() })
    );

    tick(1000);

    const cancelRequest = httpController.expectOne(
      `/api/v1/sales/${SALE_ID}/cancel`
    );
    expect(component.cancellationState.status).toBe('submitting');
    expect(component.activeSale?.status).toBe('PENDING');
    cancelRequest.flush({ sale_id: SALE_ID, status: 'CANCELLED' });

    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.paymentState.status).toBe('expired');
    expect(component.completedCashPayment).toBeNull();
    expect(component.completedQrPayment).toBeNull();
  }));

  it('surfaces product-not-found and permits a safe new create attempt', () => {
    component.productCodeControl.setValue('P999');
    component.submitProductCode();

    httpController.expectOne('/api/v1/sales').flush(
      {
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      },
      { status: 404, statusText: 'Not Found' }
    );

    expect(component.saleState.status).toBe('error');
    expect(component.createSaleError?.code).toBe('PRODUCT_NOT_FOUND');
    expect(component.productCodeControl.enabled).toBeTrue();

    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    httpController.expectOne('/api/v1/sales').flush(saleResponse());

    expect(component.saleState.status).toBe('active');
    expect(component.activeSale?.saleId).toBe(SALE_ID);
  });
});

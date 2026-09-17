import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Observable, of, Subject, throwError } from 'rxjs';

import {
  CancelSaleResponse,
  CashPaymentApiResponse,
  CashPaymentResponse,
  CreateSaleResponse,
  QrPaymentApiResponse,
  QrPaymentResponse
} from '../../core/models/sale.models';
import {
  CancelSaleOperation,
  CashPaymentOperation,
  CreateSaleOperation,
  QrPaymentOperation,
  SaleApiService
} from '../../core/services/sale-api.service';
import { PosComponent } from './pos.component';

const SALE_RESPONSE: CreateSaleResponse = {
  sale_id: '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176',
  product_code: 'P001',
  name: 'Iced Americano',
  unit_price: 60,
  quantity: 1,
  total: 60,
  status: 'PENDING',
  created_at: '2026-09-17T00:00:00.000Z',
  expires_at: new Date(Date.now() + 60_000).toISOString()
};

const createOperation = (
  response$: Observable<CreateSaleResponse>,
  idempotencyKey: string = 'create-sale-key'
): CreateSaleOperation => ({ idempotencyKey, response$ });

const CASH_PAYMENT_RESPONSE: CashPaymentResponse = {
  payment_id: '68b2aa0d-1f12-4d06-981a-d5bdad5d8336',
  payment_method: 'CASH',
  amount_received: 100,
  paid_at: '2026-09-17T03:01:00.000Z',
  change: 40
};

const cashPaymentOperation = (
  response$: Observable<CashPaymentApiResponse>,
  idempotencyKey: string = 'cash-payment-key'
): CashPaymentOperation => ({ idempotencyKey, response$ });

const QR_PAYMENT_RESPONSE: QrPaymentResponse = {
  payment_id: '4bb8eb24-ce83-4fe7-915f-c84bb74bb9aa',
  payment_method: 'QR_PAYMENT',
  amount_received: 60,
  paid_at: '2026-09-17T03:01:00.000Z'
};

const qrPaymentOperation = (
  response$: Observable<QrPaymentApiResponse>,
  idempotencyKey: string = 'qr-payment-key'
): QrPaymentOperation => ({ idempotencyKey, response$ });

const cancelSaleOperation = (
  response$: Observable<CancelSaleResponse>,
  idempotencyKey: string = 'cancel-sale-key'
): CancelSaleOperation => ({ idempotencyKey, response$ });

describe('PosComponent', () => {
  let component: PosComponent;
  let fixture: ComponentFixture<PosComponent>;
  let saleApi: jasmine.SpyObj<SaleApiService>;

  beforeEach(async () => {
    saleApi = jasmine.createSpyObj<SaleApiService>('SaleApiService', [
      'createSale',
      'payCash',
      'payQr',
      'cancelSale'
    ]);

    await TestBed.configureTestingModule({
      declarations: [PosComponent],
      imports: [ReactiveFormsModule],
      providers: [{ provide: SaleApiService, useValue: saleApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(PosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the product, sale summary, and payment sections', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#product-entry-title')?.textContent).toContain(
      'Product code'
    );
    expect(element.querySelector('#sale-summary-title')?.textContent).toContain(
      'Sale summary'
    );
    expect(element.querySelector('#payment-title')?.textContent).toContain(
      'Payment method'
    );
  });

  it('submits a trimmed valid product code with Enter through the create-sale service', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    component.productCodeControl.setValue('  P001  ');
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('#product-code'))
      .triggerEventHandler(
        'keydown.enter',
        new KeyboardEvent('keydown', { key: 'Enter' })
      );
    fixture.detectChanges();

    expect(saleApi.createSale).toHaveBeenCalledOnceWith('P001');
    expect(component.saleState.status).toBe('active');
    expect(component.productCodeControl.disabled).toBeTrue();
  });

  it('maps the successful backend response into the active sale and displayed values', () => {
    const backendSale: CreateSaleResponse = {
      ...SALE_RESPONSE,
      name: 'Backend Product Name',
      unit_price: 375,
      total: 375
    };
    saleApi.createSale.and.returnValue(createOperation(of(backendSale)));
    component.productCodeControl.setValue('P001');

    component.submitProductCode();
    fixture.detectChanges();

    expect(component.activeSale).toEqual({
      saleId: backendSale.sale_id,
      productCode: backendSale.product_code,
      productName: backendSale.name,
      unitPrice: backendSale.unit_price,
      quantity: backendSale.quantity,
      total: backendSale.total,
      status: backendSale.status,
      createdAt: backendSale.created_at,
      expiresAt: backendSale.expires_at
    });

    const summary = (fixture.nativeElement as HTMLElement).querySelector(
      '.sale-details'
    )?.textContent;
    expect(summary).toContain('Backend Product Name');
    expect(summary).toContain('375');
    expect(component.activeSale?.saleId).toBe(backendSale.sale_id);
  });

  it('prevents duplicate submissions while the create request is active', () => {
    const pendingResponse = new Subject<CreateSaleResponse>();
    saleApi.createSale.and.returnValue(
      createOperation(pendingResponse.asObservable())
    );
    component.productCodeControl.setValue('P001');

    component.submitProductCode();
    expect(component.canReset).toBeFalse();
    component.submitProductCode();
    fixture.detectChanges();

    expect(saleApi.createSale).toHaveBeenCalledTimes(1);
    expect(component.isLoading).toBeTrue();
    expect(component.productCodeControl.disabled).toBeTrue();
    expect(component.canReset).toBeFalse();
  });

  it('does not submit an invalid product code', () => {
    component.productCodeControl.setValue('SKU-001');
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('#product-code'))
      .triggerEventHandler(
        'keydown.enter',
        new KeyboardEvent('keydown', { key: 'Enter' })
      );
    fixture.detectChanges();

    expect(saleApi.createSale).not.toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#product-code-error')
        ?.textContent
    ).toContain('P followed by 3 digits');
  });

  it('returns to a recoverable state and shows the backend error after a failure', () => {
    saleApi.createSale.and.returnValue(
      createOperation(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: {
                error: {
                  code: 'PRODUCT_NOT_FOUND',
                  message: 'ไม่พบสินค้า'
                }
              }
            })
        )
      )
    );
    component.productCodeControl.setValue('P999');

    component.submitProductCode();
    fixture.detectChanges();

    expect(component.saleState.status).toBe('error');
    expect(component.activeSale).toBeNull();
    expect(component.isLoading).toBeFalse();
    expect(component.productCodeControl.enabled).toBeTrue();
    expect(component.canSubmitProductCode).toBeTrue();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')
        ?.textContent
    ).toContain('ไม่พบสินค้า');
  });

  it('reuses the key when retrying an outcome-ambiguous transport failure', () => {
    saleApi.createSale.and.returnValues(
      createOperation(
        throwError(() => new HttpErrorResponse({ status: 0 })),
        'ambiguous-attempt-key'
      ),
      createOperation(of(SALE_RESPONSE), 'ambiguous-attempt-key')
    );
    component.productCodeControl.setValue('P001');

    component.submitProductCode();
    expect(component.canReset).toBeFalse();
    expect(component.productCodeControl.disabled).toBeTrue();
    component.submitProductCode();

    expect(saleApi.createSale.calls.allArgs()).toEqual([
      ['P001'],
      ['P001', 'ambiguous-attempt-key']
    ]);
    expect(component.saleState.status).toBe('active');
  });

  it('starts a new operation after a definite backend failure', () => {
    const notFoundError = new HttpErrorResponse({
      status: 404,
      error: {
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'ไม่พบสินค้า'
        }
      }
    });
    saleApi.createSale.and.returnValues(
      createOperation(throwError(() => notFoundError), 'failed-key'),
      createOperation(of(SALE_RESPONSE), 'new-key')
    );
    component.productCodeControl.setValue('P001');

    component.submitProductCode();
    component.submitProductCode();

    expect(saleApi.createSale.calls.allArgs()).toEqual([['P001'], ['P001']]);
    expect(component.saleState.status).toBe('active');
  });

  it('enables cash and QR when a pending sale is active', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    fixture.detectChanges();

    const paymentButtons = fixture.debugElement.queryAll(
      By.css('.payment__options button')
    );
    expect((paymentButtons[0].nativeElement as HTMLButtonElement).disabled)
      .toBeFalse();
    expect((paymentButtons[1].nativeElement as HTMLButtonElement).disabled)
      .toBeFalse();
  });

  it('honors a cancelled state returned by a create-sale replay', () => {
    saleApi.createSale.and.returnValue(
      createOperation(of({ ...SALE_RESPONSE, status: 'CANCELLED' }))
    );
    component.productCodeControl.setValue('P001');

    component.submitProductCode();
    fixture.detectChanges();

    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.canSelectPaymentMethod).toBeFalse();
    expect(component.saleStatusMessage).toContain('หมดอายุหรือถูกยกเลิก');
  });

  it('honors a paid state returned by a create-sale replay', () => {
    saleApi.createSale.and.returnValue(
      createOperation(of({ ...SALE_RESPONSE, status: 'PAID' }))
    );
    component.productCodeControl.setValue('P001');

    component.submitProductCode();

    expect(component.activeSale?.status).toBe('PAID');
    expect(component.canSelectPaymentMethod).toBeFalse();
    expect(component.saleStatusMessage).toContain('ชำระเงินแล้ว');
  });

  it('shows the QR payment UI only after QR is selected', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.qr-payment')
    ).toBeNull();

    fixture.debugElement
      .queryAll(By.css('.payment__options button'))[1]
      .triggerEventHandler('click');
    fixture.detectChanges();

    const qrPayment = (fixture.nativeElement as HTMLElement).querySelector(
      '.qr-payment'
    );
    expect(qrPayment?.textContent).toContain('QR payment');
    expect(qrPayment?.textContent).toContain('60');
  });

  it('submits the active sale ID and exact total once for QR payment', () => {
    const pendingPayment = new Subject<QrPaymentApiResponse>();
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payQr.and.returnValue(
      qrPaymentOperation(pendingPayment.asObservable())
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();

    component.confirmQrPayment();
    component.confirmQrPayment();
    fixture.detectChanges();

    expect(saleApi.payQr).toHaveBeenCalledOnceWith(
      SALE_RESPONSE.sale_id,
      SALE_RESPONSE.total
    );
    expect(component.isPaymentSubmitting).toBeTrue();
    expect(component.canConfirmQrPayment).toBeFalse();
    expect(component.canReset).toBeFalse();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.qr-payment__confirm'
      )?.textContent
    ).toContain('Processing');

    pendingPayment.next(QR_PAYMENT_RESPONSE);
    pendingPayment.complete();
    fixture.detectChanges();

    expect(component.paymentState.status).toBe('paid');
    expect(component.completedQrPayment).toEqual(QR_PAYMENT_RESPONSE);
    expect(component.activeSale?.status).toBe('PAID');
    expect(component.statusLabel).toBe('ชำระเงินสำเร็จ');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.payment-message--success'
      )?.textContent
    ).toContain(QR_PAYMENT_RESPONSE.payment_id);
  });

  it('shows a QR business validation error and allows a new safe attempt', () => {
    const backendError = new HttpErrorResponse({
      status: 400,
      error: {
        error: {
          code: 'QR_AMOUNT_MISMATCH',
          message: 'QR amount must equal the sale total'
        }
      }
    });
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payQr.and.returnValues(
      qrPaymentOperation(throwError(() => backendError), 'failed-qr-key'),
      qrPaymentOperation(of(QR_PAYMENT_RESPONSE), 'new-qr-key')
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();

    component.confirmQrPayment();
    fixture.detectChanges();

    expect(component.paymentState.status).toBe('error');
    expect(component.paymentError?.code).toBe('QR_AMOUNT_MISMATCH');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.payment-message--error'
      )?.textContent
    ).toContain('ยอดชำระ QR ไม่ตรงกับยอดรวม');

    component.confirmQrPayment();
    expect(saleApi.payQr.calls.allArgs()).toEqual([
      [SALE_RESPONSE.sale_id, SALE_RESPONSE.total],
      [SALE_RESPONSE.sale_id, SALE_RESPONSE.total]
    ]);
  });

  it('clears a method-specific payment error when switching payment methods', () => {
    const qrError = new HttpErrorResponse({
      status: 400,
      error: {
        error: {
          code: 'QR_AMOUNT_MISMATCH',
          message: 'ยอดชำระ QR ต้องเท่ากับยอดรวม'
        }
      }
    });
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payQr.and.returnValue(
      qrPaymentOperation(throwError(() => qrError))
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();
    component.confirmQrPayment();

    expect(component.paymentError?.code).toBe('QR_AMOUNT_MISMATCH');

    component.selectCashPayment();

    expect(component.selectedPaymentMethod).toBe('CASH');
    expect(component.paymentError).toBeNull();
  });

  it('uses a safe QR network error and reuses the ambiguous attempt key', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payQr.and.returnValues(
      qrPaymentOperation(
        throwError(() => new HttpErrorResponse({ status: 0 })),
        'ambiguous-qr-key'
      ),
      qrPaymentOperation(of(QR_PAYMENT_RESPONSE), 'ambiguous-qr-key')
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();

    component.confirmQrPayment();
    expect(component.paymentState.status).toBe('error');
    expect(component.paymentError?.code).toBe('PAYMENT_FAILED');
    component.selectCashPayment();
    expect(component.selectedPaymentMethod).toBe('QR_PAYMENT');
    component.confirmQrPayment();

    expect(saleApi.payQr.calls.allArgs()).toEqual([
      [SALE_RESPONSE.sale_id, SALE_RESPONSE.total],
      [
        SALE_RESPONSE.sale_id,
        SALE_RESPONSE.total,
        'ambiguous-qr-key'
      ]
    ]);
  });

  it('maps a QR server error and reuses its idempotency key on retry', () => {
    const serverError = new HttpErrorResponse({
      status: 503,
      error: {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to process the payment'
        }
      }
    });
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payQr.and.returnValues(
      qrPaymentOperation(throwError(() => serverError), 'server-qr-key'),
      qrPaymentOperation(of(QR_PAYMENT_RESPONSE), 'server-qr-key')
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();

    component.confirmQrPayment();
    expect(component.paymentError).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'ไม่สามารถดำเนินการชำระเงินได้ กรุณาลองอีกครั้ง'
    });
    component.confirmQrPayment();

    expect(saleApi.payQr.calls.allArgs()).toEqual([
      [SALE_RESPONSE.sale_id, SALE_RESPONSE.total],
      [SALE_RESPONSE.sale_id, SALE_RESPONSE.total, 'server-qr-key']
    ]);
  });

  it('handles an expired QR sale without fabricating payment success', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payQr.and.returnValue(
      qrPaymentOperation(
        of({ sale_id: SALE_RESPONSE.sale_id, status: 'CANCELLED' })
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();

    component.confirmQrPayment();
    fixture.detectChanges();

    expect(component.paymentState.status).toBe('expired');
    expect(component.completedQrPayment).toBeNull();
    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.statusLabel).toBe('รายการขายหมดอายุ');
  });

  it('accumulates repeatable cash denominations and displays change', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectCashPayment();
    fixture.detectChanges();

    const denominationButtons = fixture.debugElement.queryAll(
      By.css('.cash-payment__denominations button')
    );
    denominationButtons[0].triggerEventHandler('click');
    denominationButtons[1].triggerEventHandler('click');
    denominationButtons[2].triggerEventHandler('click');
    denominationButtons[0].triggerEventHandler('click');
    fixture.detectChanges();

    expect(component.amountReceived).toBe(1700);
    expect(component.changeDue).toBe(1640);
    expect(component.canConfirmCashPayment).toBeTrue();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.cash-payment__change'
      )?.textContent
    ).toContain('1,640');
  });

  it('keeps confirmation disabled until cash received covers the total', () => {
    const sale = { ...SALE_RESPONSE, total: 600, unit_price: 600 };
    saleApi.createSale.and.returnValue(createOperation(of(sale)));
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectCashPayment();
    component.addCash(500);
    fixture.detectChanges();

    const confirmButton = fixture.debugElement.query(
      By.css('.cash-payment__confirm')
    ).nativeElement as HTMLButtonElement;
    expect(component.canConfirmCashPayment).toBeFalse();
    expect(confirmButton.disabled).toBeTrue();
    expect(saleApi.payCash).not.toHaveBeenCalled();
  });

  it('submits cash once, preserves the payment identifiers, and marks the sale paid', () => {
    const pendingPayment = new Subject<CashPaymentApiResponse>();
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payCash.and.returnValue(
      cashPaymentOperation(pendingPayment.asObservable())
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectCashPayment();
    component.addCash(100);

    component.confirmCashPayment();
    component.confirmCashPayment();

    expect(saleApi.payCash).toHaveBeenCalledOnceWith(
      SALE_RESPONSE.sale_id,
      100
    );
    expect(component.isPaymentSubmitting).toBeTrue();
    expect(component.canReset).toBeFalse();
    expect(component.canAddCash).toBeFalse();

    pendingPayment.next(CASH_PAYMENT_RESPONSE);
    pendingPayment.complete();
    fixture.detectChanges();

    expect(component.paymentState.status).toBe('paid');
    expect(component.completedCashPayment?.payment_id).toBe(
      CASH_PAYMENT_RESPONSE.payment_id
    );
    expect(component.activeSale?.status).toBe('PAID');
    expect(component.statusLabel).toBe('ชำระเงินสำเร็จ');
    expect(component.canConfirmCashPayment).toBeFalse();
  });

  it('treats the backend already-paid error as a terminal sale state', () => {
    const backendError = new HttpErrorResponse({
      status: 409,
      error: {
        error: {
          code: 'SALE_ALREADY_PAID',
          message: 'รายการขายนี้ชำระเงินแล้ว'
        }
      }
    });
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payCash.and.returnValues(
      cashPaymentOperation(throwError(() => backendError), 'definite-key'),
      cashPaymentOperation(of(CASH_PAYMENT_RESPONSE), 'new-key')
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectCashPayment();
    component.addCash(100);

    component.confirmCashPayment();
    fixture.detectChanges();

    expect(component.paymentState.status).toBe('error');
    expect(component.paymentError?.code).toBe('SALE_ALREADY_PAID');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.payment-message--error'
      )?.textContent
    ).toContain('รายการขายนี้ชำระเงินแล้ว');

    component.confirmCashPayment();
    expect(saleApi.payCash.calls.allArgs()).toEqual([
      [SALE_RESPONSE.sale_id, 100]
    ]);
    expect(component.activeSale?.status).toBe('PAID');
    expect(component.canConfirmCashPayment).toBeFalse();
  });

  it('uses a safe message for network failures and reuses the key on retry', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payCash.and.returnValues(
      cashPaymentOperation(
        throwError(() => new HttpErrorResponse({ status: 0 })),
        'ambiguous-payment-key'
      ),
      cashPaymentOperation(of(CASH_PAYMENT_RESPONSE), 'ambiguous-payment-key')
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectCashPayment();
    component.addCash(100);

    component.confirmCashPayment();
    expect(component.paymentError?.code).toBe('PAYMENT_FAILED');
    expect(component.canAddCash).toBeFalse();
    component.addCash(100);
    expect(component.amountReceived).toBe(100);
    component.confirmCashPayment();

    expect(saleApi.payCash.calls.allArgs()).toEqual([
      [SALE_RESPONSE.sale_id, 100],
      [SALE_RESPONSE.sale_id, 100, 'ambiguous-payment-key']
    ]);
  });

  it('handles the backend expired-sale response without creating a payment', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payCash.and.returnValue(
      cashPaymentOperation(
        of({ sale_id: SALE_RESPONSE.sale_id, status: 'CANCELLED' })
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectCashPayment();
    component.addCash(100);

    component.confirmCashPayment();
    fixture.detectChanges();

    expect(component.paymentState.status).toBe('expired');
    expect(component.completedCashPayment).toBeNull();
    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.canAddCash).toBeFalse();
    expect(component.statusLabel).toBe('รายการขายหมดอายุ');
  });

  it('cancels an active sale through the backend before resetting it', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValue(
      cancelSaleOperation(
        of({ sale_id: SALE_RESPONSE.sale_id, status: 'CANCELLED' })
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    component.resetTransaction();
    fixture.detectChanges();

    expect(saleApi.cancelSale).toHaveBeenCalledOnceWith(SALE_RESPONSE.sale_id);
    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.saleStatusMessage).toContain('ยกเลิก');

    component.resetTransaction();
    fixture.detectChanges();

    expect(component.saleState.status).toBe('ready');
    expect(component.activeSale).toBeNull();
    expect(component.productCodeControl.enabled).toBeTrue();
    expect(component.productCodeControl.value).toBe('');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent
    ).toContain('พร้อมสร้างรายการขายใหม่');
  });

  it('prevents duplicate cancellation while the request is in progress', () => {
    const pendingCancellation = new Subject<CancelSaleResponse>();
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValue(
      cancelSaleOperation(pendingCancellation.asObservable())
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    component.resetTransaction();
    component.resetTransaction();

    expect(saleApi.cancelSale).toHaveBeenCalledOnceWith(SALE_RESPONSE.sale_id);
    expect(component.isCancellationSubmitting).toBeTrue();
    expect(component.canReset).toBeFalse();
    expect(component.canSelectPaymentMethod).toBeFalse();

    pendingCancellation.next({
      sale_id: SALE_RESPONSE.sale_id,
      status: 'CANCELLED'
    });
    pendingCancellation.complete();

    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.cancellationState.status).toBe('cancelled');
  });

  it('reuses the cancellation key after an outcome-ambiguous server failure', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValues(
      cancelSaleOperation(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              error: {
                error: {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'เกิดข้อผิดพลาดภายในระบบ'
                }
              }
            })
        ),
        'ambiguous-cancel-key'
      ),
      cancelSaleOperation(
        of({ sale_id: SALE_RESPONSE.sale_id, status: 'CANCELLED' }),
        'ambiguous-cancel-key'
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    component.resetTransaction();
    expect(component.cancellationState.status).toBe('error');
    expect(component.activeSale?.status).toBe('PENDING');
    expect(component.canSelectPaymentMethod).toBeFalse();

    component.resetTransaction();

    expect(saleApi.cancelSale.calls.allArgs()).toEqual([
      [SALE_RESPONSE.sale_id],
      [SALE_RESPONSE.sale_id, 'ambiguous-cancel-key']
    ]);
    expect(component.activeSale?.status).toBe('CANCELLED');
  });

  it('handles cancel 404 as unavailable and allows a safe local reset', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValue(
      cancelSaleOperation(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: {
                error: {
                  code: 'SALE_NOT_FOUND',
                  message: 'ไม่พบรายการขาย'
                }
              }
            })
        )
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    component.resetTransaction();

    expect(component.cancellationError?.code).toBe('SALE_NOT_FOUND');
    expect(component.saleStatusMessage).toContain('ไม่พบรายการขาย');
    expect(component.canSelectPaymentMethod).toBeFalse();
    expect(component.transactionActionLabel).toBe('เริ่มรายการใหม่');

    component.resetTransaction();
    expect(component.saleState.status).toBe('ready');
    expect(saleApi.cancelSale).toHaveBeenCalledTimes(1);
  });

  it('synchronizes a cancel 409 paid response without faking cancellation', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValue(
      cancelSaleOperation(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                error: {
                  code: 'SALE_ALREADY_PAID',
                  message: 'รายการขายนี้ชำระเงินแล้ว'
                }
              }
            })
        )
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    component.resetTransaction();

    expect(component.activeSale?.status).toBe('PAID');
    expect(component.cancellationState.status).toBe('error');
    expect(component.saleStatusMessage).toContain('ชำระเงินแล้ว');
    expect(component.canSelectPaymentMethod).toBeFalse();
  });

  it('shows a safe Thai message for a cancel 400 and retries with a new key', () => {
    const validationError = new HttpErrorResponse({
      status: 400,
      error: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ข้อมูลคำขอไม่ถูกต้อง'
        }
      }
    });
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.cancelSale.and.returnValues(
      cancelSaleOperation(throwError(() => validationError), 'failed-key'),
      cancelSaleOperation(
        of({ sale_id: SALE_RESPONSE.sale_id, status: 'CANCELLED' }),
        'new-key'
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    component.resetTransaction();

    expect(component.cancellationError?.message).toContain(
      'ไม่สามารถส่งคำขอยกเลิก'
    );

    component.resetTransaction();

    expect(saleApi.cancelSale.calls.allArgs()).toEqual([
      [SALE_RESPONSE.sale_id],
      [SALE_RESPONSE.sale_id]
    ]);
    expect(component.activeSale?.status).toBe('CANCELLED');
  });

  it('uses the backend cancel flow when the active sale reaches expiry', fakeAsync(() => {
    const expiringSale: CreateSaleResponse = {
      ...SALE_RESPONSE,
      expires_at: new Date(Date.now() + 1000).toISOString()
    };
    saleApi.createSale.and.returnValue(createOperation(of(expiringSale)));
    saleApi.cancelSale.and.returnValue(
      cancelSaleOperation(
        of({ sale_id: expiringSale.sale_id, status: 'CANCELLED' })
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    tick(1000);

    expect(saleApi.cancelSale).toHaveBeenCalledOnceWith(expiringSale.sale_id);
    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.paymentState.status).toBe('expired');
    expect(component.cancellationState.reason).toBe('expiry');
  }));

  it('lets an in-flight payment resolve expiry without starting a competing cancellation', fakeAsync(() => {
    const expiringSale: CreateSaleResponse = {
      ...SALE_RESPONSE,
      expires_at: new Date(Date.now() + 1000).toISOString()
    };
    const pendingPayment = new Subject<QrPaymentApiResponse>();
    saleApi.createSale.and.returnValue(createOperation(of(expiringSale)));
    saleApi.payQr.and.returnValue(
      qrPaymentOperation(pendingPayment.asObservable())
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();
    component.confirmQrPayment();

    tick(1000);

    expect(saleApi.cancelSale).not.toHaveBeenCalled();
    expect(component.isPaymentSubmitting).toBeTrue();

    pendingPayment.next({
      sale_id: expiringSale.sale_id,
      status: 'CANCELLED'
    });
    pendingPayment.complete();

    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.paymentState.status).toBe('expired');
  }));

  it('does not let an expiry timer duplicate or outlive a user cancellation', fakeAsync(() => {
    const expiringSale: CreateSaleResponse = {
      ...SALE_RESPONSE,
      expires_at: new Date(Date.now() + 1000).toISOString()
    };
    const pendingCancellation = new Subject<CancelSaleResponse>();
    saleApi.createSale.and.returnValue(createOperation(of(expiringSale)));
    saleApi.cancelSale.and.returnValue(
      cancelSaleOperation(pendingCancellation.asObservable())
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.resetTransaction();

    tick(1000);

    expect(saleApi.cancelSale).toHaveBeenCalledTimes(1);

    pendingCancellation.next({
      sale_id: expiringSale.sale_id,
      status: 'CANCELLED'
    });
    pendingCancellation.complete();
    component.resetTransaction();
    tick(1000);

    expect(component.saleState.status).toBe('ready');
    expect(saleApi.cancelSale).toHaveBeenCalledTimes(1);
  }));

  it('blocks further actions when payment reports a cancelled sale', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    saleApi.payQr.and.returnValue(
      qrPaymentOperation(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                error: {
                  code: 'SALE_CANCELLED',
                  message: 'รายการขายนี้ถูกยกเลิกแล้ว'
                }
              }
            })
        )
      )
    );
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    component.selectQrPayment();

    component.confirmQrPayment();

    expect(component.activeSale?.status).toBe('CANCELLED');
    expect(component.canConfirmQrPayment).toBeFalse();
    expect(component.paymentError?.message).toContain('ถูกยกเลิก');
  });

  it('shows status text that matches active and recoverable error states', () => {
    saleApi.createSale.and.returnValues(
      createOperation(of(SALE_RESPONSE)),
      createOperation(
        throwError(() => new HttpErrorResponse({ status: 0 }))
      )
    );
    saleApi.cancelSale.and.returnValue(
      cancelSaleOperation(
        of({ sale_id: SALE_RESPONSE.sale_id, status: 'CANCELLED' })
      )
    );
    component.productCodeControl.setValue('P001');

    component.submitProductCode();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent
    ).toContain('พร้อมรับชำระเงิน');

    component.resetTransaction();
    component.resetTransaction();
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent
    ).toContain('พร้อมลองอีกครั้ง');
  });
});

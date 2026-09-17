import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Observable, of, Subject, throwError } from 'rxjs';

import { CreateSaleResponse } from '../../core/models/sale.models';
import {
  CreateSaleOperation,
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
  expires_at: '2026-09-17T00:05:00.000Z'
};

const createOperation = (
  response$: Observable<CreateSaleResponse>,
  idempotencyKey: string = 'create-sale-key'
): CreateSaleOperation => ({ idempotencyKey, response$ });

describe('PosComponent', () => {
  let component: PosComponent;
  let fixture: ComponentFixture<PosComponent>;
  let saleApi: jasmine.SpyObj<SaleApiService>;

  beforeEach(async () => {
    saleApi = jasmine.createSpyObj<SaleApiService>('SaleApiService', [
      'createSale'
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

  it('keeps payment methods disabled until later payment tasks implement them', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    fixture.detectChanges();

    const paymentButtons = fixture.debugElement.queryAll(
      By.css('.payment__options button')
    );
    expect(
      paymentButtons.every(
        (button) => (button.nativeElement as HTMLButtonElement).disabled
      )
    ).toBeTrue();
  });

  it('resets a completed sale for a new transaction', () => {
    saleApi.createSale.and.returnValue(createOperation(of(SALE_RESPONSE)));
    component.productCodeControl.setValue('P001');
    component.submitProductCode();

    component.resetTransaction();
    fixture.detectChanges();

    expect(component.saleState.status).toBe('ready');
    expect(component.activeSale).toBeNull();
    expect(component.productCodeControl.enabled).toBeTrue();
    expect(component.productCodeControl.value).toBe('');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent
    ).toContain('Ready for a new sale');
  });

  it('shows status text that matches active and recoverable error states', () => {
    saleApi.createSale.and.returnValues(
      createOperation(of(SALE_RESPONSE)),
      createOperation(
        throwError(() => new HttpErrorResponse({ status: 0 }))
      )
    );
    component.productCodeControl.setValue('P001');

    component.submitProductCode();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent
    ).toContain('Sale ready for payment');

    component.resetTransaction();
    component.productCodeControl.setValue('P001');
    component.submitProductCode();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent
    ).toContain('Ready to retry');
  });
});

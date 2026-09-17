import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { PosComponent } from './pos.component';

describe('PosComponent', () => {
  let component: PosComponent;
  let fixture: ComponentFixture<PosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosComponent],
      imports: [ReactiveFormsModule]
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

  it('submits a trimmed product code with Enter and enters loading state', () => {
    const submittedCodes: string[] = [];
    component.productCodeSubmitted.subscribe((code) => submittedCodes.push(code));
    component.productCodeControl.setValue('  SKU-001  ');
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('#product-code'));
    input.triggerEventHandler(
      'keydown.enter',
      new KeyboardEvent('keydown', { key: 'Enter' })
    );
    fixture.detectChanges();

    expect(submittedCodes).toEqual(['SKU-001']);
    expect(component.isLoading).toBeTrue();
    expect(component.productCodeControl.disabled).toBeTrue();
    expect(component.submittedProductCode).toBe('SKU-001');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')
        ?.textContent
    ).toContain('Loading product details');
  });

  it('prevents duplicate submissions while loading', () => {
    const emitSpy = spyOn(component.productCodeSubmitted, 'emit');
    component.productCodeControl.setValue('SKU-001');

    component.submitProductCode();
    component.submitProductCode();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('does not submit an empty or whitespace-only product code', () => {
    const emitSpy = spyOn(component.productCodeSubmitted, 'emit');
    component.productCodeControl.setValue('   ');
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('#product-code'))
      .triggerEventHandler(
        'keydown.enter',
        new KeyboardEvent('keydown', { key: 'Enter' })
      );
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#product-code-error')
        ?.textContent
    ).toContain('Enter a product code');
  });

  it('keeps payment methods disabled until a sale is available', () => {
    const paymentButtons = fixture.debugElement.queryAll(
      By.css('.payment__options button')
    );

    expect(paymentButtons.length).toBe(2);
    expect(
      paymentButtons.every(
        (button) => (button.nativeElement as HTMLButtonElement).disabled
      )
    ).toBeTrue();
  });

  it('resets the UI for a new transaction', () => {
    const resetSpy = spyOn(component.transactionReset, 'emit');
    component.productCodeControl.setValue('SKU-001');
    component.submitProductCode();

    component.resetTransaction();
    fixture.detectChanges();

    expect(component.isLoading).toBeFalse();
    expect(component.submittedProductCode).toBeNull();
    expect(component.productCodeControl.enabled).toBeTrue();
    expect(component.productCodeControl.value).toBe('');
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.status')?.textContent
    ).toContain('Ready for a new sale');
  });
});

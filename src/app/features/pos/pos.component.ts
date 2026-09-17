import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil, timer } from 'rxjs';

import {
  CashPaymentResponse,
  PaymentMethod,
  QrPaymentResponse
} from '../../core/models/payment-api.models';
import {
  ActiveSaleViewModel,
  CancellationState,
  CancelSaleErrorViewModel,
  CreateSaleErrorViewModel,
  PaymentErrorViewModel,
  PaymentState,
  PosSaleState
} from './models/pos.models';
import {
  PosFacadeEvent,
  PosFacadeService
} from './services/pos-facade.service';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PosFacadeService]
})
export class PosComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('productCodeInput')
  private productCodeInput?: ElementRef<HTMLInputElement>;

  @ViewChild('thankYouDialog')
  private thankYouDialog?: ElementRef<HTMLElement>;

  readonly productCodeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\s*P\d{3}\s*$/)]
  });
  private readonly destroyed$ = new Subject<void>();
  private shouldFocusThankYouDialog = false;

  constructor(
    private readonly facade: PosFacadeService,
    private readonly changeDetector: ChangeDetectorRef
  ) {
    this.facade.events$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((event) => this.handleFacadeEvent(event));
  }

  get saleState(): PosSaleState {
    return this.facade.saleState;
  }

  get paymentState(): PaymentState {
    return this.facade.paymentState;
  }

  get cancellationState(): CancellationState {
    return this.facade.cancellationState;
  }

  get amountReceived(): number {
    return this.facade.amountReceived;
  }

  get selectedPaymentMethod(): PaymentMethod | null {
    return this.facade.selectedPaymentMethod;
  }

  get isLoading(): boolean {
    return this.facade.isLoading;
  }

  get isPaymentSubmitting(): boolean {
    return this.facade.isPaymentSubmitting;
  }

  get isCancellationSubmitting(): boolean {
    return this.facade.isCancellationSubmitting;
  }

  get activeSale(): ActiveSaleViewModel | null {
    return this.facade.activeSale;
  }

  get submittedProductCode(): string | null {
    return this.saleState.submittedProductCode;
  }

  get createSaleError(): CreateSaleErrorViewModel | null {
    return this.saleState.error;
  }

  get canSubmitProductCode(): boolean {
    return this.facade.canSubmitProductCode(
      this.productCodeControl.value,
      this.productCodeControl.valid
    );
  }

  get canReset(): boolean {
    return this.facade.canReset(this.productCodeControl.value.length > 0);
  }

  get canSelectPaymentMethod(): boolean {
    return this.facade.canSelectPaymentMethod;
  }

  get canAddCash(): boolean {
    return this.facade.canAddCash;
  }

  get changeDue(): number {
    return Math.max(0, this.amountReceived - (this.activeSale?.total ?? 0));
  }

  get canConfirmCashPayment(): boolean {
    return this.facade.canConfirmCashPayment;
  }

  get canConfirmQrPayment(): boolean {
    return this.facade.canConfirmQrPayment;
  }

  get paymentError(): PaymentErrorViewModel | null {
    return this.paymentState.error;
  }

  get isThankYouVisible(): boolean {
    return this.paymentState.status === 'paid';
  }

  get cancellationError(): CancelSaleErrorViewModel | null {
    return this.cancellationState.error;
  }

  get transactionActionLabel(): string {
    if (this.isCancellationSubmitting) {
      return 'กำลังยกเลิกรายการขาย…';
    }

    if (this.facade.saleUnavailable) {
      return 'เริ่มรายการใหม่';
    }

    if (this.activeSale?.status === 'PENDING') {
      return this.cancellationState.status === 'error'
        ? 'ลองยกเลิกรายการขายอีกครั้ง'
        : 'ยกเลิกรายการขาย';
    }

    return this.saleState.status === 'ready'
      ? 'ล้างข้อมูล'
      : 'เริ่มรายการใหม่';
  }

  get saleStatusMessage(): string | null {
    if (this.facade.saleUnavailable) {
      return 'ไม่พบรายการขายนี้ในระบบ กรุณาเริ่มรายการใหม่';
    }

    if (this.activeSale?.status === 'PAID') {
      return 'รายการขายนี้ชำระเงินแล้ว ไม่สามารถทำรายการซ้ำได้';
    }

    if (this.activeSale?.status === 'CANCELLED') {
      return this.cancellationState.reason === 'user'
        ? 'ยกเลิกรายการขายเรียบร้อยแล้ว'
        : 'รายการขายหมดอายุหรือถูกยกเลิกแล้ว กรุณาเริ่มรายการใหม่';
    }

    return null;
  }

  get completedCashPayment(): CashPaymentResponse | null {
    const payment = this.paymentState.payment;
    return payment?.payment_method === 'CASH' ? payment : null;
  }

  get completedQrPayment(): QrPaymentResponse | null {
    const payment = this.paymentState.payment;
    return payment?.payment_method === 'QR_PAYMENT' ? payment : null;
  }

  get statusLabel(): string {
    switch (this.saleState.status) {
      case 'loading':
        return 'Loading product';
      case 'active':
        if (this.isCancellationSubmitting) {
          return 'กำลังยกเลิกรายการขาย';
        }
        if (this.saleState.activeSale.status === 'CANCELLED') {
          return this.cancellationState.reason === 'user'
            ? 'ยกเลิกรายการขายแล้ว'
            : 'รายการขายหมดอายุ';
        }
        if (this.isPaymentSubmitting) {
          return 'กำลังดำเนินการชำระเงิน';
        }
        if (this.paymentState.status === 'paid') {
          return 'ชำระเงินสำเร็จ';
        }
        if (this.saleState.activeSale.status === 'PAID') {
          return 'ชำระเงินแล้ว';
        }
        if (this.paymentState.status === 'expired') {
          return 'รายการขายหมดอายุ';
        }
        return 'พร้อมรับชำระเงิน';
      case 'error':
        return 'พร้อมลองอีกครั้ง';
      default:
        return 'พร้อมสร้างรายการขายใหม่';
    }
  }

  submitProductCode(): void {
    this.productCodeControl.markAsTouched();
    if (this.canSubmitProductCode) {
      this.facade.submitProductCode(this.productCodeControl.value);
    }
  }

  selectCashPayment(): void {
    this.facade.selectPaymentMethod('CASH');
  }

  selectQrPayment(): void {
    this.facade.selectPaymentMethod('QR_PAYMENT');
  }

  addCash(amount: 100 | 500 | 1000): void {
    this.facade.addCash(amount);
  }

  confirmCashPayment(): void {
    this.facade.confirmCashPayment();
  }

  confirmQrPayment(): void {
    this.facade.confirmQrPayment();
  }

  resetTransaction(): void {
    if (this.canReset) {
      this.facade.resetTransaction();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocusThankYouDialog && this.isThankYouVisible) {
      this.shouldFocusThankYouDialog = false;
      this.thankYouDialog?.nativeElement.focus();
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private handleFacadeEvent(event: PosFacadeEvent): void {
    if (event === 'create-started' || event === 'create-succeeded') {
      this.productCodeControl.disable({ emitEvent: false });
    } else if (event === 'create-definite-error') {
      this.productCodeControl.enable({ emitEvent: false });
      this.focusProductCodeEntry();
    } else if (event === 'payment-succeeded') {
      this.shouldFocusThankYouDialog = true;
    } else if (event === 'transaction-cleared') {
      this.shouldFocusThankYouDialog = false;
      this.productCodeControl.reset('', { emitEvent: false });
      this.productCodeControl.enable({ emitEvent: false });
      this.focusProductCodeEntry();
    }

    this.changeDetector.markForCheck();
  }

  private focusProductCodeEntry(): void {
    timer(0)
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        if (
          this.productCodeControl.enabled &&
          this.saleState.status !== 'active'
        ) {
          this.productCodeInput?.nativeElement.focus();
        }
      });
  }
}

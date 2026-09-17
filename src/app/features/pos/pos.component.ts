import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

type PosUiState = 'ready' | 'loading';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosComponent {
  @Output() readonly productCodeSubmitted = new EventEmitter<string>();
  @Output() readonly transactionReset = new EventEmitter<void>();

  readonly productCodeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/\S/)]
  });

  submittedProductCode: string | null = null;
  private uiState: PosUiState = 'ready';

  get isLoading(): boolean {
    return this.uiState === 'loading';
  }

  get canSubmitProductCode(): boolean {
    return !this.isLoading && this.productCodeControl.valid;
  }

  get canReset(): boolean {
    return this.isLoading || this.productCodeControl.value.length > 0;
  }

  submitProductCode(): void {
    this.productCodeControl.markAsTouched();

    if (!this.canSubmitProductCode) {
      return;
    }

    const productCode = this.productCodeControl.value.trim();
    this.submittedProductCode = productCode;
    this.uiState = 'loading';
    this.productCodeControl.disable({ emitEvent: false });
    this.productCodeSubmitted.emit(productCode);
  }

  resetTransaction(): void {
    this.uiState = 'ready';
    this.submittedProductCode = null;
    this.productCodeControl.reset('', { emitEvent: false });
    this.productCodeControl.enable({ emitEvent: false });
    this.transactionReset.emit();
  }
}

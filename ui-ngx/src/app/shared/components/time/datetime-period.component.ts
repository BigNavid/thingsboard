import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldAppearance, SubscriptSizing } from '@angular/material/form-field';

type CalendarType = 'gregorian' | 'jalali';

export interface FixedWindow {
  startTimeMs: number;
  endTimeMs: number;
}

interface DateRangeValue {
  start: Date | string;
  end: Date | string;
}

@Component({
  selector: 'tb-datetime-period',
  templateUrl: './datetime-period.component.html',
  styleUrls: ['./datetime-period.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatetimePeriodComponent),
    multi: true
  }]
})
export class DatetimePeriodComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Input() subscriptSizing: SubscriptSizing = 'fixed';
  @Input() appearance: MatFormFieldAppearance = 'fill';

  calendarType: CalendarType = 'gregorian';
  today = new Date();

  private propagateChange: (v: FixedWindow | null) => void;
  private pending = false;
  private model: FixedWindow | null = null;

  form = this.fb.group({
    // Qeydar برای بازه + زمان، یک کنترل کافی است (valueFormat='date')
    dateRange: this.fb.control<DateRangeValue | null>(null)
  });

  constructor(private fb: FormBuilder) {
    this.form.valueChanges.subscribe(() => this.emitFromForm());
  }

  // --- CVA ---
  writeValue(v: FixedWindow | null): void {
    this.model = v;
    if (v) {
      this.form.patchValue({
        dateRange: { start: new Date(v.startTimeMs), end: new Date(v.endTimeMs) }
      }, { emitEvent: false });
    } else {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      this.form.patchValue({ dateRange: { start, end: now } }, { emitEvent: false });
      this.emitFromForm();
    }
  }
  registerOnChange(fn: any): void {
    this.propagateChange = fn;
    if (this.pending) { this.pending = false; this.propagateChange(this.model); }
  }
  registerOnTouched(_: any): void {}
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
  }

  onCalendarTypeChange(type: CalendarType) { this.calendarType = type; }

  private emitFromForm() {
    const range = this.form.value.dateRange;
    if (!range) { this.emit(null); return; }
    const start = this.asDate(range.start);
    const end = this.asDate(range.end);
    if (!start || !end) { this.emit(null); return; }

    // محدودیت‌های ساده: پایان <= الآن و حداقل 1 دقیقه فاصله
    const now = Date.now();
    const endTs = Math.min(end.getTime(), now);
    const startTs = Math.min(start.getTime(), endTs - 60_000);

    this.emit({ startTimeMs: startTs, endTimeMs: endTs });
  }

  private emit(v: FixedWindow | null) {
    this.model = v;
    if (!this.propagateChange) this.pending = true;
    else this.propagateChange(v);
  }

  private asDate(v: Date | string | null | undefined): Date | null {
    if (!v) return null;
    return v instanceof Date ? v : new Date(v);
  }
}
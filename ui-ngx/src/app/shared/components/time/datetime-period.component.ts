import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldAppearance, SubscriptSizing } from '@angular/material/form-field';
import { Jalali } from 'jalali-ts';

type CalendarType = 'gregorian' | 'jalali';

export interface FixedWindow {
  startTimeMs: number;
  endTimeMs: number;
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
  @Input() subscriptSizing: 'fixed' | 'dynamic' = 'fixed';
  @Input() appearance: 'legacy' | 'standard' | 'fill' | 'outline' = 'fill';

  // سوییچ تقویم
  calendarType: CalendarType = 'jalali';

  // فرم: نمایش رشته‌ای داخل input ها
  dateTimePeriodFormGroup = this.fb.group({
    startDate: this.fb.control<string | null>(null),
    endDate:   this.fb.control<string | null>(null)
  });

  // مدل واقعی بر حسب timestamp (ms)
  private startTs = Date.now() - 24 * 60 * 60 * 1000;
  private endTs   = Date.now();

  // محدودیت‌ها برای پیکرها (ts)
  maxEndTs   = Date.now();
  maxStartTs = this.endTs - 60_000;
  minEndTs: number | null = this.startTs + 60_000;

  private propagateChange: (v: FixedWindow | null) => void;

  constructor(private fb: FormBuilder) {}

  /* ====== ControlValueAccessor ====== */
  writeValue(v: FixedWindow | null): void {
    if (v) {
      this.startTs = v.startTimeMs;
      this.endTs   = v.endTimeMs;
    } else {
      this.startTs = Date.now() - 24 * 60 * 60 * 1000;
      this.endTs   = Date.now();
    }
    this.recomputeBounds();
    this.prefillDisplayControlsFromTs(); // نمایش اولیه مثل TB
  }

  registerOnChange(fn: any): void { this.propagateChange = fn; }
  registerOnTouched(_: any): void {}
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    disabled ? this.dateTimePeriodFormGroup.disable({ emitEvent: false })
             : this.dateTimePeriodFormGroup.enable({ emitEvent: false });
  }
  /* ================================== */

  onCalendarTypeChange(t: CalendarType) {
    this.calendarType = t;
    // برای اعمال قطعی سوییچ، در HTML با *ngIf پیکر را recreate کردیم
    // و اینجا فقط مقدار نمایشی input ها را ریفرمت می‌کنیم.
    this.prefillDisplayControlsFromTs();
  }

  // رویداد انتخاب «از» — $event: IActiveDate (timestamp/gregorian/jalali)
  onStartSelect(e: any) {
    const ts = e?.timestamp as number | undefined;
    if (!ts) return;
    this.startTs = Math.min(ts, this.endTs - 60_000); // حداقل فاصله 1 دقیقه
    this.recomputeBounds();
    this.emitFixedWindow();
    // ورودی نمایشی را به عهدهٔ خود پیکر می‌گذاریم (لازم نیست اینجا set کنیم)
  }

  // رویداد انتخاب «تا»
  onEndSelect(e: any) {
    let ts = e?.timestamp as number | undefined;
    if (!ts) return;
    const now = Date.now();
    if (ts > now) ts = now;                  // «تا» جلوتر از اکنون نباشد
    this.endTs = Math.max(ts, this.startTs + 60_000);
    this.recomputeBounds();
    this.emitFixedWindow();
  }

  private recomputeBounds() {
    const now = Date.now();
    this.maxEndTs   = now;
    this.maxStartTs = this.endTs - 60_000;
    this.minEndTs   = this.startTs + 60_000;
  }

  private emitFixedWindow() {
    this.propagateChange?.({ startTimeMs: this.startTs, endTimeMs: this.endTs });
  }

  // نمایش اولیه/بازفرمتِ مقدار داخل inputها مطابق سوییچ
  private prefillDisplayControlsFromTs() {
    const startText = this.formatDisplay(this.startTs, this.calendarType);
    const endText   = this.formatDisplay(this.endTs,   this.calendarType);
    this.dateTimePeriodFormGroup.patchValue({
      startDate: startText, endDate: endText
    }, { emitEvent: false });
  }

  private formatDisplay(ts: number, cal: CalendarType): string {
    const d = new Date(ts);
    if (cal === 'gregorian') {
      const yyyy = d.getFullYear();
      const MM = this.zz(d.getMonth() + 1);
      const DD = this.zz(d.getDate());
      const HH = this.zz(d.getHours());
      const mm = this.zz(d.getMinutes());
      return `${yyyy}-${MM}-${DD} ${HH}:${mm}`;
    } else {
      const jalaliDate = new Jalali(d);
      return jalaliDate.format('YYYY/MM/DD HH:mm');
    }
  }

  private zz(n: number) { return n < 10 ? `0${n}` : `${n}`; }
}
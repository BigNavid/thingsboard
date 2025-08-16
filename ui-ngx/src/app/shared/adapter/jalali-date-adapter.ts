import { Injectable } from '@angular/core';
import { NativeDateAdapter, MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import jalaali from 'jalaali-js';

export const JALALI_DATE_FORMATS: MatDateFormats = {
  parse:   { dateInput: 'jYYYY/jMM/jDD HH:mm' },
  display: {
    dateInput:        'jYYYY/jMM/jDD HH:mm',
    monthYearLabel:   'jYYYY jMMMM',
    dateA11yLabel:    'jYYYY/jMM/jDD',
    monthYearA11yLabel:'jYYYY jMMMM'
  }
};

function two(n: number) { return n < 10 ? '0' + n : '' + n; }

@Injectable()
export class JalaliDateAdapter extends NativeDateAdapter {

  // عددهای فارسی؟ درصورت نیاز، locale را 'fa-IR' بگذارید و این تابع را تغییر دهید.
  override format(date: Date, displayFormat: any): string {
    const { jy, jm, jd } = jalaali.toJalaali(date);
    const hh = two(date.getHours());
    const mm = two(date.getMinutes());
    // اگر فقط تاریخ خواستید:
    if (displayFormat === 'input-date') {
      return `${jy}/${two(jm)}/${two(jd)}`;
    }
    // تاریخ‌وزمان (برای datetime)
    return `${jy}/${two(jm)}/${two(jd)} ${hh}:${mm}`;
  }

  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const str = value.trim();
      if (!str) { return null; }

      // حالت‌های 1) فقط تاریخ 2) تاریخ‌وزمان
      const [d, t] = str.split(/\s+/);
      const [jy, jm, jd] = d.split(/[\/\-\.]/).map(s => +s);
      const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);

      let h = 0, m = 0;
      if (t) {
        const [hh, mm] = t.split(':').map(s => +s);
        if (!Number.isNaN(hh)) h = hh;
        if (!Number.isNaN(mm)) m = mm;
      }
      const dt = new Date(gy, (gm - 1), gd, h, m, 0, 0);
      return isNaN(dt.getTime()) ? null : dt;
    }
    // اجازه می‌دهیم NativeDateAdapter سایر ورودی‌ها را هندل کند
    return super.parse(value);
  }
}

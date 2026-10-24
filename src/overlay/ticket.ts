// The admission ticket's date stamp (EXPERIENCE §11.1 item 3): "Begin the walk" is stamped with
// today's date in the visitor's locale after hydration ("15 OCT 2026"). The prerender leaves the
// stamp empty in a fixed-width area, so filling it never shifts the hero. Under ?test=1 the stamp
// uses the frozen test date and locale, so screenshots stay stable from day to day (RULINGS, M4
// routing). Pure: no DOM, so Node tests and e2e specs can import it.

/** The frozen test date and locale under ?test=1 (the EXPERIENCE §11.1 example). */
export const TEST_DATE = new Date(2026, 9, 15);
export const TEST_LOCALE = 'en-CA';

/** Day, short month and year, in that order, in `locale`: "15 OCT 2026". */
export function stampText(date: Date, locale?: string): string {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat(locale, options);
  } catch {
    format = new Intl.DateTimeFormat('en-CA', options);
  }
  const parts = format.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const month = part('month').replace(/\./g, '').toLocaleUpperCase(format.resolvedOptions().locale);
  return `${part('day')} ${month} ${part('year')}`;
}

/** The stamp under ?test=1. */
export const TEST_STAMP = stampText(TEST_DATE, TEST_LOCALE);

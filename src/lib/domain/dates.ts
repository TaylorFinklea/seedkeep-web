// Date-only helpers. All math is UTC on `YYYY-MM-DD` strings.
// CONTRACT STUBS — owner: Luna (Phase 1). Port from seedkeep-data.js; keep signatures.
import type { DateParts, YMD } from './types';

/** The fixed sample "today". */
export const TODAY: YMD = '2026-10-09';

/** UTC epoch milliseconds for a YMD. */
export function parseYMD(s: YMD): number {
	void s;
	return 0;
}

/** YMD for UTC epoch milliseconds. */
export function toYMD(ms: number): YMD {
	void ms;
	return TODAY;
}

/** Whole days from TODAY to `s` (negative = past). */
export function diff(s: YMD): number {
	void s;
	return 0;
}

/** "Oct 9"; '' for empty input. */
export function fmt(s: YMD | null | undefined): string {
	return s ?? '';
}

export function addDays(s: YMD, n: number): YMD {
	void n;
	return s;
}

/** "1 seed", "3 seeds". */
export function plural(n: number, word: string): string {
	return n + ' ' + word;
}

/** "Today", "Tomorrow", "In 3 days", "4 days late". */
export function dueLabel(s: YMD): string {
	void s;
	return '';
}

/** Parts of TODAY: "Friday, October 9". */
export function dateParts(): DateParts {
	return { dow: '', month: '', day: 0, year: 0, long: '' };
}

/** True for a real calendar date in `YYYY-MM-DD` form. */
export function isYMD(s: string): boolean {
	void s;
	return false;
}

// Date-only helpers. All math is UTC on `YYYY-MM-DD` strings.
import type { DateParts, YMD } from './types';

export const TODAY: YMD = '2026-10-09';
const DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseYMD(s: YMD): number {
	const [year, month, day] = s.split('-').map(Number);
	return Date.UTC(year, month - 1, day);
}

export function toYMD(ms: number): YMD {
	return new Date(ms).toISOString().slice(0, 10);
}

export function diff(s: YMD): number {
	return Math.round((parseYMD(s) - parseYMD(TODAY)) / DAY);
}

export function fmt(s: YMD | null | undefined): string {
	if (!s) return '';
	const date = new Date(parseYMD(s));
	return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function addDays(s: YMD, n: number): YMD {
	return toYMD(parseYMD(s) + n * DAY);
}

export function plural(n: number, word: string): string {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}


export function dateParts(): DateParts {
	const date = new Date(parseYMD(TODAY));
	const dow = DAYS[date.getUTCDay()];
	const month = MONTHS_LONG[date.getUTCMonth()];
	const day = date.getUTCDate();
	return { dow, month, day, year: date.getUTCFullYear(), long: `${dow}, ${month} ${day}` };
}

export function isYMD(s: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const date = new Date(parseYMD(s));
	return date.toISOString().slice(0, 10) === s;
}

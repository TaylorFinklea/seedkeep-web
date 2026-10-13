import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, dateParts, diff, fmt, isYMD, parseYMD, plural, setToday, toYMD } from './dates';

describe('date helpers', () => {
	beforeEach(() => setToday('2026-10-09'));
	it('uses UTC date-only math', () => {
		expect(diff('2026-10-09')).toBe(0);
		expect(diff('2026-10-08')).toBe(-1);
		expect(parseYMD('2026-10-09')).toBe(Date.UTC(2026, 9, 9));
		expect(toYMD(Date.UTC(2026, 9, 9))).toBe('2026-10-09');
		expect(addDays('2026-10-09', 1)).toBe('2026-10-10');
	});
	it('formats labels and parts', () => {
		expect(fmt('2026-10-09')).toBe('Oct 9');
		expect(fmt('')).toBe('');
		expect(plural(1, 'seed')).toBe('1 seed');
		expect(plural(3, 'seed')).toBe('3 seeds');
		expect(dateParts()).toEqual({
			dow: 'Friday',
			month: 'October',
			day: 9,
			year: 2026,
			long: 'Friday, October 9'
		});
	});
	it('validates calendar dates rather than just their shape', () => {
		expect(isYMD('2024-02-29')).toBe(true);
		expect(isYMD('2026-02-29')).toBe(false);
		expect(isYMD('2026-2-09')).toBe(false);
	});
});

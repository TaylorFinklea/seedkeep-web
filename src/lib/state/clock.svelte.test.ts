import { afterEach, describe, expect, it, vi } from 'vitest';
import { Clock } from './clock.svelte';

describe('reactive local clock', () => {
	afterEach(() => vi.useRealTimers());
	it('updates today at local midnight and can be pinned for tests', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 9, 23, 59, 30));
		const clock = new Clock();
		clock.setToday('2026-10-09');
		const stop = clock.start();
		vi.setSystemTime(new Date(2026, 9, 10, 0, 0, 1));
		vi.advanceTimersByTime(31_000);
		expect(clock.today).toBe('2026-10-10');
		clock.setToday('2026-10-09');
		expect(clock.today).toBe('2026-10-09');
		stop();
	});
});

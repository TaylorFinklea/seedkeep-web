// Reactive calendar clock. CONTRACT (parent-owned) — tick/midnight wiring owned by Luna.
// Reading `clock.today` inside any $derived/$effect (including via dates.ts helpers)
// makes it re-run when the date changes. Tests call setToday() to pin a date.
import type { YMD } from '$lib/domain/types';

/** Local calendar date as YYYY-MM-DD. */
export function localYMD(d: Date = new Date()): YMD {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export class Clock {
	#listeners = new Set<(ymd: YMD) => void>();
	/** Today's local date. */
	today = $state<YMD>(localYMD());
	/** Current time, refreshed about once a minute (daylight "now" marker). */
	now = $state<Date>(new Date());

	setToday = (ymd: YMD): void => {
		const changed = this.today !== ymd;
		this.today = ymd;
		this.now = new Date();
		if (changed) for (const listener of this.#listeners) listener(ymd);
	};
	subscribe = (listener: (ymd: YMD) => void): (() => void) => {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	};

	/** Start minute ticks and local-midnight rollover (also re-sync on focus/visibility). Returns cleanup. */
	start = (): (() => void) => {
		const browser = typeof window !== 'undefined';
		let stopped = false,
			rollover: ReturnType<typeof setTimeout>,
			tick: ReturnType<typeof setInterval>;
		const sync = (): void => {
			if (stopped) return;
			this.now = new Date();
			const date = localYMD(this.now);
			if (date !== this.today) this.setToday(date);
			clearTimeout(rollover);
			const next = new Date(this.now);
			next.setHours(24, 0, 0, 50);
			rollover = setTimeout(sync, Math.max(50, next.getTime() - this.now.getTime()));
		};
		const onVisible = (): void => {
			if (browser && document.visibilityState === 'visible') sync();
		};
		sync();
		tick = setInterval(sync, 60_000);
		if (browser) {
			window.addEventListener('focus', sync);
			document.addEventListener('visibilitychange', onVisible);
		}
		return () => {
			stopped = true;
			clearTimeout(rollover);
			clearInterval(tick);
			if (browser) {
				window.removeEventListener('focus', sync);
				document.removeEventListener('visibilitychange', onVisible);
			}
		};
	};
}

export const clock = new Clock();

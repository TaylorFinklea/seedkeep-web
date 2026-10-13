import { describe, expect, it, vi } from 'vitest';
import { bindShortcuts, type ShortcutHandlers } from './keys';
import type { RouteKey } from './nav';

class KeyEvent extends Event {
	readonly key: string;
	readonly metaKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly repeat: boolean;
	readonly isComposing: boolean;
	constructor(key: string, options: Partial<KeyEvent> = {}) {
		super('keydown', { cancelable: true });
		this.key = key;
		this.metaKey = options.metaKey ?? false;
		this.ctrlKey = options.ctrlKey ?? false;
		this.altKey = options.altKey ?? false;
		this.repeat = options.repeat ?? false;
		this.isComposing = options.isComposing ?? false;
		this.shiftKey = options.shiftKey ?? false;
	}
	readonly shiftKey: boolean;
}

function setup() {
	const target = new EventTarget();
	const calls: string[] = [];
	let modal = false;
	const handlers: ShortcutHandlers = {
		palette: () => calls.push('palette'),
		escape: () => calls.push('escape'),
		add: () => calls.push('add'),
		filter: () => calls.push('filter'),
		shortcuts: () => calls.push('shortcuts'),
		sprout: () => calls.push('sprout'),
		go: (key: RouteKey) => calls.push(key),
		isModalOpen: () => modal
	};
	const unbind = bindShortcuts(handlers, target);
	const press = (
		key: string,
		options: Partial<KeyEvent> = {},
		targetProps?: Record<string, unknown>
	) => {
		if (targetProps)
			Object.entries(targetProps).forEach(([name, value]) =>
				Object.defineProperty(target, name, { configurable: true, value })
			);
		const event = new KeyEvent(key, options);
		target.dispatchEvent(event);
		return event;
	};
	return {
		target,
		calls,
		press,
		unbind,
		setModal: (value: boolean) => {
			modal = value;
		}
	};
}

describe('keyboard shortcuts', () => {
	it('handles letter shortcuts and G route chords case-insensitively', () => {
		const { calls, press, unbind } = setup();
		expect(press('N').defaultPrevented).toBe(true);
		press('a');
		press('?');
		press('/');
		press('g');
		expect(press('T').defaultPrevented).toBe(true);
		expect(calls).toEqual(['add', 'shortcuts', 'filter', 'today']);
		unbind();
	});
	it('fires shortcuts with a focused checkbox', () => {
		const { calls, press, unbind } = setup();
		press('n', {}, { tagName: 'INPUT', type: 'checkbox' });
		expect(calls).toEqual(['add']);
		unbind();
	});
	it('ignores typing and suspends single keys during a modal', () => {
		const { calls, press, setModal, unbind } = setup();
		press('n', {}, { tagName: 'INPUT' });
		press('/', {}, { tagName: 'TEXTAREA' });
		setModal(true);
		press('a');
		expect(calls).toEqual([]);
		press('Escape');
		expect(calls).toEqual(['escape']);
		unbind();
	});
	it('allows Command-K while typing and ignores repeat and IME events', () => {
		const { calls, press, unbind } = setup();
		const commandK = press('k', { metaKey: true }, { tagName: 'INPUT' });
		press('n', { repeat: true });
		press('a', { isComposing: true });
		expect(commandK.defaultPrevented).toBe(true);
		expect(calls).toEqual(['palette']);
		unbind();
	});
	it('preserves a G chord across a real modifier key and rejects modified single keys', () => {
		const { calls, press, unbind } = setup();
		press('g');
		press('Shift', { shiftKey: true });
		press('s', { shiftKey: true });
		expect(calls).toEqual(['seeds']);
		press('a', { altKey: true });
		press('a', { metaKey: true });
		press('a', { ctrlKey: true });
		expect(calls).toEqual(['seeds']);
		unbind();
	});
	it('handles Escape while typing and blocks chords while modal', () => {
		const { calls, press, setModal, unbind } = setup();
		press('Escape', {}, { tagName: 'INPUT' });
		setModal(true);
		press('g');
		press('s');
		expect(calls).toEqual(['escape']);
		unbind();
	});
	it('expires a pending G prefix after 900 ms', () => {
		vi.useFakeTimers();
		const { calls, press, unbind } = setup();
		press('g');
		vi.advanceTimersByTime(901);
		press('s');
		expect(calls).toEqual([]);
		unbind();
		vi.useRealTimers();
	});
});

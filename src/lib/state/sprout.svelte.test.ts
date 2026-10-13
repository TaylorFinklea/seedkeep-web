import { afterEach, describe, expect, it, vi } from 'vitest';
import { SproutChat } from './sprout.svelte';
import { garden } from './garden.svelte';

describe('SproutChat', () => {
	afterEach(() => vi.useRealTimers());

	it('ignores sends while a reply is pending', () => {
		vi.useFakeTimers();
		const chat = new SproutChat();
		const original = garden.thread;
		chat.send('What can I plant?');
		const afterFirst = [...garden.thread];
		chat.send('Anything at risk of frost?');
		expect(garden.thread).toEqual(afterFirst);
		expect(chat.thinking).toBe(true);
		chat.cancel();
		garden.thread = original;
	});

	it('cancel clears thinking and prevents a late reply', () => {
		vi.useFakeTimers();
		const chat = new SproutChat();
		const original = garden.thread;
		chat.send('What can I plant?');
		chat.cancel();
		vi.advanceTimersByTime(1000);
		expect(chat.thinking).toBe(false);
		expect(garden.thread.filter((item) => item.role === 'bot')).toHaveLength(
			original.filter((item) => item.role === 'bot').length
		);
		garden.thread = original;
	});
});

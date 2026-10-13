import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: { pathname: '/' } } }));
import { AddFlow } from './addFlow.svelte';
import { garden } from './garden.svelte';
import { ui } from './ui.svelte';
import { commands } from './commands';
import { clock } from './clock.svelte';

describe('addFlow', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		ui.close('add');
	});
	it('keeps photo extraction and barcode scanning unreachable in M1', () => {
		vi.useFakeTimers();
		const flow = new AddFlow();
		flow.useSample();
		expect(flow.phase).toBe('idle');
		vi.advanceTimersByTime(1400);
		expect(flow.form.name).toBe('');
		flow.startScan();
		vi.advanceTimersByTime(1600);
		expect(flow.form.name).toBe('');
	});
	it('coerces disabled photo and scan modes to manual', () => {
		const flow = new AddFlow();
		flow.setMode('scan');
		expect(flow.mode).toBe('manual');
		flow.setMode('photo');
		expect(flow.mode).toBe('manual');
		expect(flow.banner).toBe('');
		expect(flow.extra).toEqual({});
		flow.reset();
		expect(flow.extra).toEqual({});
		expect(flow.banner).toBe('');
	});
	it('defaults the packed year from the reactive garden clock', () => {
		const flow = new AddFlow();
		clock.setToday('2031-01-02');
		flow.reset();
		expect(flow.form.year).toBe('2031');
		clock.setToday('2026-10-12');
	});
	it('ignores packet drops while packet photo is disabled', () => {
		const create = vi.spyOn(URL, 'createObjectURL');
		const flow = new AddFlow();
		const file = new File(['x'], 'packet.png', { type: 'image/png' });
		flow.onDrop({
			preventDefault: () => undefined,
			dataTransfer: { files: [file] as unknown as FileList }
		} as DragEvent);
		expect(create).not.toHaveBeenCalled();
		expect(flow.files).toEqual([]);
		expect(flow.phase).toBe('idle');
	});
	it('ignores non-image drops while packet photo is disabled', () => {
		const flow = new AddFlow();
		const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
		flow.onDrop({
			preventDefault: () => undefined,
			dataTransfer: { files: [file] as unknown as FileList }
		} as DragEvent);
		expect(flow.phase).toBe('idle');
		expect(flow.form.name).toBe('');
		expect(flow.extra).toEqual({});
		expect(flow.error).toBe('');
	});
	it('validates fields and waits for a successful seed create before navigation', async () => {
		const flow = new AddFlow();
		flow.setField('name', ' Test seed ');
		flow.setField('year', '1899');
		expect(await flow.save()).toBeNull();
		expect(flow.error).toContain('Year');
		flow.setField('year', '2026');
		flow.setField('packets', '1.5');
		expect(await flow.save()).toBeNull();
		expect(flow.error).toContain('Packets');
		flow.setField('packets', '2');
		const seedValue = {
			id: 'se_web_test',
			name: 'Test seed',
			variety: '',
			company: '',
			type: 'Untyped',
			state: 'active' as const,
			packets: 2,
			year: 2026,
			loc: '',
			tags: [],
			verdict: null,
			window: null,
			info: null,
			notes: '',
			catalog: false,
			version: 1,
			catalogId: null,
			source: 'store' as const
		};
		vi.spyOn(garden, 'addSeed').mockResolvedValue(seedValue);
		const openSeed = vi.spyOn(commands, 'openSeed').mockResolvedValue();
		const seed = await flow.save();
		expect(seed?.name).toBe('Test seed');
		expect(ui.toast?.message).toBe('Added Test seed.');
		expect(openSeed).toHaveBeenCalledWith(seed?.id);
	});
});

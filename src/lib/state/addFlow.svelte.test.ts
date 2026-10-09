import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: { pathname: '/' } } }));
import { AddFlow } from './addFlow.svelte';
import { garden } from './garden.svelte';
import { ui } from './ui.svelte';
import { commands } from './commands';

describe('addFlow', () => {
	afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); ui.close('add'); });
	it('fills sample photo and scan values after their delays', () => {
		vi.useFakeTimers();
		const flow = new AddFlow(); flow.useSample();
		expect(flow.phase).toBe('reading'); vi.advanceTimersByTime(1400);
		expect(flow.form).toMatchObject({ name: 'Lettuce', variety: 'Rouge d’Hiver' });
		expect(flow.extra.verdict).toBe('late'); expect(flow.mode).toBe('manual'); expect(flow.banner).toContain('photo stayed in this browser');
		flow.startScan(); vi.advanceTimersByTime(1600);
		expect(flow.form).toMatchObject({ name: 'Arugula', variety: 'Astro' }); expect(flow.banner).toContain('barcode 0 71834 05213 9');
	});
	it('keeps the demo banner with extracted fields across mode changes and reset clears them', () => {
		vi.useFakeTimers();
		const flow = new AddFlow(); flow.useSample(); vi.advanceTimersByTime(1400);
		const sampleExtra = { ...flow.extra };
		flow.setMode('scan'); flow.setMode('manual');
		expect(flow.banner).toContain('photo stayed in this browser'); expect(flow.extra).toEqual(sampleExtra);
		flow.reset(); expect(flow.extra).toEqual({}); expect(flow.banner).toBe('');
	});
	it('setMode cancels a running fill timer', () => {
		vi.useFakeTimers();
		const flow = new AddFlow(); flow.useSample(); flow.setMode('scan'); vi.advanceTimersByTime(2000);
		expect(flow.form.name).toBe(''); expect(flow.extra).toEqual({}); expect(flow.banner).toBe(''); expect(flow.phase).toBe('idle');
	});
	it('prevents a stale fill after close and revokes photo URLs', () => {
		vi.useFakeTimers();
		const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sample');
		const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
		const flow = new AddFlow();
		const file = new File(['x'], 'packet.png', { type: 'image/png' });
		flow.onDrop({ preventDefault: () => undefined, dataTransfer: { files: [file] as unknown as FileList } } as DragEvent);
		expect(create).toHaveBeenCalledWith(file);
		expect(flow.files).toEqual(['blob:sample']);
		flow.dispose(); expect(revoke).toHaveBeenCalledWith('blob:sample');
		flow.useSample(); flow.close(); vi.advanceTimersByTime(2000);
		expect(flow.form.name).toBe('');
	});
	it('rejects drops without image files without starting a sample fill', () => {
		vi.useFakeTimers();
		const flow = new AddFlow();
		const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
		flow.onDrop({ preventDefault: () => undefined, dataTransfer: { files: [file] as unknown as FileList } } as DragEvent);
		expect(flow.phase).toBe('idle'); expect(flow.form.name).toBe(''); expect(flow.extra).toEqual({});
		expect(flow.error).toBe('Drop JPG or PNG images.'); expect(ui.toast?.message).toBe('Drop JPG or PNG images.');
		vi.advanceTimersByTime(2000); expect(flow.form.name).toBe('');
	});
	it('validates fields and saves a seed, toast, and detail navigation', () => {
		const flow = new AddFlow();
		flow.setField('name', ' Test seed '); flow.setField('year', '1899');
		expect(flow.save()).toBeNull(); expect(flow.error).toContain('Year');
		flow.setField('year', '2026'); flow.setField('packets', '1.5');
		expect(flow.save()).toBeNull(); expect(flow.error).toContain('Packets');
		flow.setField('packets', '2');
		const openSeed = vi.spyOn(commands, 'openSeed').mockResolvedValue();
		const seed = flow.save();
		expect(seed?.name).toBe('Test seed'); expect(ui.toast?.message).toBe('Added Test seed.'); expect(openSeed).toHaveBeenCalledWith(seed?.id);
	});
});

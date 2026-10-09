import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: { pathname: '/' } } }));
import { paletteItems, filterItems } from './palette';
import { Garden } from './garden.svelte';
import { ui } from './ui.svelte';
import { commands } from './commands';

describe('command palette items', () => {
	it('filters case-insensitively across labels, hints, and groups, capped at nine', () => {
		const items = paletteItems(new Garden());
		expect(filterItems(items, 'gar').map((item) => item.label)).toContain('Garden');
		expect(filterItems(items, 'gar').map((item) => item.label)).toContain('Garlic — Music');
		expect(filterItems(items, 'gAr').length).toBe(filterItems(items, 'gar').length);
		expect(filterItems(items, 'bed').every((item) => item.group === 'Bed')).toBe(true);
		expect(filterItems(Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, label: `Match ${i}`, group: 'Action' as const, run: () => undefined })), 'match')).toHaveLength(9);
	});
	it('runs Scan and Photo items in their requested add modes', async () => {
		const items = paletteItems(new Garden());
		await items.find((item) => item.id === 'scan')!.run();
		expect(ui.addMode).toBe('scan'); expect(ui.isOpen('add')).toBe(true);
		ui.close('add');
		await items.find((item) => item.id === 'photo')!.run();
		expect(ui.addMode).toBe('photo'); expect(ui.isOpen('add')).toBe(true);
		ui.close('add');
	});
	it('selects the requested bed and clears the selected event', async () => {
		const g = new Garden(); const bed = g.beds[0];
		ui.garden.selEv = 'selected-event';
		const item = paletteItems(g).find((candidate) => candidate.id === `bed:${bed.id}`)!;
		await item.run();
		expect(ui.garden.bedId).toBe(bed.id); expect(ui.garden.selEv).toBeNull();
	});
	it('routes seed palette items through openSeed', async () => {
		const openSeed = vi.spyOn(commands, 'openSeed').mockResolvedValue();
		const seed = new Garden().seeds[0];
		await paletteItems(new Garden()).find((item) => item.id === `seed:${seed.id}`)!.run();
		expect(openSeed).toHaveBeenCalledWith(seed.id); openSeed.mockRestore();
	});
});

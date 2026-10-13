import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: { pathname: '/' } } }));
import { paletteItems, filterItems } from './palette';
import { Garden } from './garden.svelte';
import { ui } from './ui.svelte';
import { commands } from './commands';
import { sampleData } from '$lib/domain/sample';

function fixture(): Garden {
	const g = new Garden();
	const data = sampleData();
	g.seeds = data.seeds;
	g.beds = data.beds;
	g.events = data.events;
	g.locations = data.locations;
	g.tags = data.tags;
	return g;
}

describe('command palette items', () => {
	it('filters case-insensitively across labels, hints, and groups, capped at nine', () => {
		const items = paletteItems(fixture());
		expect(filterItems(items, 'gar').map((item) => item.label)).toContain('Garden');
		expect(filterItems(items, 'gar').map((item) => item.label)).toContain('Garlic — Music');
		expect(filterItems(items, 'gAr').length).toBe(filterItems(items, 'gar').length);
		expect(filterItems(items, 'bed').every((item) => item.group === 'Bed')).toBe(true);
		expect(
			filterItems(
				Array.from({ length: 12 }, (_, i) => ({
					id: `${i}`,
					label: `Match ${i}`,
					group: 'Action' as const,
					run: () => undefined
				})),
				'match'
			)
		).toHaveLength(9);
	});
	it('does not expose disabled M2 actions', () => {
		const items = paletteItems(fixture());
		expect(items.some((item) => ['scan', 'photo', 'import', 'sprout'].includes(item.id))).toBe(
			false
		);
	});
	it('selects the requested bed and clears the selected event', async () => {
		const g = fixture();
		const bed = g.beds[0];
		ui.garden.selEv = 'selected-event';
		const item = paletteItems(g).find((candidate) => candidate.id === `bed:${bed.id}`)!;
		await item.run();
		expect(ui.garden.bedId).toBe(bed.id);
		expect(ui.garden.selEv).toBeNull();
	});
	it('routes seed palette items through openSeed', async () => {
		const openSeed = vi.spyOn(commands, 'openSeed').mockResolvedValue();
		const g = fixture();
		const seed = g.seeds[0];
		await paletteItems(g)
			.find((item) => item.id === `seed:${seed.id}`)!
			.run();
		expect(openSeed).toHaveBeenCalledWith(seed.id);
		openSeed.mockRestore();
	});
});

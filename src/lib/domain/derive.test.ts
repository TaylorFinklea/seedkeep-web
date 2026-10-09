import { describe, expect, it } from 'vitest';
import { sampleData } from './sample';
import { abbr, daylight, dueEvents, eventRow, filterSeeds, frost, frostWarnings, infoRows, isOld, plannedFor, seedRow, upcomingEvents, whatToPlant, windowDays } from './derive';

describe('garden selectors', () => {
	const garden = sampleData();
	it('builds seed rows and verdict windows', () => {
		const garlic = garden.seeds[0];
		const row = seedRow(garden, garlic);
		expect(row.title).toBe('Garlic — Music');
		expect(row.dot).toBe('var(--v-plant_now)');
		expect(row.old).toBe(false);
		expect(seedRow(garden, garden.seeds.find((seed) => seed.id === 's19')!).dot).toBe('transparent');
		expect(seedRow(garden, garden.seeds.find((seed) => seed.id === 's19')!).verdictLabel).toBe('Not in the catalog');
		for (const [id, expected] of [['s1', '32 days left'], ['s7', 'Opens in 6 days'], ['s3', '3 days left'], ['s9', 'Opens in 139 days'], ['s12', 'Closed 86 days ago']] as const)
			expect(windowDays(garden.seeds.find((seed) => seed.id === id)!)).toBe(expected);
		expect(isOld(garden.seeds.find((seed) => seed.id === 's4')!)).toBe(true);
		expect(isOld(garden.seeds.find((seed) => seed.id === 's1')!)).toBe(false);
		expect(abbr(garlic)).toBe('Gam');
		expect(abbr(garden.seeds.find((seed) => seed.id === 's6')!)).toBe('Mcv');
		expect(abbr(garden.seeds.find((seed) => seed.id === 's5')!)).toBe('Cr');
		expect(abbr(null)).toBe('?');
	});
	it('formats info rows and filters null values', () => {
		const garlic = infoRows(garden.seeds[0]);
		expect(garlic.find((row) => row.label === 'Germination')?.value).toBe('7–14 days');
		expect(garlic.find((row) => row.label === 'Seed depth')?.value).toBe('2 in');
		expect(infoRows(garden.seeds.find((seed) => seed.id === 's19')!)).toEqual([]);
	});
	it('selects due, upcoming and frost warning events', () => {
		expect(dueEvents(garden).map((row) => row.id)).toEqual(['e3', 'e4', 'e5']);
		expect(upcomingEvents(garden, 7).map((row) => row.id)).toEqual(['e8', 'e9', 'e1', 'e6']);
		const warnings = frostWarnings(garden);
		expect(warnings.map((row) => row.id)).toContain('e7');
		expect(warnings.map((row) => row.id)).not.toContain('e9');
		expect(eventRow(garden, garden.events.find((event) => event.id === 'e7')!).frost).toContain('Basil is frost-tender');
	});
	it('groups all verdicts, including wishlist and saved but excluding archived', () => {
		const groups = whatToPlant(garden);
		expect(groups.map((group) => group.key)).toEqual(['now', 'soon', 'late', 'later']);
		expect(groups.every((group) => group.count === group.rows.length)).toBe(true);
		const laterIds = groups[3].rows.map((row) => row.id);
		expect(laterIds).toContain('s17');
		expect(laterIds).toContain('s20');
		expect(laterIds).not.toContain('s22');
		expect(groups[0].rows.map((row) => row.windowLabel)).toEqual([...groups[0].rows.map((row) => row.windowLabel)].sort());
	});
	it('computes daylight geometry, frost countdown and planning location', () => {
		const fixed = new Date(2026, 9, 9, 12, 0);
		expect(daylight(garden, fixed)).toEqual({ sunrise: '7:22 AM', sunset: '6:53 PM', length: '11 h 31 min', left: '30.7%', width: '48.0%', now: '50.0%' });
		expect(frost(garden).days).toBe(12);
		expect(plannedFor(garden, 's1')).toBe('South raised bed, Oct 12');
		expect(plannedFor(garden, 's19')).toBe('—');
		expect(filterSeeds(garden, { state: 'wishlist', q: 'marketmore' }).map((seed) => seed.id)).toEqual(['s19']);
	});
});

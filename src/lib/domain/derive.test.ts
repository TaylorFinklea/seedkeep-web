import { beforeEach, describe, expect, it } from 'vitest';
import { setToday } from './dates';
import { sampleData } from './sample';
import {
	abbr,
	daylight,
	dueEvents,
	eventRow,
	filterSeeds,
	frost,
	frostWarnings,
	infoRows,
	isOld,
	plannedFor,
	seedRow,
	sortRows,
	typeOptions,
	upcomingEvents,
	whatToPlant,
	windowDays
} from './derive';

describe('garden selectors', () => {
	beforeEach(() => setToday('2026-10-09'));
	const garden = sampleData();
	it('builds seed rows and verdict windows', () => {
		const garlic = garden.seeds[0];
		const row = seedRow(garden, garlic);
		expect(row.title).toBe('Garlic — Music');
		expect(row.dot).toBe('var(--v-plant_now)');
		expect(row.old).toBe(false);
		expect(
			seedRow(
				garden,
				garden.seeds.find((seed) => seed.id === 's19')!
			).dot
		).toBe('transparent');
		expect(
			seedRow(
				garden,
				garden.seeds.find((seed) => seed.id === 's19')!
			).verdictLabel
		).toBe('Not in the catalog');
		for (const [id, expected] of [
			['s1', '32 days left'],
			['s7', 'Opens in 6 days'],
			['s3', '3 days left'],
			['s9', 'Opens in 139 days'],
			['s12', 'Closed 86 days ago']
		] as const)
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
		expect(
			eventRow(
				garden,
				garden.events.find((event) => event.id === 'e7')!
			).frost
		).toContain('Basil is frost-tender');
	});
	it('groups all verdicts, including wishlist and saved but excluding archived', () => {
		const groups = whatToPlant(garden);
		expect(groups.map((group) => group.key)).toEqual(['now', 'soon', 'late', 'later']);
		expect(groups.every((group) => group.count === group.rows.length)).toBe(true);
		const laterIds = groups[3].rows.map((row) => row.id);
		expect(laterIds).toContain('s17');
		expect(laterIds).toContain('s20');
		expect(laterIds).not.toContain('s22');
		expect(groups[0].rows.map((row) => row.windowLabel)).toEqual(
			[...groups[0].rows.map((row) => row.windowLabel)].sort()
		);
	});
	it('computes daylight geometry, frost countdown and planning location', () => {
		const fixed = new Date(2026, 9, 9, 12, 0);
		expect(daylight(garden, fixed)).toEqual({
			sunrise: '7:22 AM',
			sunset: '6:53 PM',
			length: '11 h 31 min',
			left: '30.7%',
			width: '48.0%',
			now: '50.0%'
		});
		expect(frost(garden).days).toBe(12);
		expect(plannedFor(garden, 's1')).toBe('South raised bed, Oct 12');
		expect(plannedFor(garden, 's19')).toBe('—');
		expect(
			filterSeeds(garden, { state: 'wishlist', q: 'marketmore' }).map((seed) => seed.id)
		).toEqual(['s19']);
	});
	it('sorts seed rows by every column and reverses direction', () => {
		const expected: Record<(typeof keys)[number], string[]> = {
			name: [
				's12',
				's13',
				's16',
				's20',
				's5',
				's19',
				's1',
				's8',
				's3',
				's6',
				's21',
				's7',
				's17',
				's11',
				's22',
				's4',
				's18',
				's2',
				's9',
				's10',
				's14',
				's15'
			],
			variety: [
				's2',
				's15',
				's9',
				's16',
				's21',
				's4',
				's12',
				's20',
				's22',
				's11',
				's8',
				's19',
				's1',
				's13',
				's17',
				's10',
				's6',
				's7',
				's14',
				's3',
				's18',
				's5'
			],
			type: [
				's13',
				's20',
				's16',
				's5',
				's19',
				's15',
				's21',
				's1',
				's12',
				's8',
				's3',
				's7',
				's18',
				's17',
				's11',
				's22',
				's4',
				's6',
				's2',
				's14',
				's9',
				's10'
			],
			company: [
				's9',
				's14',
				's18',
				's4',
				's12',
				's15',
				's22',
				's5',
				's8',
				's19',
				's3',
				's6',
				's10',
				's13',
				's17',
				's2',
				's11',
				's16',
				's1',
				's7',
				's20',
				's21'
			],
			year: [
				's22',
				's14',
				's11',
				's4',
				's12',
				's16',
				's3',
				's9',
				's13',
				's2',
				's5',
				's6',
				's8',
				's10',
				's15',
				's20',
				's21',
				's1',
				's7',
				's17',
				's18',
				's19'
			],
			packets: [
				's17',
				's18',
				's19',
				's22',
				's2',
				's3',
				's5',
				's6',
				's7',
				's8',
				's9',
				's10',
				's11',
				's12',
				's14',
				's15',
				's16',
				's20',
				's21',
				's1',
				's4',
				's13'
			],
			state: [
				's1',
				's2',
				's3',
				's4',
				's5',
				's6',
				's7',
				's8',
				's9',
				's10',
				's11',
				's12',
				's13',
				's14',
				's15',
				's16',
				's17',
				's18',
				's19',
				's20',
				's21',
				's22'
			],
			loc: [
				's9',
				's10',
				's11',
				's14',
				's3',
				's5',
				's6',
				's8',
				's16',
				's1',
				's2',
				's4',
				's7',
				's12',
				's13',
				's15',
				's20',
				's21',
				's17',
				's18',
				's19',
				's22'
			],
			verdict: [
				's1',
				's2',
				's5',
				's6',
				's7',
				's18',
				's3',
				's4',
				's8',
				's9',
				's10',
				's11',
				's17',
				's12',
				's13',
				's14',
				's15',
				's16',
				's20',
				's21',
				's19',
				's22'
			]
		};
		const keys = [
			'name',
			'variety',
			'type',
			'company',
			'year',
			'packets',
			'state',
			'loc',
			'verdict'
		] as const;
		for (const key of [
			'name',
			'variety',
			'type',
			'company',
			'year',
			'packets',
			'state',
			'loc',
			'verdict'
		] as const) {
			const ascending = sortRows(garden, garden.seeds, { key, dir: 1 }).map((seed) => seed.id);
			const descending = sortRows(garden, garden.seeds, { key, dir: -1 }).map((seed) => seed.id);
			expect(ascending, `${key} ascending`).toEqual(expected[key]);
			const nullsLast =
				key === 'variety'
					? ['s5']
					: key === 'company'
						? ['s20', 's21']
						: key === 'year'
							? ['s17', 's18', 's19']
							: key === 'loc'
								? ['s17', 's18', 's19', 's22']
								: key === 'verdict'
									? ['s19', 's22']
									: [];
			const nonMissing = ascending.filter((id) => !nullsLast.includes(id));
			expect(descending, `${key} descending`).toEqual([...nonMissing].reverse().concat(nullsLast));
		}
	});
	it('keeps missing sort values last in either direction and applies verdict order', () => {
		const unknown = garden.seeds.find((seed) => seed.id === 's19')!;
		const known = garden.seeds.filter((seed) => seed.verdict).slice(0, 3);
		expect(sortRows(garden, [unknown, ...known], { key: 'verdict', dir: 1 }).at(-1)?.id).toBe(
			unknown.id
		);
		expect(sortRows(garden, [unknown, ...known], { key: 'verdict', dir: -1 }).at(-1)?.id).toBe(
			unknown.id
		);
		const noYear = { ...known[0], year: null };
		expect(sortRows(garden, [noYear, ...known.slice(1)], { key: 'year', dir: -1 }).at(-1)?.id).toBe(
			noYear.id
		);
	});
	it('trims, deduplicates and excludes blank seed type options', () => {
		const data = {
			...garden,
			seeds: [
				{ ...garden.seeds[0], type: ' Garlic ' },
				{ ...garden.seeds[1], type: 'Spinach' },
				{ ...garden.seeds[2], type: 'Garlic' },
				{ ...garden.seeds[3], type: '   ' },
				{ ...garden.seeds[4], type: '' }
			]
		};
		expect(typeOptions(data)).toEqual(['Garlic', 'Spinach']);
		expect(
			filterSeeds(data, { state: 'all', q: '', type: 'Garlic' }).map((seed) => seed.id)
		).toEqual(['s1', 's3']);
	});
});

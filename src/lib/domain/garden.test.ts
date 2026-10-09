import { describe, expect, it } from 'vitest';
import { sampleData } from './sample';
import { cellIndex, buildCells, brushRows, planDate } from './garden';
import { TODAY } from './dates';

describe('garden painter model', () => {
	it('maps x to rows and y to columns and clamps out of range', () => {
		const bed = { id: 'test', name: 'Test', desc: '', w: 2, l: 5 };
		expect(cellIndex(bed, { x: 1.8, y: 3.2 })).toEqual({ row: 1, col: 3 });
		expect(cellIndex(bed, { x: 8, y: 8 })).toEqual({ row: 1, col: 4 });
		expect(cellIndex(bed, { x: -1, y: -1 })).toEqual({ row: 0, col: 0 });
	});

	it('builds row-major cells and chooses the first unfinished event in store order', () => {
		const g = sampleData();
		const bed = { id: 'b', name: 'Test', desc: '', w: 2, l: 5 };
		g.beds = [bed];
		g.events = [
			{ id: 'done', bed: 'b', seed: 's1', kind: 'sowing', date: TODAY, done: true, x: 0.2, y: 1.2, notes: '' },
			{ id: 'open', bed: 'b', seed: 's2', kind: 'transplant', date: '2026-10-12', done: false, x: 0.8, y: 1.8, notes: '' },
			{ id: 'open2', bed: 'b', seed: 's3', kind: 'harvest', date: TODAY, done: false, x: 0.7, y: 1.7, notes: '' },
			{ id: 'frost', bed: 'b', seed: 's9', kind: 'sowing', date: '2026-10-24', done: false, x: 1.2, y: 2.2, notes: '' },
			{ id: 'two-a', bed: 'b', seed: 's1', kind: 'sowing', date: TODAY, done: false, x: 1.2, y: 3.2, notes: '' },
			{ id: 'two-b', bed: 'b', seed: 's2', kind: 'sowing', date: TODAY, done: true, x: 1.4, y: 3.7, notes: '' }
		];
		const cells = buildCells(g, bed, 'open');
		expect(cells.map(({ row, col }) => [row, col])).toEqual(Array.from({ length: 10 }, (_, i) => [Math.floor(i / 5), i % 5]));
		expect(cells[1]).toMatchObject({ eventId: 'open', count: 3, abbr: 'Spb+', selected: true, label: expect.stringContaining(', 3 plantings') });
		expect(cells[7]).toMatchObject({ eventId: 'frost', frost: true, label: expect.stringContaining(', frost risk') });
		expect(cells[8].label).toContain(', 2 plantings');
		expect(cells[0].label).toBe('Row 1, square 1, empty');
		g.events = g.events.map((event) => event.id === 'open' ? { ...event, done: true } : event);
		expect(buildCells(g, bed, null)[1].eventId).toBe('open2');
		g.events = g.events.map((event) => event.id === 'open' ? { ...event, done: false } : event);
		g.events = g.events.filter((event) => event.id !== 'open');
		expect(buildCells(g, bed, null)[1].eventId).toBe('open2');
		g.events = g.events.map((event) => ({ ...event, done: true }));
		expect(buildCells(g, bed, null)[1]).toMatchObject({ eventId: 'done', done: true, sub: 'done', label: expect.stringContaining(', done') });
	});

	it('labels the South raised bed Garlic square completely', () => {
		const g = sampleData();
		const bed = g.beds.find((item) => item.id === 'b1')!;
		const cell = buildCells(g, bed, null)[1 * bed.l + 1];
		expect(cell.label).toBe('Row 2, square 2: Garlic — Music, Sow Oct 12');
		expect(cell.abbr).toBe('Gam');
		expect(cell.sub).toBe('Oct 12');
	});

	it('uses dates from upcoming windows unless missing, today, past, or too late', () => {
		const g = sampleData();
		const seed = g.seeds[0];
		expect(planDate(seed)).toBe(TODAY); // past window
		expect(planDate({ ...seed, window: ['2026-10-01', '2026-10-20'] })).toBe(TODAY);
		expect(planDate({ ...seed, window: ['2026-10-09', '2026-10-20'] })).toBe(TODAY);
		expect(planDate({ ...seed, window: ['2026-10-12', '2026-10-20'] })).toBe('2026-10-12');
		expect(planDate({ ...seed, window: null })).toBe(TODAY);
		expect(planDate({ ...seed, verdict: 'too_late', window: ['2026-10-12', '2026-10-20'] })).toBe(TODAY);
	});

	it('lists active seeds in verdict order, stable within verdict', () => {
		const g = sampleData();
		const rows = brushRows(g);
		expect(rows.map((row) => row.id)).toEqual(['s1', 's2', 's5', 's6', 's7', 's3', 's4', 's8', 's9', 's10', 's11', 's12', 's13', 's14', 's15', 's16']);
		g.seeds = g.seeds.map((seed) => seed.id === 's1' ? { ...seed, state: 'archived' } : seed);
		expect(brushRows(g).map((row) => row.id)).not.toContain('s1');
	});
});

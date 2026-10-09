import { describe, expect, it } from 'vitest';
import { sampleData } from './sample';
import { parseCSV, rowsToSeedInputs, toCSV } from './csv';

describe('CSV', () => {
	it('round trips commas, quotes, and newlines', () => {
		const garden = sampleData();
		garden.seeds[0].name = 'Garlic, "Music"';
		garden.seeds[0].notes = 'line one\nline two';
		const parsed = parseCSV(toCSV(garden));
		expect(parsed[1][0]).toBe('Garlic, "Music"');
		expect(parsed[1][10]).toBe('line one\nline two');
		expect(parsed).toHaveLength(garden.seeds.length + 1);
	});
	it('accepts CRLF and drops blank rows', () => {
		expect(parseCSV('name,status\r\nBean,Active\r\n\r\n , \r\n')).toEqual([['name', 'status'], ['Bean', 'Active']]);
		expect(parseCSV('')).toEqual([]);
	});
	it('maps supported fields and reports ignored columns', () => {
		const result = rowsToSeedInputs([
			['name', 'VARIETY', 'company', 'type', 'Status', 'packets', 'year packed', 'notes', 'stored_in', 'planting_window'],
			['Bean', 'Blue Lake', 'Seeds Co', 'Bean', 'Wishlist', '', 'bad', 'note', 'Pantry', 'Oct 1 – Oct 9'],
			['Pea', '', '', '', 'saved', '0', '2024', '', '', '']
		]);
		expect(result.inputs).toEqual([
			{ name: 'Bean', variety: 'Blue Lake', company: 'Seeds Co', type: 'Bean', state: 'wishlist', packets: 0, year: null, notes: 'note' },
			{ name: 'Pea', variety: '', company: '', type: '', state: 'saved', packets: 0, year: 2024, notes: '' }
		]);
		expect(result.ignored).toEqual(['stored_in', 'planting_window']);
	});
	it('keeps an explicit zero and uses the normal packet default on invalid values', () => {
		const { inputs } = rowsToSeedInputs([
			['name', 'status', 'packets', 'year_packed'],
			['A', 'active', '0', '2026'],
			['B', 'active', 'bad', '26'],
			['C', 'saved', '', '']
		]);
		expect(inputs.map((input) => [input.packets, input.year])).toEqual([[0, 2026], [1, null], [1, null]]);
	});
	it('neutralizes formulas on export and removes one protective apostrophe on import', () => {
		const garden = sampleData();
		garden.seeds = [ { ...garden.seeds[0], name: '=SUM(A1:A2)', notes: '+cmd', company: '-cmd', type: '@cmd' } ];
		const csv = toCSV(garden);
		expect(csv).toContain("'=SUM(A1:A2)");
		expect(csv).toContain("'+cmd");
		expect(csv).toContain("'-cmd");
		expect(csv).toContain("'@cmd");
		const imported = rowsToSeedInputs(parseCSV("name,notes\n'=SUM(A1:A2),'=keep\n")).inputs;
		expect(imported[0].name).toBe('=SUM(A1:A2)');
		expect(imported[0].notes).toBe('=keep');
	});
});

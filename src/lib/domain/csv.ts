// CSV export/import for the seed library.
import { STATE_LABEL } from './constants';
import { fmt } from './dates';
import { byId, seedRow } from './derive';
import type { GardenData, SeedInput, SeedState } from './types';

export const EXPORT_COLUMNS = [
	'name',
	'variety',
	'company',
	'type',
	'status',
	'packets',
	'year_packed',
	'stored_in',
	'tags',
	'planting_window',
	'notes'
] as const;
export const IMPORT_COLUMNS = [
	'name',
	'variety',
	'company',
	'type',
	'status',
	'packets',
	'year_packed',
	'notes'
] as const;

const cell = (value: unknown): string => {
	let text = value == null ? '' : String(value);
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCSV(g: GardenData): string {
	const lines = [EXPORT_COLUMNS.join(',')];
	for (const seed of g.seeds) {
		const row = seedRow(g, seed);
		lines.push(
			[
				seed.name,
				seed.variety,
				seed.company,
				seed.type,
				STATE_LABEL[seed.state],
				seed.packets,
				seed.year ?? '',
				row.location,
				row.tagText,
				row.windowLabel,
				seed.notes
			]
				.map(cell)
				.join(',')
		);
	}
	return lines.join('\n');
}

export function parseCSV(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let value = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') {
				value += '"';
				i++;
			} else if (char === '"') quoted = false;
			else value += char;
		} else if (char === '"') quoted = true;
		else if (char === ',') {
			row.push(value);
			value = '';
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && text[i + 1] === '\n') i++;
			row.push(value);
			rows.push(row);
			row = [];
			value = '';
		} else value += char;
	}
	if (value.length || row.length) {
		row.push(value);
		rows.push(row);
	}
	return rows.filter((cells) => cells.some((item) => item.trim() !== ''));
}

const normalize = (value: string): string => value.trim().toLowerCase().replace(/[ _]/g, '');
const states: SeedState[] = ['active', 'wishlist', 'saved', 'archived'];

export function rowsToSeedInputs(rows: string[][]): { inputs: SeedInput[]; ignored: string[] } {
	if (!rows.length) return { inputs: [], ignored: [] };
	const headers = rows[0];
	const normalized = headers.map(normalize);
	const supported = new Set((IMPORT_COLUMNS as readonly string[]).map(normalize));
	const ignored = headers.filter(
		(header) => !supported.has(normalize(header)) && header.trim() !== ''
	);
	const index = (name: string): number => normalized.indexOf(normalize(name));
	const get = (cells: string[], name: string): string => {
		const i = index(name);
		const value = i < 0 ? '' : (cells[i] ?? '').trim();
		return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
	};
	const inputs = rows
		.slice(1)
		.filter((cells) => cells.some((value) => value.trim() !== ''))
		.map((cells): SeedInput => {
			const rawState = get(cells, 'status').toLowerCase();
			const state =
				states.find(
					(candidate) => candidate === rawState || STATE_LABEL[candidate].toLowerCase() === rawState
				) ?? 'active';
			const rawPackets = get(cells, 'packets');
			const packetNumber = /^\d+$/.test(rawPackets) ? Number(rawPackets) : NaN;
			const packets =
				Number.isSafeInteger(packetNumber) && packetNumber >= 0
					? packetNumber
					: state === 'wishlist'
						? 0
						: 1;
			const rawYear = get(cells, 'year_packed');
			const year = /^\d{4}$/.test(rawYear) && Number(rawYear) > 0 ? Number(rawYear) : null;
			return {
				name: get(cells, 'name'),
				variety: get(cells, 'variety'),
				company: get(cells, 'company'),
				type: get(cells, 'type'),
				state,
				packets,
				year,
				notes: get(cells, 'notes')
			};
		});
	return { inputs, ignored };
}

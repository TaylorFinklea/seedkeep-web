// CSV export/import for the seed library.
// CONTRACT STUBS — owner: Luna (Phase 1).
import type { GardenData, SeedInput } from './types';

/** Columns written by export, in order. */
export const EXPORT_COLUMNS = ['name', 'variety', 'company', 'type', 'status', 'packets', 'year_packed', 'stored_in', 'tags', 'planting_window', 'notes'] as const;

/** Columns read by import. Other exported columns are reported as not imported. */
export const IMPORT_COLUMNS = ['name', 'variety', 'company', 'type', 'status', 'packets', 'year_packed', 'notes'] as const;

/** RFC 4180-style CSV of every seed (quotes, commas, newlines escaped). */
export function toCSV(g: GardenData): string {
	void g;
	return '';
}

/** Parse CSV text into rows of cells; handles quotes, escaped quotes, CRLF and LF; drops blank rows. */
export function parseCSV(text: string): string[][] {
	void text;
	return [];
}

/**
 * Map parsed rows (first row = header, case/space/underscore-insensitive) to seed inputs.
 * Status maps to a SeedState by key or label (case-insensitive), default 'active'.
 * Packets: a valid non-negative integer is kept (0 stays 0); blank defaults to 1, or 0 for wishlist.
 * Year: a valid 4-digit year or null.
 * `ignored` lists header columns present in the file that import does not read.
 */
export function rowsToSeedInputs(rows: string[][]): { inputs: SeedInput[]; ignored: string[] } {
	void rows;
	return { inputs: [], ignored: [] };
}

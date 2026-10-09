// Square-foot grid model for the Garden painter.
// CONTRACT STUBS — owner: Luna (Phase 3). Keep signatures; see docs/workbench/phase-3.md.
import { TODAY } from './dates';
import type { Bed, EventKind, GardenData, PlantingEvent, Seed, SeedRow, YMD } from './types';

export interface GardenCell {
	row: number;
	col: number;
	/** Id of the shown event (first unfinished, else first), or null when empty. */
	eventId: string | null;
	/** Events mapped to this square. */
	count: number;
	/** abbr(seed) plus '+' when count > 1; '' when empty. */
	abbr: string;
	/** 'done', fmt(date), or ''. */
	sub: string;
	kind: EventKind | null;
	done: boolean;
	selected: boolean;
	frost: boolean;
	/** Accessible name, e.g. "Row 1, square 2: Garlic — Music, Sow Oct 12". */
	label: string;
}

/** Grid position of an event, clamped into the bed. */
export function cellIndex(bed: Bed, e: Pick<PlantingEvent, 'x' | 'y'>): { row: number; col: number } {
	void bed;
	void e;
	return { row: 0, col: 0 };
}

/** Row-major cells (w rows × l columns) for one bed. */
export function buildCells(g: GardenData, bed: Bed, selEv: string | null): GardenCell[] {
	void g;
	void selEv;
	return Array.from({ length: bed.w * bed.l }, (_, i) => ({
		row: Math.floor(i / bed.l), col: i % bed.l, eventId: null, count: 0, abbr: '', sub: '', kind: null,
		done: false, selected: false, frost: false, label: ''
	}));
}

/** Date for a newly painted planting: window start when it is ahead and not missed, else TODAY. */
export function planDate(seed: Seed): YMD {
	void seed;
	return TODAY;
}

/** Active seeds as rows sorted by verdict order (missing last), stable within a verdict. */
export function brushRows(g: GardenData): SeedRow[] {
	void g;
	return [];
}

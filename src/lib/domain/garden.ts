// Square-foot grid model for the Garden painter.
// CONTRACT STUBS — owner: Luna (Phase 3). Keep signatures; see docs/workbench/phase-3.md.
import { TODAY } from './dates';
import { abbr, eventRow, seedRow } from './derive';
import { VERDICT } from './constants';
import { diff, fmt } from './dates';
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
	return { row: Math.max(0, Math.min(bed.w - 1, Math.floor(e.x))), col: Math.max(0, Math.min(bed.l - 1, Math.floor(e.y))) };
}

/** Row-major cells (w rows × l columns) for one bed. */
export function buildCells(g: GardenData, bed: Bed, selEv: string | null): GardenCell[] {
	const mapped = new Map<string, PlantingEvent[]>();
	for (const event of g.events) if (event.bed === bed.id) {
		const { row, col } = cellIndex(bed, event); const key = `${row}-${col}`;
		mapped.set(key, [...(mapped.get(key) ?? []), event]);
	}
	return Array.from({ length: bed.w * bed.l }, (_, i) => {
		const row = Math.floor(i / bed.l), col = i % bed.l;
		const events = mapped.get(`${row}-${col}`) ?? [];
		const shown = events.find((event) => !event.done) ?? events[0];
		const seed = shown ? g.seeds.find((item) => item.id === shown.seed) : undefined;
		const frost = shown ? eventRow(g, shown).hasFrost : false;
		const label = shown
			? `Row ${row + 1}, square ${col + 1}: ${seed?.name ?? 'Unknown seed'}${seed?.variety ? ` — ${seed.variety}` : ''}, ${({ sowing: 'Sow', transplant: 'Transplant', harvest: 'Harvest', note: 'Note' })[shown.kind]} ${fmt(shown.date)}${shown.done ? ', done' : ''}${frost ? ', frost risk' : ''}${events.length > 1 ? `, ${events.length} plantings` : ''}`
			: `Row ${row + 1}, square ${col + 1}, empty`;
		return { row, col, eventId: shown?.id ?? null, count: events.length, abbr: shown ? `${abbr(seed)}${events.length > 1 ? '+' : ''}` : '', sub: shown ? (shown.done ? 'done' : fmt(shown.date)) : '', kind: shown?.kind ?? null, done: shown?.done ?? false, selected: !!shown && shown.id === selEv, frost, label };
	});
}

/** Date for a newly painted planting: window start when it is ahead and not missed, else TODAY. */
export function planDate(seed: Seed): YMD {
	return seed.window && diff(seed.window[0]) > 0 && seed.verdict !== 'too_late' ? seed.window[0] : TODAY;
}

/** Active seeds as rows sorted by verdict order (missing last), stable within a verdict. */
export function brushRows(g: GardenData): SeedRow[] {
	return g.seeds.filter((seed) => seed.state === 'active').map((seed, index) => ({ row: seedRow(g, seed), index })).sort((a, b) => (a.row.verdict ? VERDICT[a.row.verdict].order : 99) - (b.row.verdict ? VERDICT[b.row.verdict].order : 99) || a.index - b.index).map(({ row }) => row);
}

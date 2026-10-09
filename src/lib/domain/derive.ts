// Pure selectors over GardenData. Components call these inside `$derived(...)`.
// CONTRACT STUBS — owner: Luna (Phase 1). Port from seedkeep-data.js; keep signatures.
// Stubs return safe empty values so the shell renders before Luna's work merges.
import type {
	Daylight,
	EventRow,
	FrostInfo,
	GardenData,
	InfoRow,
	PlantingEvent,
	Seed,
	SeedRow,
	SeedState,
	StateCounts,
	WindowGroup
} from './types';

export function byId<T extends { id: string }>(list: T[], id: string | null | undefined): T | undefined {
	return id ? list.find((x) => x.id === id) : undefined;
}

/** "Name — Variety", "Name", or "Unknown seed". */
export function seedTitle(s: Seed | null | undefined): string {
	return s ? s.name : 'Unknown seed';
}

/** Packed three or more seasons before 2026. */
export function isOld(s: Seed): boolean {
	void s;
	return false;
}

/** Two- or three-letter grid abbreviation: first two letters of the name plus the first letter of the variety, lower-cased. */
export function abbr(s: Seed | null | undefined): string {
	void s;
	return '?';
}

export function windowLabel(s: Seed): string {
	void s;
	return '';
}

export function windowDays(s: Seed): string {
	void s;
	return '';
}

export function infoRows(s: Seed): InfoRow[] {
	void s;
	return [];
}

export function seedRow(g: GardenData, s: Seed): SeedRow {
	void g;
	return {
		id: s.id, name: s.name, variety: s.variety, title: s.name, company: s.company, type: s.type || 'Untyped',
		year: s.year, packets: s.packets, state: s.state, stateLabel: '', loc: s.loc, location: '', tags: [], tagText: '',
		verdict: s.verdict, verdictLabel: '', verdictShort: '—', dot: 'transparent', windowLabel: '', daysLabel: '',
		old: false, notes: s.notes, provenance: '—', info: [], hasInfo: false, instr: ''
	};
}

export function stateCounts(g: GardenData): StateCounts {
	void g;
	return { active: 0, wishlist: 0, saved: 0, archived: 0 };
}

/** Seeds matching a state ('all' for every state) and a free-text query over name, variety, company, type and notes. */
export function filterSeeds(g: GardenData, f: { state: SeedState | 'all'; q: string; type?: string }): Seed[] {
	void f;
	return g.seeds;
}

export function eventRow(g: GardenData, e: PlantingEvent): EventRow {
	void g;
	return {
		id: e.id, seedId: e.seed, bedId: e.bed, kind: e.kind, kindLabel: '', seed: '', seedTitle: '', bed: '', date: e.date,
		dateLabel: '', dueLabel: '', overdue: false, today: false, done: e.done, x: e.x, y: e.y, frost: '', hasFrost: false,
		notes: e.notes, spacing: 0
	};
}

/** Unfinished events due today or earlier, oldest first. */
export function dueEvents(g: GardenData): EventRow[] {
	void g;
	return [];
}

/** Unfinished events 1..days ahead, soonest first. */
export function upcomingEvents(g: GardenData, days: number): EventRow[] {
	void g;
	void days;
	return [];
}

/** Rows whose planting puts a frost-tender seed after the first frost. */
export function frostWarnings(g: GardenData): EventRow[] {
	void g;
	return [];
}

/** Non-archived seeds with a verdict, grouped now / soon / late / later (too_early + too_late). Empty groups are kept; callers hide them. */
export function whatToPlant(g: GardenData): WindowGroup[] {
	void g;
	return [];
}

/** Daylight bar geometry for `now` (defaults to the current clock). */
export function daylight(g: GardenData, now?: Date): Daylight {
	void now;
	return { sunrise: g.home.sunrise, sunset: g.home.sunset, length: g.home.length, left: '0%', width: '0%', now: '0%' };
}

export function frost(g: GardenData): FrostInfo {
	void g;
	return { date: '', days: 0, daysText: '' };
}

/** "Bed, Oct 12" for the first unfinished planting of a seed, or '—'. */
export function plannedFor(g: GardenData, seedId: string): string {
	void g;
	void seedId;
	return '—';
}

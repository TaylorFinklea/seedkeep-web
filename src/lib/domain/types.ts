// Domain and view-model types for the Workbench prototype.
// CONTRACT (parent-owned). Workers must not edit this file; ask the parent.

/** Date-only value, `YYYY-MM-DD`. All day math is UTC. */
export type YMD = string;

export type SeedState = 'active' | 'wishlist' | 'saved' | 'archived';
export type Verdict = 'plant_now' | 'plant_soon' | 'late' | 'too_early' | 'too_late';
export type EventKind = 'sowing' | 'transplant' | 'harvest' | 'note';
export type Provider = 'Anthropic' | 'OpenAI';
export type Range = [number, number];

export interface SeedInfo {
	sci: string;
	life: string;
	sun: string;
	frost: string;
	sow: string;
	depth: number | null;
	germ: Range | null;
	mat: Range | null;
	soil: Range | null;
	spacing: number | null;
	row: number | null;
	viability: number | null;
	instr: string;
}

export interface Seed {
	id: string;
	name: string;
	variety: string;
	company: string;
	type: string;
	state: SeedState;
	packets: number;
	year: number | null;
	/** Location id, or '' when not set. */
	loc: string;
	/** Tag ids. */
	tags: string[];
	verdict: Verdict | null;
	window: [YMD, YMD] | null;
	info: SeedInfo | null;
	notes: string;
	/** True when the seed matched the shared catalog (has a verdict). */
	catalog: boolean;
}

export interface Bed {
	id: string;
	name: string;
	desc: string;
	/** Width in feet = number of grid rows. */
	w: number;
	/** Length in feet = number of grid columns. */
	l: number;
}

export interface PlantingEvent {
	id: string;
	bed: string;
	seed: string;
	kind: EventKind;
	date: YMD;
	done: boolean;
	/** Row coordinate in feet; grid row = clamp(floor(x), 0, w-1). */
	x: number;
	/** Column coordinate in feet; grid column = clamp(floor(y), 0, l-1). */
	y: number;
	notes: string;
}

export interface Location {
	id: string;
	name: string;
}

export interface Tag {
	id: string;
	name: string;
}

export interface Contribution {
	id: string;
	seed: string;
	change: string;
	status: string;
	when: string;
	detail: string;
}

export interface Home {
	zip: string;
	zone: string;
	place: string;
	firstFrost: YMD;
	lastFrost: YMD;
	sunrise: string;
	sunset: string;
	length: string;
	/** Minutes after local midnight. */
	riseMin: number;
	setMin: number;
}

export interface JournalNote {
	date: YMD;
	body: string;
}

/** The AI key never leaves memory; only a masked form is kept in state. */
export interface AiKey {
	provider: Provider;
	saved: boolean;
	masked: string;
}

export interface ChatMessage {
	role: 'me' | 'bot';
	text: string;
	/** Sample-tool caption shown above a bot reply (demo label, not a real tool run). */
	tool?: string;
}

export interface ChangelogEntry {
	when: string;
	title: string;
	lines: { k: string; t: string }[];
}

/** Everything selectors read. The Garden store implements this. */
export interface GardenData {
	seeds: Seed[];
	beds: Bed[];
	events: PlantingEvent[];
	locations: Location[];
	tags: Tag[];
	contributions: Contribution[];
	home: Home;
	note: JournalNote;
	key: AiKey;
	thread: ChatMessage[];
}

/** Fields accepted when creating a seed (add flow, CSV import). Strings are coerced. */
export interface SeedInput {
	name?: string;
	variety?: string;
	company?: string;
	type?: string;
	state?: SeedState;
	packets?: number | string | null;
	year?: number | string | null;
	loc?: string;
	tags?: string[];
	verdict?: Verdict | null;
	window?: [YMD, YMD] | null;
	info?: SeedInfo | null;
	notes?: string;
}

// ---------- view models (returned by selectors) ----------

export interface InfoRow {
	label: string;
	value: string;
}

export interface SeedRow {
	id: string;
	name: string;
	variety: string;
	/** "Name — Variety" or "Name". */
	title: string;
	company: string;
	/** Seed type, or 'Untyped'. */
	type: string;
	year: number | null;
	packets: number;
	state: SeedState;
	stateLabel: string;
	loc: string;
	/** Location name, or ''. */
	location: string;
	tags: string[];
	tagText: string;
	verdict: Verdict | null;
	/** e.g. "Plant now", or "Not in the catalog". */
	verdictLabel: string;
	/** e.g. "Now", or "—". */
	verdictShort: string;
	/** CSS colour expression, e.g. `var(--v-plant_now)`, or 'transparent'. */
	dot: string;
	/** e.g. "Oct 1 – Nov 10", or ''. */
	windowLabel: string;
	/** e.g. "32 days left", "Opens in 3 days", "Closed 12 days ago", or ''. */
	daysLabel: string;
	/** Packed three or more seasons before 2026. */
	old: boolean;
	notes: string;
	/** "Company · Year", or "—". */
	provenance: string;
	info: InfoRow[];
	hasInfo: boolean;
	instr: string;
}

export interface EventRow {
	id: string;
	seedId: string;
	bedId: string;
	kind: EventKind;
	kindLabel: string;
	seed: string;
	seedTitle: string;
	bed: string;
	date: YMD;
	dateLabel: string;
	/** "Done", "Today", "Tomorrow", "In 3 days", "4 days late". */
	dueLabel: string;
	overdue: boolean;
	today: boolean;
	done: boolean;
	x: number;
	y: number;
	/** Frost warning sentence, or ''. */
	frost: string;
	hasFrost: boolean;
	notes: string;
	/** Plant spacing in inches, 0 when unknown. */
	spacing: number;
}

export type WindowGroupKey = 'now' | 'soon' | 'late' | 'later';

export interface WindowGroup {
	key: WindowGroupKey;
	label: string;
	rows: SeedRow[];
	count: number;
}

export interface Daylight {
	sunrise: string;
	sunset: string;
	length: string;
	/** Bar geometry as percentages of a 24h day, e.g. "30.7%". */
	left: string;
	width: string;
	now: string;
}

export interface FrostInfo {
	/** "Oct 21" */
	date: string;
	days: number;
	/** "12 days" */
	daysText: string;
}

export interface DateParts {
	dow: string;
	month: string;
	day: number;
	year: number;
	/** "Friday, October 9" */
	long: string;
}

export type StateCounts = Record<SeedState, number>;

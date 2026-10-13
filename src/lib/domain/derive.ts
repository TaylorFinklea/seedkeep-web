// Pure selectors over GardenData. Components call these inside `$derived(...)`.
import { KIND, STATES, STATE_LABEL, VERDICT } from './constants';
import { diff, fmt, plural, today } from './dates';
import { clock } from '$lib/state/clock.svelte';
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
import type { SortKey } from '$lib/state/ui.svelte';

/** Distinct seed types in display order for the Seeds filter. */
export function typeOptions(g: GardenData): string[] {
	return [...new Set(g.seeds.map((seed) => seed.type.trim()).filter(Boolean))].sort((a, b) =>
		a.localeCompare(b, undefined, { sensitivity: 'base' })
	);
}

/** Sort seed rows by the active Seeds column; missing values stay last in either direction. */
export function sortRows(g: GardenData, rows: Seed[], sort: { key: SortKey; dir: 1 | -1 }): Seed[] {
	const order = new Map(g.seeds.map((seed, index) => [seed.id, index]));
	const valueFor = (seed: Seed): string | number | null | undefined =>
		sort.key === 'loc' ? byId(g.locations, seed.loc)?.name : seed[sort.key];
	const missing = (seed: Seed): boolean => {
		const value = valueFor(seed);
		return value == null || (typeof value === 'string' && value.trim() === '');
	};
	const compare = (a: Seed, b: Seed): number => {
		if (missing(a) || missing(b)) return missing(a) === missing(b) ? 0 : missing(a) ? 1 : -1;
		if (sort.key === 'verdict') return VERDICT[a.verdict!].order - VERDICT[b.verdict!].order;
		if (sort.key === 'state')
			return (
				STATES.findIndex((state) => state.key === a.state) -
				STATES.findIndex((state) => state.key === b.state)
			);
		const left = valueFor(a);
		const right = valueFor(b);
		if (typeof left === 'number' && typeof right === 'number') return left - right;
		return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
			sensitivity: 'base',
			numeric: true
		});
	};
	return [...rows].sort((a, b) => {
		const missingA = missing(a);
		const missingB = missing(b);
		if (missingA !== missingB) return missingA ? 1 : -1;
		if (missingA) return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
		return compare(a, b) * sort.dir || ((order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) * sort.dir;
	});
}

export function byId<T extends { id: string }>(
	list: T[],
	id: string | null | undefined
): T | undefined {
	return id ? list.find((x) => x.id === id) : undefined;
}

export function seedTitle(s: Seed | null | undefined): string {
	return s ? (s.variety ? `${s.name} — ${s.variety}` : s.name) : 'Unknown seed';
}

export function isOld(s: Seed): boolean {
	return s.year !== null && s.year !== 0 && Number(today().slice(0, 4)) - s.year >= 3;
}

export function abbr(s: Seed | null | undefined): string {
	if (!s) return '?';
	const value =
		s.name.replace(/[^A-Za-z]/g, '').slice(0, 2) +
		s.variety
			.replace(/[^A-Za-z]/g, '')
			.charAt(0)
			.toLowerCase();
	return value || '?';
}

export function windowLabel(s: Seed): string {
	return s.window ? `${fmt(s.window[0])} – ${fmt(s.window[1])}` : '';
}

export function windowDays(s: Seed): string {
	if (!s.window || !s.verdict) return '';
	const [start, end] = s.window;
	if (s.verdict === 'too_early' || s.verdict === 'plant_soon') {
		const n = diff(start);
		return n > 0 ? `Opens in ${plural(n, 'day')}` : 'Opens today';
	}
	if (s.verdict === 'too_late') return `Closed ${plural(-diff(end), 'day')} ago`;
	const n = diff(end);
	return n > 0 ? `${plural(n, 'day')} left` : n === 0 ? 'Closes today' : 'Closed';
}

export function infoRows(s: Seed): InfoRow[] {
	const info = s.info;
	if (!info) return [];
	const range = (value: [number, number] | null, unit: string): string | null => {
		if (!value) return null;
		return `${value[0] === value[1] ? value[0] : `${value[0]}–${value[1]}`}${unit}`;
	};
	const rows: [string, string | number | null][] = [
		['Scientific name', info.sci],
		['Life cycle', info.life],
		['Sun', info.sun],
		['Frost', info.frost],
		['How to sow', info.sow],
		['Seed depth', info.depth == null ? null : `${info.depth} in`],
		['Germination', range(info.germ, ' days')],
		['Maturity', range(info.mat, ' days')],
		['Soil temperature', range(info.soil, '°F')],
		['Plant spacing', info.spacing ? `${info.spacing} in` : null],
		['Row spacing', info.row ? `${info.row} in` : null],
		['Seed stays good for', info.viability ? plural(info.viability, 'year') : null]
	];
	return rows
		.filter((row): row is [string, string | number] => row[1] != null)
		.map(([label, value]) => ({ label, value: String(value) }));
}

export function seedRow(g: GardenData, s: Seed): SeedRow {
	const verdict = s.verdict ? VERDICT[s.verdict] : undefined;
	const pending =
		!!s.catalogId &&
		!!(
			g as GardenData & { pendingRecommendations?: ReadonlySet<string> }
		).pendingRecommendations?.has(s.catalogId);
	const verdictLabel = pending
		? 'Calculating…'
		: !g.home.hasLocation && !!s.catalogId
			? 'Set your ZIP'
			: (verdict?.label ?? 'Not in the catalog');
	const location = byId(g.locations, s.loc)?.name ?? '';
	const tags = s.tags.map((id) => byId(g.tags, id)?.name).filter((name): name is string => !!name);
	return {
		id: s.id,
		name: s.name,
		variety: s.variety || '',
		title: seedTitle(s),
		company: s.company || '',
		type: s.type || 'Untyped',
		year: s.year,
		packets: s.packets,
		state: s.state,
		stateLabel: STATE_LABEL[s.state],
		loc: s.loc || '',
		location,
		tags,
		tagText: tags.join(', '),
		verdict: s.verdict,
		verdictLabel,
		verdictShort: verdict?.short ?? '—',
		dot: verdict ? `var(--v-${s.verdict})` : 'transparent',
		windowLabel: windowLabel(s),
		daysLabel: windowDays(s),
		old: isOld(s),
		notes: s.notes || '',
		provenance: [s.company, s.year].filter(Boolean).join(' · ') || '—',
		info: infoRows(s),
		hasInfo: !!s.info,
		instr: s.info?.instr || ''
	};
}

export function stateCounts(g: GardenData): StateCounts {
	const counts: StateCounts = { active: 0, wishlist: 0, saved: 0, archived: 0 };
	for (const seed of g.seeds) counts[seed.state]++;
	return counts;
}

export function filterSeeds(
	g: GardenData,
	f: { state: SeedState | 'all'; q: string; type?: string }
): Seed[] {
	const query = f.q.trim().toLowerCase();
	const type = f.type?.trim() ?? '';
	return g.seeds.filter(
		(seed) =>
			(f.state === 'all' || seed.state === f.state) &&
			(!type || seed.type.trim() === type) &&
			(!query ||
				[seed.name, seed.variety, seed.company, seed.type, seed.notes]
					.join(' ')
					.toLowerCase()
					.includes(query))
	);
}

export function eventRow(g: GardenData, e: PlantingEvent): EventRow {
	const seed = byId(g.seeds, e.seed);
	const bed = byId(g.beds, e.bed);
	const days = diff(e.date);
	const frostWarning =
		!e.done && seed?.info?.frost === 'Tender' && days >= diff(g.home.firstFrost)
			? `${seed.name} is frost-tender, and this is planned after the first frost (${fmt(g.home.firstFrost)}).`
			: '';
	return {
		id: e.id,
		seedId: e.seed,
		bedId: e.bed,
		kind: e.kind,
		kindLabel: KIND[e.kind] || e.kind,
		seed: seed?.name ?? 'Unknown seed',
		seedTitle: seedTitle(seed),
		bed: bed?.name ?? '',
		date: e.date,
		dateLabel: fmt(e.date),
		dueLabel: e.done ? 'Done' : dueLabelFor(e.date),
		overdue: !e.done && days < 0,
		today: days === 0,
		done: e.done,
		x: e.x,
		y: e.y,
		frost: frostWarning,
		hasFrost: !!frostWarning,
		notes: e.notes,
		spacing: seed?.info?.spacing ?? 0
	};
}

const dueLabelFor = (date: string): string => {
	const n = diff(date);
	return n === 0
		? 'Today'
		: n < 0
			? `${plural(-n, 'day')} late`
			: n === 1
				? 'Tomorrow'
				: `In ${plural(n, 'day')}`;
};

const sortEvents = (a: PlantingEvent, b: PlantingEvent): number => a.date.localeCompare(b.date);

export function dueEvents(g: GardenData): EventRow[] {
	return g.events
		.filter((event) => !event.done && diff(event.date) <= 0)
		.sort(sortEvents)
		.map((event) => eventRow(g, event));
}

export function upcomingEvents(g: GardenData, days: number): EventRow[] {
	return g.events
		.filter((event) => !event.done && diff(event.date) > 0 && diff(event.date) <= days)
		.sort(sortEvents)
		.map((event) => eventRow(g, event));
}

export function frostWarnings(g: GardenData): EventRow[] {
	return g.events.map((event) => eventRow(g, event)).filter((row) => row.hasFrost);
}

export function whatToPlant(g: GardenData): WindowGroup[] {
	const rows = g.seeds
		.filter((seed) => seed.verdict && seed.state !== 'archived')
		.map((seed) => seedRow(g, seed));
	const make = (verdicts: string[], label: string, key: WindowGroup['key']): WindowGroup => {
		const grouped = rows
			.filter((row) => verdicts.includes(row.verdict ?? ''))
			.sort((a, b) => a.windowLabel.localeCompare(b.windowLabel));
		return { key, label, rows: grouped, count: grouped.length };
	};
	return [
		make(['plant_now'], 'Plant now', 'now'),
		make(['plant_soon'], 'Plant soon', 'soon'),
		make(['late'], 'Closing soon', 'late'),
		make(['too_early', 'too_late'], 'Later and missed', 'later')
	];
}

export function daylight(g: GardenData, now = clock.now): Daylight {
	const minutes = now.getHours() * 60 + now.getMinutes();
	const percent = (value: number): string => `${((value / 1440) * 100).toFixed(1)}%`;
	return {
		sunrise: g.home.sunrise,
		sunset: g.home.sunset,
		length: g.home.length,
		left: percent(g.home.riseMin),
		width: g.home.sunrise === 'Polar day' ? '100%' : percent(g.home.setMin - g.home.riseMin),
		now: percent(minutes)
	};
}

export function frost(g: GardenData): FrostInfo {
	if (!g.home.firstFrost) return { date: 'Unknown', days: 0, daysText: 'Unknown' };
	const days = diff(g.home.firstFrost);
	return { date: fmt(g.home.firstFrost), days, daysText: plural(days, 'day') };
}

export function plannedFor(g: GardenData, seedId: string): string {
	const event = g.events.find((candidate) => candidate.seed === seedId && !candidate.done);
	if (!event) return '—';
	return `${byId(g.beds, event.bed)?.name ?? ''}, ${fmt(event.date)}`;
}

import type {
	Bed,
	Home,
	JournalNote,
	Location,
	PlantingEvent,
	Seed,
	SeedInfo,
	SeedPhoto,
	Tag,
	Verdict,
	YMD
} from '$lib/domain/types';
import type { CatalogDetail, HouseholdDetail } from './index';

export function mapSeed(r: any): Seed {
	return {
		id: r.id,
		name: r.custom_name || 'Untitled seed',
		variety: r.custom_variety ?? '',
		company: r.custom_company ?? '',
		type: r.custom_type || 'Untyped',
		state: r.state,
		packets: r.packet_count ?? 1,
		year: r.year_packed ?? null,
		loc: r.location_id ?? '',
		tags: r.tag_ids ?? [],
		verdict: null,
		window: null,
		info: null,
		notes: r.notes ?? '',
		catalog: false,
		version: r.version ?? 1,
		catalogId: r.catalog_id ?? null,
		source: r.source ?? 'store'
	};
}
export function mapSeedInput(s: Partial<Seed>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const has = (k: keyof Seed) => Object.prototype.hasOwnProperty.call(s, k);
	if (has('catalogId')) out.catalog_id = s.catalogId;
	if (has('state')) out.state = s.state;
	if (has('packets')) out.packet_count = s.packets;
	if (has('loc')) out.location_id = s.loc || null;
	if (has('year')) out.year_packed = s.year;
	if (has('source')) out.source = s.source;
	if (has('name')) out.custom_name = s.name;
	if (has('variety')) out.custom_variety = s.variety;
	if (has('company')) out.custom_company = s.company;
	if (has('type')) out.custom_type = s.type === 'Untyped' || !s.type ? null : s.type;
	if (has('notes')) out.notes = s.notes;
	if (has('tags')) out.tag_ids = s.tags;
	return out;
}
export function mapLocation(r: any): Location {
	return { id: r.id, name: r.name, version: r.version ?? 1 };
}
export function mapTag(r: any): Tag {
	return { id: r.id, name: r.name, version: r.version ?? 1 };
}
export function mapBed(r: any): Bed {
	return {
		id: r.id,
		name: r.name,
		desc: r.description ?? '',
		w: Number(r.width_feet ?? 1),
		l: Number(r.length_feet ?? 1),
		version: r.version ?? 1
	};
}
export function mapBedInput(b: Partial<Bed>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if ('name' in b) out.name = b.name;
	if ('desc' in b) out.description = b.desc;
	if ('w' in b) out.width_feet = b.w;
	if ('l' in b) out.length_feet = b.l;
	return out;
}
export function mapEvent(r: any): PlantingEvent {
	return {
		id: r.id,
		bed: r.bed_id ?? '',
		seed: r.seed_id ?? '',
		kind: r.kind,
		date: r.planned_for,
		done: r.completed_at != null,
		x: Number(r.x_feet ?? 0),
		y: Number(r.y_feet ?? 0),
		notes: r.notes ?? '',
		version: r.version ?? 1
	};
}
export function mapEventInput(e: Partial<PlantingEvent>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if ('bed' in e) out.bed_id = e.bed || null;
	if ('seed' in e) out.seed_id = e.seed || null;
	if ('kind' in e) out.kind = e.kind;
	if ('date' in e) out.planned_for = e.date;
	if ('done' in e) out.completed_at = e.done ? Date.now() : null;
	if ('x' in e) out.x_feet = e.x ?? null;
	if ('y' in e) out.y_feet = e.y ?? null;
	if ('notes' in e) out.notes = e.notes;
	return out;
}

const range = (
	lo: number | null | undefined,
	hi: number | null | undefined
): [number, number] | null => (lo == null || hi == null ? null : [lo, hi]);
export function mapCatalog(r: any): CatalogDetail {
	const sun: Record<string, string> = {
		full: 'Full sun',
		partial: 'Partial shade',
		shade: 'Shade'
	};
	const frost: Record<string, string> = {
		tender: 'Tender',
		half_hardy: 'Half-hardy',
		hardy: 'Hardy'
	};
	const method: Record<string, string> = {
		direct: 'Direct sow',
		transplant: 'Transplant',
		either: 'Direct sow or transplant'
	};
	const info: SeedInfo = {
		sci: r.scientific_name ?? '',
		life: r.life_cycle ?? '',
		sun: sun[r.sun_requirement] ?? '',
		frost: frost[r.frost_tolerance] ?? '',
		sow: method[r.sow_method] ?? '',
		depth: r.seed_depth_inches ?? null,
		germ: range(r.days_to_germinate_min, r.days_to_germinate_max),
		mat: range(r.days_to_maturity_min, r.days_to_maturity_max),
		soil: range(r.soil_temp_min_f, r.soil_temp_max_f),
		spacing: r.plant_spacing_inches ?? null,
		row: r.row_spacing_inches ?? null,
		viability: r.viability_years ?? null,
		instr: r.instructions ?? ''
	};
	return {
		id: r.id,
		name: r.common_name ?? '',
		variety: r.variety ?? '',
		company: r.company ?? '',
		type: '',
		info
	};
}
export function mapRecommendation(r: any): {
	catalogSeedId: string;
	verdict: Verdict | null;
	window: [YMD, YMD] | null;
} {
	const verdicts: Record<string, Verdict> = {
		plant_now: 'plant_now',
		plant_soon: 'plant_soon',
		late: 'late',
		too_early: 'too_early',
		too_late: 'too_late'
	};
	const range = r.recommendedRange;
	return {
		catalogSeedId: r.catalogSeedId,
		verdict: verdicts[r.verdict] ?? null,
		window: range?.start && range?.end ? [range.start, range.end] : null
	};
}
export function mapHousehold(r: any): HouseholdDetail {
	const loc = r.location;
	const home: Home = loc
		? {
				zip: loc.zip,
				zone: loc.usdaZone ?? '',
				place: '',
				firstFrost: projectFrost(loc.avgFirstFrost),
				lastFrost: projectFrost(loc.avgLastFrost),
				sunrise: '',
				sunset: '',
				length: '',
				riseMin: 0,
				setMin: 0,
				hasLocation: true,
				daylight: 'unknown',
				latitude: loc.latitude ?? null,
				longitude: loc.longitude ?? null
			}
		: {
				zip: '',
				zone: '',
				place: '',
				firstFrost: '',
				lastFrost: '',
				sunrise: '',
				sunset: '',
				length: '',
				riseMin: 0,
				setMin: 0,
				hasLocation: false,
				daylight: 'unknown',
				latitude: null,
				longitude: null
			};
	return { id: r.id, name: r.name, home };
}
function projectFrost(mmdd: string | null | undefined): YMD {
	if (!mmdd || !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(mmdd)) return '';
	const now = new Date();
	const year = now.getFullYear();
	const [m, d] = mmdd.split('-').map(Number);
	let target = new Date(year, m - 1, d);
	if (target.getTime() < new Date(year, now.getMonth(), now.getDate()).getTime())
		target = new Date(year + 1, m - 1, d);
	return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}
export function mapJournal(r: any): JournalNote {
	return { date: r.occurredOn, body: r.body };
}
export function mapPhoto(r: any): SeedPhoto {
	return {
		id: r.id,
		seedId: r.seed_id,
		role: r.role,
		width: r.width ?? null,
		height: r.height ?? null,
		capturedAt: r.captured_at
	};
}

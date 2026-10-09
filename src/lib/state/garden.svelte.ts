// The in-memory sample household and its actions. Reload resets to the sample.
// CONTRACT — fields and signatures are parent-owned; action BODIES are owned by Luna (Phase 1).
//
// Runes rules (all workers):
// - Fields are declared with $state; never spread or destructure the store into snapshots.
// - Actions are arrow-function fields (safe to pass as callbacks).
// - Edit by id through actions; never bind inputs to derived row copies.
// - Actions do not touch UI state. Cascades into UI state (selection, open detail,
//   brush, selected event) live in `commands.ts`.
import { sampleData } from '$lib/domain/sample';
import { rowsToSeedInputs, toCSV, parseCSV } from '$lib/domain/csv';
import type {
	AiKey,
	Bed,
	ChatMessage,
	Contribution,
	GardenData,
	Home,
	JournalNote,
	Location,
	PlantingEvent,
	Provider,
	Seed,
	SeedInput,
	Tag
} from '$lib/domain/types';

export class Garden implements GardenData {
	// Each instance gets its own deep copy of the sample (tests create fresh instances).
	#d = sampleData();
	seeds = $state<Seed[]>(this.#d.seeds);
	beds = $state<Bed[]>(this.#d.beds);
	events = $state<PlantingEvent[]>(this.#d.events);
	locations = $state<Location[]>(this.#d.locations);
	tags = $state<Tag[]>(this.#d.tags);
	contributions = $state<Contribution[]>(this.#d.contributions);
	home = $state<Home>(this.#d.home);
	note = $state<JournalNote>(this.#d.note);
	key = $state<AiKey>(this.#d.key);
	thread = $state<ChatMessage[]>(this.#d.thread);

	/** Unique id with a prefix, e.g. uid('s'). */
	uid = (prefix = 'n'): string => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

	/** Create a seed (prepended). Blank name → 'Untitled seed'; blank type → 'Untyped'. Returns the new seed. */
	addSeed = (input: SeedInput): Seed => {
		const state = input.state ?? 'active';
		const defaultPackets = state === 'wishlist' ? 0 : 1;
		const rawPackets = input.packets == null || String(input.packets).trim() === '' ? NaN : Number(input.packets);
		const packets = Number.isInteger(rawPackets) && rawPackets >= 0 ? rawPackets : defaultPackets;
		const rawYear = input.year == null ? '' : String(input.year).trim();
		const year = /^\d{4}$/.test(rawYear) && Number(rawYear) > 0 ? Number(rawYear) : null;
		const seed: Seed = {
			id: this.uid('s'), name: input.name?.trim() || 'Untitled seed', variety: input.variety?.trim() || '',
			company: input.company?.trim() || '', type: input.type?.trim() || 'Untyped', state, packets, year,
			loc: input.loc || '', tags: [...(input.tags ?? [])], verdict: input.verdict ?? null,
			window: input.window ?? null, info: input.info ?? null, notes: input.notes ?? '', catalog: !!input.verdict
		};
		this.seeds = [seed, ...this.seeds];
		return seed;
	};

	/** Shallow-merge a patch into one seed. Unknown id is a no-op. */
	updateSeed = (id: string, patch: Partial<Omit<Seed, 'id'>>): void => {
		this.seeds = this.seeds.map((seed) => seed.id === id ? { ...seed, ...patch } : seed);
	};

	bulkUpdate = (ids: string[], patch: Partial<Omit<Seed, 'id'>>): void => {
		const selected = new Set(ids);
		this.seeds = this.seeds.map((seed) => selected.has(seed.id) ? { ...seed, ...patch } : seed);
	};

	/** Add a tag to each seed that does not already have it. */
	tagSeeds = (ids: string[], tagId: string): void => {
		const selected = new Set(ids);
		this.seeds = this.seeds.map((seed) => selected.has(seed.id) && !seed.tags.includes(tagId)
			? { ...seed, tags: [...seed.tags, tagId] } : seed);
	};

	/** Remove seeds and every planting event that references them. */
	removeSeeds = (ids: string[]): void => {
		const removed = new Set(ids);
		this.seeds = this.seeds.filter((seed) => !removed.has(seed.id));
		this.events = this.events.filter((event) => !removed.has(event.seed));
	};

	/** Create an unfinished event with empty notes. Returns it. */
	addEvent = (input: Omit<PlantingEvent, 'id' | 'done' | 'notes'> & Partial<Pick<PlantingEvent, 'done' | 'notes'>>): PlantingEvent => {
		const event: PlantingEvent = { ...input, id: this.uid('e'), done: input.done ?? false, notes: input.notes ?? '' };
		this.events = [...this.events, event];
		return event;
	};

	updateEvent = (id: string, patch: Partial<Omit<PlantingEvent, 'id'>>): void => {
		this.events = this.events.map((event) => event.id === id ? { ...event, ...patch } : event);
	};

	removeEvent = (id: string): void => {
		this.events = this.events.filter((event) => event.id !== id);
	};

	toggleDone = (id: string): void => {
		this.events = this.events.map((event) => event.id === id ? { ...event, done: !event.done } : event);
	};

	/** Add a bed. Caller validates; name defaults to 'New bed'. Returns it. */
	addBed = (input: { name: string; desc?: string; w: number; l: number }): Bed => {
		const bed: Bed = { id: this.uid('b'), name: input.name.trim() || 'New bed', desc: input.desc ?? '', w: input.w, l: input.l };
		this.beds = [...this.beds, bed];
		return bed;
	};

	/** Trimmed, non-empty, not a case-insensitive duplicate → new location; otherwise null. */
	addLocation = (name: string): Location | null => {
		const trimmed = name.trim();
		if (!trimmed || this.locations.some((location) => location.name.toLowerCase() === trimmed.toLowerCase())) return null;
		const location: Location = { id: this.uid('loc'), name: trimmed };
		this.locations = [...this.locations, location];
		return location;
	};

	/** Remove a location and clear `loc` on seeds that used it. */
	removeLocation = (id: string): void => {
		this.locations = this.locations.filter((location) => location.id !== id);
		this.seeds = this.seeds.map((seed) => seed.loc === id ? { ...seed, loc: '' } : seed);
	};

	/** Trimmed, non-empty, not a case-insensitive duplicate → new tag; otherwise null. */
	addTag = (name: string): Tag | null => {
		const trimmed = name.trim();
		if (!trimmed || this.tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())) return null;
		const tag: Tag = { id: this.uid('t'), name: trimmed };
		this.tags = [...this.tags, tag];
		return tag;
	};

	/** Remove a tag and strip it from every seed. */
	removeTag = (id: string): void => {
		this.tags = this.tags.filter((tag) => tag.id !== id);
		this.seeds = this.seeds.map((seed) => seed.tags.includes(id) ? { ...seed, tags: seed.tags.filter((tagId) => tagId !== id) } : seed);
	};

	/** Store a 5-digit ZIP. Returns false (no change) for anything else. Does not change zone, frost or windows. */
	saveZip = (zip: string): boolean => {
		if (!/^\d{5}$/.test(zip)) return false;
		this.home = { ...this.home, zip };
		return true;
	};

	/** Keep only a masked form (first 6 + 8 bullets + last 4) of a non-empty key. Never persisted. */
	saveKey = (raw: string): boolean => {
		const key = raw.trim();
		if (!key) return false;
		this.key = { ...this.key, saved: true, masked: `${key.slice(0, 6)}••••••••${key.slice(-4)}` };
		return true;
	};

	removeKey = (): void => { this.key = { ...this.key, saved: false, masked: '' }; };

	setProvider = (p: Provider): void => {
		this.key = { ...this.key, provider: p };
	};

	/** Import CSV text. Returns the number of seeds added and the header columns that were not imported. */
	importCSV = (text: string): { added: number; ignored: string[] } => {
		const parsed = rowsToSeedInputs(parseCSV(text));
		for (const input of [...parsed.inputs].reverse()) this.addSeed(input);
		return { added: parsed.inputs.length, ignored: parsed.ignored };
	};

	exportCSV = (): string => toCSV(this);

	/** Record a catalog correction locally (status "Saved locally (demo)"). */
	addContribution = (seedId: string, field: string, value: string): Contribution | null => {
		const seed = this.seeds.find((candidate) => candidate.id === seedId);
		if (!seed || !field.trim() || !value.trim()) return null;
		const contribution: Contribution = {
			id: this.uid('c'), seed: seed.variety ? `${seed.name} — ${seed.variety}` : seed.name,
			change: `${field.trim()} → ${value.trim()}`, status: 'Saved locally (demo)', when: 'Just now', detail: 'Saved locally in this prototype.'
		};
		this.contributions = [contribution, ...this.contributions];
		return contribution;
	};
}

/** The single store instance shared by every route. */
export const garden = new Garden();

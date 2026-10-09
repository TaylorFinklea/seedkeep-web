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
		void input;
		throw new Error('addSeed: not implemented');
	};

	/** Shallow-merge a patch into one seed. Unknown id is a no-op. */
	updateSeed = (id: string, patch: Partial<Omit<Seed, 'id'>>): void => {
		void id;
		void patch;
	};

	bulkUpdate = (ids: string[], patch: Partial<Omit<Seed, 'id'>>): void => {
		void ids;
		void patch;
	};

	/** Add a tag to each seed that does not already have it. */
	tagSeeds = (ids: string[], tagId: string): void => {
		void ids;
		void tagId;
	};

	/** Remove seeds and every planting event that references them. */
	removeSeeds = (ids: string[]): void => {
		void ids;
	};

	/** Create an unfinished event with empty notes. Returns it. */
	addEvent = (input: Omit<PlantingEvent, 'id' | 'done' | 'notes'> & Partial<Pick<PlantingEvent, 'done' | 'notes'>>): PlantingEvent => {
		void input;
		throw new Error('addEvent: not implemented');
	};

	updateEvent = (id: string, patch: Partial<Omit<PlantingEvent, 'id'>>): void => {
		void id;
		void patch;
	};

	removeEvent = (id: string): void => {
		void id;
	};

	toggleDone = (id: string): void => {
		void id;
	};

	/** Add a bed. Caller validates; name defaults to 'New bed'. Returns it. */
	addBed = (input: { name: string; desc?: string; w: number; l: number }): Bed => {
		void input;
		throw new Error('addBed: not implemented');
	};

	/** Trimmed, non-empty, not a case-insensitive duplicate → new location; otherwise null. */
	addLocation = (name: string): Location | null => {
		void name;
		return null;
	};

	/** Remove a location and clear `loc` on seeds that used it. */
	removeLocation = (id: string): void => {
		void id;
	};

	/** Trimmed, non-empty, not a case-insensitive duplicate → new tag; otherwise null. */
	addTag = (name: string): Tag | null => {
		void name;
		return null;
	};

	/** Remove a tag and strip it from every seed. */
	removeTag = (id: string): void => {
		void id;
	};

	/** Store a 5-digit ZIP. Returns false (no change) for anything else. Does not change zone, frost or windows. */
	saveZip = (zip: string): boolean => {
		void zip;
		return false;
	};

	/** Keep only a masked form (first 6 + 8 bullets + last 4) of a non-empty key. Never persisted. */
	saveKey = (raw: string): boolean => {
		void raw;
		return false;
	};

	removeKey = (): void => {};

	setProvider = (p: Provider): void => {
		void p;
	};

	/** Import CSV text. Returns the number of seeds added and the header columns that were not imported. */
	importCSV = (text: string): { added: number; ignored: string[] } => {
		void text;
		return { added: 0, ignored: [] };
	};

	exportCSV = (): string => '';

	/** Record a catalog correction locally (status "Saved locally (demo)"). */
	addContribution = (seedId: string, field: string, value: string): Contribution | null => {
		void seedId;
		void field;
		void value;
		return null;
	};
}

/** The single store instance shared by every route. */
export const garden = new Garden();

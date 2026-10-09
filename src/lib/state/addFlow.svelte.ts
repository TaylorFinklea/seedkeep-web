// Add-seed flow controller (manual / photo / scan). Demo only: photos stay
// local and are never read; scans never touch the camera.
// CONTRACT — fields/signatures parent-owned; BODIES owned by Luna (Phase 5).
import type { Seed, SeedInput, SeedState } from '$lib/domain/types';
import type { AddMode } from './ui.svelte';

export interface AddForm {
	name: string;
	variety: string;
	company: string;
	type: string;
	year: string;
	packets: string;
	state: SeedState;
	loc: string;
	notes: string;
}

export type AddFieldKey = Exclude<keyof AddForm, 'notes'>;

export interface AddField {
	key: AddFieldKey;
	label: string;
	placeholder: string;
	/** Present for select fields (state, loc). */
	options?: { value: string; label: string }[];
}

export class AddFlow {
	form = $state<AddForm>({ name: '', variety: '', company: '', type: '', year: '2026', packets: '1', state: 'active', loc: '', notes: '' });
	/** Catalog fields carried from a simulated extraction or scan into addSeed. */
	extra = $state<Pick<SeedInput, 'verdict' | 'window' | 'info'>>({});
	/** Local object URLs for up to two dropped/picked images (revoked on reset/close). */
	files = $state<string[]>([]);
	phase = $state<'idle' | 'reading' | 'scanning'>('idle');
	over = $state(false);
	banner = $state('');
	/** Field-level validation message shown on save, or ''. */
	error = $state('');

	get mode(): AddMode {
		return 'manual';
	}

	/** Field definitions in display order (Name, Variety, Seed company, Type, Year packed, Packets, Status, Stored in). */
	get fields(): AddField[] {
		return [];
	}

	get canSave(): boolean {
		return false;
	}

	/** Blank form, mode from ui.addMode; cancels timers and revokes URLs. Called when the modal opens. */
	reset = (): void => {};

	setMode = (mode: AddMode): void => {
		void mode;
	};

	setField = (key: keyof AddForm, value: string): void => {
		void key;
		void value;
	};

	onDragOver = (e: DragEvent): void => {
		void e;
	};

	onDragLeave = (): void => {};

	onDrop = (e: DragEvent): void => {
		void e;
	};

	/** Open a file picker (image/*, multiple) and handle the chosen files. */
	pickFiles = (): void => {};

	/** Simulate an extraction without a photo. */
	useSample = (): void => {};

	/** Simulate a barcode scan (no camera). */
	startScan = (): void => {};

	/** Validate, add the seed, close, toast, and open its detail. Returns the seed or null when invalid. */
	save = (): Seed | null => null;

	/** Close the modal (ui.close('add')) and dispose. */
	close = (): void => {};

	/**
	 * Cancel timers (bump the generation token), revoke object URLs and clear `phase`/`over`,
	 * WITHOUT touching the overlay stack. The view calls this on every open→closed
	 * transition (Escape, backdrop, Close) and on destroy.
	 */
	dispose = (): void => {};
}

export const addFlow = new AddFlow();

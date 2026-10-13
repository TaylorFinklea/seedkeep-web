// Add-seed form state; packet photo and barcode modes are disabled in M1.
// CONTRACT — fields/signatures parent-owned; BODIES owned by Luna (Phase 5).
import type { Seed, SeedInput, SeedState } from '$lib/domain/types';
import type { AddMode } from './ui.svelte';
import { garden } from './garden.svelte';
import { ui } from './ui.svelte';
import { commands } from './commands';
import { STATES } from '$lib/domain/constants';
import { FEATURES } from '$lib/config';
import { clock } from '$lib/state/clock.svelte';

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
	form = $state<AddForm>({
		name: '',
		variety: '',
		company: '',
		type: '',
		year: clock.today.slice(0, 4),
		packets: '1',
		state: 'active',
		loc: '',
		notes: ''
	});
	/** Optional catalog fields carried into addSeed when a future real flow is enabled. */
	extra = $state<Pick<SeedInput, 'verdict' | 'window' | 'info'>>({});
	/** Reserved for packet attachments; remains empty while photo mode is disabled. */
	files = $state<string[]>([]);
	phase = $state<'idle' | 'reading' | 'scanning'>('idle');
	over = $state(false);
	banner = $state('');
	/** Field-level validation message shown on save, or ''. */
	error = $state('');

	get mode(): AddMode {
		return ui.addMode;
	}

	/** Field definitions in display order (Name, Variety, Seed company, Type, Year packed, Packets, Status, Stored in). */
	get fields(): AddField[] {
		return [
			{ key: 'name', label: 'Name', placeholder: 'Tomato' },
			{ key: 'variety', label: 'Variety', placeholder: 'Cherokee Purple' },
			{ key: 'company', label: 'Seed company', placeholder: 'Baker Creek' },
			{ key: 'type', label: 'Type', placeholder: 'Tomato, herb, flower…' },
			{ key: 'year', label: 'Year packed', placeholder: '2026' },
			{ key: 'packets', label: 'Packets', placeholder: '1' },
			{
				key: 'state',
				label: 'Status',
				placeholder: '',
				options: STATES.map((state) => ({ value: state.key, label: state.label }))
			},
			{
				key: 'loc',
				label: 'Stored in',
				placeholder: '',
				options: [
					{ value: '', label: 'Not set' },
					...garden.locations.map((location) => ({ value: location.id, label: location.name }))
				]
			}
		];
	}

	get canSave(): boolean {
		return !!this.form.name.trim();
	}

	/** Blank form, mode from ui.addMode; cancels timers and revokes URLs. Called when the modal opens. */
	reset = (): void => {
		this.dispose();
		this.form = {
			name: '',
			variety: '',
			company: '',
			type: '',
			year: clock.today.slice(0, 4),
			packets: '1',
			state: 'active',
			loc: '',
			notes: ''
		};
		this.extra = {};
		this.phase = 'idle';
		this.over = false;
		this.banner = '';
		this.error = '';
	};

	setMode = (mode: AddMode): void => {
		if ((mode === 'photo' && !FEATURES.packetPhoto) || (mode === 'scan' && !FEATURES.barcodeScan))
			mode = 'manual';
		if (ui.addMode === mode) return;
		this.#revokeFiles();
		this.phase = 'idle';
		this.over = false;
		if (!Object.keys(this.extra).length) this.banner = '';
		this.error = '';
		ui.addMode = mode;
	};

	setField = (key: keyof AddForm, value: string): void => {
		this.form = { ...this.form, [key]: value };
		this.error = '';
	};

	onDragOver = (e: DragEvent): void => {
		if (!FEATURES.packetPhoto) return;
		e.preventDefault();
		this.over = true;
	};

	onDragLeave = (): void => {
		this.over = false;
	};

	onDrop = (e: DragEvent): void => {
		if (!FEATURES.packetPhoto) return;
		e.preventDefault();
		this.over = false;
	};

	/** Open a file picker (image/*, multiple) and handle the chosen files. */
	pickFiles = (): void => {
		if (!FEATURES.packetPhoto) return;
		// Packet uploads are unavailable in M1.
	};

	/** Compatibility no-op while packet photo is disabled. */
	useSample = (): void => undefined;

	/** Compatibility no-op while barcode scanning is disabled. */
	startScan = (): void => undefined;

	/** Validate, add the seed, close, toast, and open its detail. Returns the seed or null when invalid. */
	save = async (): Promise<Seed | null> => {
		const year = this.form.year.trim(),
			packets = this.form.packets.trim();
		if (!this.form.name.trim()) {
			this.error = 'Name is required.';
			return null;
		}
		if (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100)) {
			this.error = 'Year must be blank or between 1900 and 2100.';
			return null;
		}
		if (packets && (!/^\d+$/.test(packets) || Number(packets) > 999)) {
			this.error = 'Packets must be blank or a whole number from 0 to 999.';
			return null;
		}
		try {
			const seed = await garden.addSeed({
				...this.form,
				...this.extra,
				year: year || null,
				packets: packets || null
			});
			this.close();
			ui.showToast(`Added ${seed.variety ? `${seed.name} — ${seed.variety}` : seed.name}.`);
			void commands.openSeed(seed.id);
			return seed;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Could not add seed.';
			ui.showToast(this.error);
			return null;
		}
	};

	/** Close the modal (ui.close('add')) and dispose. */
	close = (): void => {
		ui.close('add');
		this.dispose();
	};

	/** Clear attachment state without touching the overlay stack. */
	dispose = (): void => {
		this.#revokeFiles();
		this.phase = 'idle';
		this.over = false;
	};
	#revokeFiles(): void {
		for (const url of this.files) URL.revokeObjectURL(url);
		this.files = [];
	}
}

export const addFlow = new AddFlow();

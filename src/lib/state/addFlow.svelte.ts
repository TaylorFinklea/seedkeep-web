// Add-seed flow controller (manual / photo / scan). Demo only: photos stay
// local and are never read; scans never touch the camera.
// CONTRACT — fields/signatures parent-owned; BODIES owned by Luna (Phase 5).
import type { Seed, SeedInput, SeedState } from '$lib/domain/types';
import type { AddMode } from './ui.svelte';
import { garden } from './garden.svelte';
import { ui } from './ui.svelte';
import { commands } from './commands';
import { SAMPLE_CATALOG_HIT, SAMPLE_EXTRACT } from '$lib/domain/sample';
import { STATES } from '$lib/domain/constants';

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

	#timers = new Set<ReturnType<typeof setTimeout>>();
	#generation = 0;
	#picker: HTMLInputElement | null = null;
	get mode(): AddMode { return ui.addMode; }

	/** Field definitions in display order (Name, Variety, Seed company, Type, Year packed, Packets, Status, Stored in). */
	get fields(): AddField[] {
		return [
			{ key: 'name', label: 'Name', placeholder: 'Tomato' },
			{ key: 'variety', label: 'Variety', placeholder: 'Cherokee Purple' },
			{ key: 'company', label: 'Seed company', placeholder: 'Baker Creek' },
			{ key: 'type', label: 'Type', placeholder: 'Tomato, herb, flower…' },
			{ key: 'year', label: 'Year packed', placeholder: '2026' },
			{ key: 'packets', label: 'Packets', placeholder: '1' },
			{ key: 'state', label: 'Status', placeholder: '', options: STATES.map((state) => ({ value: state.key, label: state.label })) },
			{ key: 'loc', label: 'Stored in', placeholder: '', options: [{ value: '', label: 'Not set' }, ...garden.locations.map((location) => ({ value: location.id, label: location.name }))] }
		];
	}

	get canSave(): boolean {
		return !!this.form.name.trim();
	}

	/** Blank form, mode from ui.addMode; cancels timers and revokes URLs. Called when the modal opens. */
	reset = (): void => {
		this.dispose();
		this.form = { name: '', variety: '', company: '', type: '', year: '2026', packets: '1', state: 'active', loc: '', notes: '' };
		this.extra = {}; this.phase = 'idle'; this.over = false; this.banner = ''; this.error = '';
	};

	setMode = (mode: AddMode): void => {
		if (ui.addMode === mode) return;
		this.#cancelTimers(); this.#revokeFiles(); this.phase = 'idle'; this.over = false; if (!Object.keys(this.extra).length) this.banner = ''; this.error = '';
		ui.addMode = mode;
	};

	setField = (key: keyof AddForm, value: string): void => {
		this.form = { ...this.form, [key]: value };
		this.error = '';
	};

	onDragOver = (e: DragEvent): void => {
		e.preventDefault(); this.over = true;
	};

	onDragLeave = (): void => { this.over = false; };

	onDrop = (e: DragEvent): void => {
		e.preventDefault(); this.over = false; this.#handleFiles(e.dataTransfer?.files ?? null);
	};

	/** Open a file picker (image/*, multiple) and handle the chosen files. */
	pickFiles = (): void => {
		const input = document.createElement('input'); this.#picker = input;
		input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.hidden = true;
		input.addEventListener('change', () => { if (this.#picker !== input) return; this.#picker = null; input.remove(); this.#handleFiles(input.files); }, { once: true });
		input.addEventListener('cancel', () => { if (this.#picker === input) this.#picker = null; input.remove(); }, { once: true });
		document.body.append(input); input.click();
	};

	/** Simulate an extraction without a photo. */
	useSample = (): void => { this.#beginFill('reading', 1400, SAMPLE_EXTRACT, 'Sample extraction (demo). Your photo stayed in this browser and was not read. Check the details before you save.'); };

	/** Simulate a barcode scan (no camera). */
	startScan = (): void => { this.#beginFill('scanning', 1600, SAMPLE_CATALOG_HIT, `Simulated scan (demo): sample catalog match for barcode ${SAMPLE_CATALOG_HIT.barcode}. Growing details are filled in.`); };

	/** Validate, add the seed, close, toast, and open its detail. Returns the seed or null when invalid. */
	save = (): Seed | null => {
		const year = this.form.year.trim(), packets = this.form.packets.trim();
		if (!this.form.name.trim()) { this.error = 'Name is required.'; return null; }
		if (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100)) { this.error = 'Year must be blank or between 1900 and 2100.'; return null; }
		if (packets && (!/^\d+$/.test(packets) || Number(packets) > 999)) { this.error = 'Packets must be blank or a whole number from 0 to 999.'; return null; }
		const seed = garden.addSeed({ ...this.form, ...this.extra, year: year || null, packets: packets || null });
		this.close(); ui.showToast(`Added ${seed.variety ? `${seed.name} — ${seed.variety}` : seed.name}.`); void commands.openSeed(seed.id); return seed;
	};

	/** Close the modal (ui.close('add')) and dispose. */
	close = (): void => { ui.close('add'); this.dispose(); };

	/**
	 * Cancel timers (bump the generation token), revoke object URLs and clear `phase`/`over`,
	 * WITHOUT touching the overlay stack. The view calls this on every open→closed
	 * transition (Escape, backdrop, Close) and on destroy.
	 */
	dispose = (): void => {
		this.#cancelTimers(); this.#revokeFiles(); this.phase = 'idle'; this.over = false;
		this.#picker?.remove(); this.#picker = null;
	};

	#cancelTimers(): void { this.#generation++; for (const timer of this.#timers) clearTimeout(timer); this.#timers.clear(); }
	#revokeFiles(): void { for (const url of this.files) URL.revokeObjectURL(url); this.files = []; }
	#handleFiles(list: FileList | null): void {
		this.#cancelTimers(); this.#revokeFiles();
		const files = Array.from(list ?? []).filter((file) => file.type.startsWith('image/')).slice(0, 2);
		if (!files.length) { this.phase = 'idle'; this.error = 'Drop JPG or PNG images.'; ui.showToast(this.error); return; }
		this.files = files.map((file) => URL.createObjectURL(file));
		this.#beginFill('reading', 1400, SAMPLE_EXTRACT, 'Sample extraction (demo). Your photo stayed in this browser and was not read. Check the details before you save.', true);
	}
	#beginFill(phase: 'reading' | 'scanning', delay: number, data: SeedInput, banner: string, keepFiles = false): void {
		this.#cancelTimers(); if (!keepFiles) this.#revokeFiles();
		const generation = this.#generation; this.phase = phase; this.over = false; this.error = '';
		const timer = setTimeout(() => {
			this.#timers.delete(timer);
			if (generation !== this.#generation) return;
			const { name, variety, company, type, year, packets, state, loc, notes, verdict, window, info } = data;
			this.form = { name: name ?? '', variety: variety ?? '', company: company ?? '', type: type ?? '', year: String(year ?? ''), packets: String(packets ?? ''), state: state ?? 'active', loc: loc ?? '', notes: notes ?? '' };
			this.extra = { verdict, window, info }; this.phase = 'idle'; ui.addMode = 'manual'; this.banner = banner;
		}, delay);
		this.#timers.add(timer);
	}
}

export const addFlow = new AddFlow();

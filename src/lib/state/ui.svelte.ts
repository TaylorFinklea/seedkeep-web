// UI state shared across routes: overlays, toast, theme, and per-view state that
// must survive navigation (Seeds filters/selection/detail, Garden bed/brush).
// CONTRACT — fields and signatures are parent-owned; method BODIES are owned by Luna (Phase 1).
import { MediaQuery } from 'svelte/reactivity';
import type { SeedState } from '$lib/domain/types';

export type Theme = 'light' | 'dark';

/**
 * Overlay layers, topmost last. Escape closes only the topmost layer.
 * 'detail' is the seed detail shown as an overlay at narrow widths only.
 */
export type OverlayId = 'palette' | 'add' | 'shortcuts' | 'sprout' | 'detail';

/**
 * Overlays that are modal (trap focus, inert background). 'sprout' is a deliberate
 * non-modal exception: a side panel the user can keep open while working.
 */
export const MODAL_OVERLAYS: OverlayId[] = ['palette', 'add', 'shortcuts', 'detail'];

export const OVERLAY_LABEL: Record<OverlayId, string> = {
	palette: 'The command menu',
	add: 'Add seed',
	shortcuts: 'The shortcuts list',
	sprout: 'Sprout',
	detail: 'Seed detail'
};

/**
 * Overlays whose UI exists in this build. Parent-owned; each phase contract adds
 * the overlays it ships. Opening any other overlay only shows a toast.
 */
export const AVAILABLE_OVERLAYS: ReadonlySet<OverlayId> = new Set<OverlayId>([]);

export type AddMode = 'manual' | 'photo' | 'scan';

export type SortKey = 'name' | 'variety' | 'type' | 'company' | 'year' | 'packets' | 'state' | 'loc' | 'verdict';

export interface ToastAction {
	label: string;
	run: () => void;
}

export interface Toast {
	/** Increments per toast so repeated messages re-announce. */
	id: number;
	message: string;
	action?: ToastAction;
}

export interface SeedsView {
	state: SeedState | 'all';
	q: string;
	/** Seed type filter; '' = all types. */
	type: string;
	sort: { key: SortKey; dir: 1 | -1 };
	selected: string[];
	/** Seed whose detail is open, or null. */
	seedId: string | null;
}

export interface GardenView {
	bedId: string;
	/** Seed id being painted, or null. */
	brush: string | null;
	/** Selected planting event id, or null. */
	selEv: string | null;
}

export class Ui {
	theme = $state<Theme>('light');
	overlays = $state<OverlayId[]>([]);
	addMode = $state<AddMode>('manual');
	toast = $state<Toast | null>(null);
	seeds = $state<SeedsView>({ state: 'active', q: '', type: '', sort: { key: 'name', dir: 1 }, selected: [], seedId: null });
	garden = $state<GardenView>({ bedId: 'b1', brush: null, selEv: null });

	// Created only in a browser: Svelte's browser MediaQuery calls window.matchMedia
	// immediately, and Vitest runs in Node with browser conditions.
	#wideQuery = typeof window !== 'undefined' && 'matchMedia' in window ? new MediaQuery('min-width: 900px') : null;

	/** True at ≥900px (sidebar layout). Defaults to true outside a browser. */
	get wide(): boolean {
		return this.#wideQuery?.current ?? true;
	}

	get top(): OverlayId | null {
		return this.overlays.at(-1) ?? null;
	}

	/** True when any modal overlay is open (shortcuts other than Esc/⌘K are suspended). */
	get modalOpen(): boolean {
		return this.overlays.some((o) => MODAL_OVERLAYS.includes(o));
	}

	isOpen = (id: OverlayId): boolean => this.overlays.includes(id);

	/**
	 * Push (or move to top) an overlay. If `id` is not in AVAILABLE_OVERLAYS, show the toast
	 * `${OVERLAY_LABEL[id]} arrives in a later build phase.` and do not open anything.
	 */
	open = (id: OverlayId): void => {
		void id;
	};

	close = (id: OverlayId): void => {
		void id;
	};

	toggle = (id: OverlayId): void => {
		void id;
	};

	/** Close the topmost overlay. Returns false when none was open. */
	closeTop = (): boolean => false;

	/** Show a toast; replaces any current toast. Auto-dismiss: 2800ms, or 6000ms with an action. */
	showToast = (message: string, action?: ToastAction): void => {
		void message;
		void action;
	};

	dismissToast = (): void => {};

	/** Read the saved theme (localStorage 'seedkeep-theme', guarded) or prefers-color-scheme, and apply it. Call once from the root layout's onMount. */
	initTheme = (): void => {};

	/** Flip, apply to <html data-theme> and color-scheme, and persist (guarded). */
	toggleTheme = (): void => {};
}

export const ui = new Ui();

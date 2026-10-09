// Global keyboard shortcuts. CONTRACT STUB — owner: Luna (Phase 1).
import type { RouteKey } from '$lib/nav';

export interface ShortcutHandlers {
	/** ⌘K / Ctrl+K — works while typing; see commands.togglePalette for modal rules. */
	palette: () => void;
	/** Escape — always handled (also while typing in a field). */
	escape: () => void;
	/** N */
	add: () => void;
	/** / */
	filter: () => void;
	/** ? */
	shortcuts: () => void;
	/** A */
	sprout: () => void;
	/** G then T/S/B/W/P within 900ms. */
	go: (key: RouteKey) => void;
	/** True while a modal overlay is open: single-key shortcuts and chords are suspended. */
	isModalOpen: () => boolean;
}

/**
 * Register one keydown listener on `target` (window by default; tests pass their own); returns its cleanup.
 * Single-key shortcuts and chords are ignored while typing in input/textarea/select/contenteditable,
 * during IME composition, on key repeat, and with Alt/Meta/Ctrl (except ⌘K/Ctrl+K).
 */
export function bindShortcuts(h: ShortcutHandlers, target: EventTarget = window): () => void {
	void h;
	void target;
	return () => {};
}

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
	let gStartedAt = 0;
	const listener = (event: Event): void => {
		const e = event as KeyboardEvent;
		if (e.repeat || e.isComposing) return;
		const key = e.key;
		if (/^(?:Shift|Control|Alt|Meta|CapsLock|OS|Fn|FnLock|Hyper|Super|Symbol|SymbolLock)$/.test(key)) return;
		const commandK = (e.metaKey || e.ctrlKey) && key.toLowerCase() === 'k';
		if (commandK) { e.preventDefault(); h.palette(); return; }
		if (key === 'Escape') { e.preventDefault(); h.escape(); return; }
		if (h.isModalOpen()) return;
		const element = e.target as HTMLElement | null;
		const typing = !!element && (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable);
		if (typing || e.metaKey || e.ctrlKey || e.altKey) { gStartedAt = 0; return; }
		const lower = key.toLowerCase();
		if (gStartedAt && Date.now() - gStartedAt <= 900) {
			gStartedAt = 0;
			const route = ({ t: 'today', s: 'seeds', b: 'garden', w: 'windows', p: 'settings' } as const)[lower as 't' | 's' | 'b' | 'w' | 'p'];
			if (route) { e.preventDefault(); h.go(route); return; }
		}
		if (lower === 'g') { gStartedAt = Date.now(); e.preventDefault(); return; }
		if (key === 'n' || key === 'N') { e.preventDefault(); h.add(); }
		else if (key === '/') { e.preventDefault(); h.filter(); }
		else if (key === '?') { e.preventDefault(); h.shortcuts(); }
		else if (lower === 'a') { e.preventDefault(); h.sprout(); }
	};
	target.addEventListener('keydown', listener);
	return () => target.removeEventListener('keydown', listener);
}

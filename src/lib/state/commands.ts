// App-level commands used by the shell, shortcuts, palette and views. They
// coordinate the garden store, UI state and navigation, including cascades.
// CONTRACT — signatures are parent-owned; BODIES are owned by Luna (Phase 1 unless noted).
import type { RouteKey } from '$lib/nav';
import type { AddMode } from './ui.svelte';

export const commands = {
	/** Navigate to a route (goto) and resolve after the DOM settles (tick). */
	go: async (key: RouteKey): Promise<void> => {
		void key;
	},

	/** Go to Seeds and focus the filter input `#seed-filter` (Phase 2 renders it). */
	focusSeedFilter: async (): Promise<void> => {},

	/** Open the palette; if it is open, close it. Ignored while another modal is open. */
	togglePalette: (): void => {},

	/** Open Add seed in a mode (default 'manual'). */
	openAdd: (mode?: AddMode): void => {
		void mode;
	},

	toggleSprout: (): void => {},

	openShortcuts: (): void => {},

	/**
	 * Escape policy: close the topmost overlay; otherwise on Seeds close the open
	 * detail; otherwise on Garden clear the brush, then the selected event.
	 */
	escape: (): void => {},

	toggleTheme: (): void => {},

	/** Pick a .csv file, import it into the store, toast the result and any ignored columns. */
	importCSV: (): void => {},

	/** Download seedkeep-library.csv and toast the count. */
	exportCSV: (): void => {},

	/** Print the library inventory from any route (Phase 2 adds the print-only view; until then window.print()). */
	printInventory: (): void => {},

	/** Delete seeds and clear any selection, open detail, brush or selected event that pointed at them. */
	deleteSeeds: (ids: string[]): void => {
		void ids;
	},

	/** Remove one planting event and clear the selected event if it was this one. */
	removeEvent: (id: string): void => {
		void id;
	},

	/** Open a seed's detail on Seeds, switching the state tab so the row is visible. */
	openSeed: async (id: string): Promise<void> => {
		void id;
	},

	/** Mark an event done/undone and show a toast with Undo (Phase 4 uses this on Today). */
	completeEvent: (id: string): void => {
		void id;
	},

	/** Start painting a seed in Garden: set the brush, clear the selected event, navigate, toast the hint. (Phase 4 callers.) */
	planSeed: async (seedId: string): Promise<void> => {
		void seedId;
	}
};

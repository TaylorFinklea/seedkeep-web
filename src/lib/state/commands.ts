// App-level commands used by the shell, shortcuts, palette and views. They
// coordinate the garden store, UI state and navigation, including cascades.
// CONTRACT — signatures are parent-owned; BODIES are owned by Luna (Phase 1 unless noted).
import type { RouteKey } from '$lib/nav';
import { hrefFor, routeKey } from '$lib/nav';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { seedTitle } from '$lib/domain/derive';
import { plural } from '$lib/domain/dates';
import { tick } from 'svelte';
import { garden } from './garden.svelte';
import { ui } from './ui.svelte';
import type { AddMode } from './ui.svelte';

export const commands = {
	/** Navigate to a route (goto) and resolve after the DOM settles (tick). */
	go: async (key: RouteKey): Promise<void> => {
		await goto(hrefFor(key));
		await tick();
	},

	/** Go to Seeds and focus the filter input `#seed-filter` (Phase 2 renders it). */
	focusSeedFilter: async (): Promise<void> => {
		if (!ui.wide) {
			ui.seeds.seedId = null;
			ui.close('detail');
		}
		await commands.go('seeds');
		document.getElementById('seed-filter')?.focus();
	},

	/** Open the palette; if it is open, close it. Ignored while another modal is open. */
	togglePalette: (): void => {
		if (ui.isOpen('palette')) { ui.close('palette'); return; }
		if (ui.modalOpen) return;
		ui.open('palette');
	},

	/** Open Add seed in a mode (default 'manual'). */
	openAdd: (mode?: AddMode): void => {
		ui.addMode = mode ?? 'manual';
		ui.open('add');
	},

	toggleSprout: (): void => ui.toggle('sprout'),

	openShortcuts: (): void => ui.open('shortcuts'),

	/**
	 * Escape policy: close the topmost overlay; otherwise on Seeds close the open
	 * detail; otherwise on Garden clear the brush, then the selected event.
	 */
	escape: (): void => {
		if (ui.top === 'detail') {
			ui.seeds.seedId = null;
			ui.closeTop();
			return;
		}
		if (ui.closeTop()) return;
		const key = routeKey(page.url.pathname);
		if (key === 'seeds') { ui.seeds.seedId = null; return; }
		if (key === 'garden') {
			if (ui.garden.brush) ui.garden.brush = null;
			else ui.garden.selEv = null;
		}
	},

	toggleTheme: (): void => ui.toggleTheme(),

	/** Pick a .csv file, import it into the store, toast the result and any ignored columns. */
	importCSV: (): void => {
		const input = document.createElement('input');
		input.type = 'file'; input.accept = '.csv,text/csv'; input.hidden = true;
		input.addEventListener('cancel', () => input.remove(), { once: true });
		input.addEventListener('change', () => {
			const file = input.files?.[0]; input.remove();
			if (!file) return;
			void file.text().then((text) => {
				const result = garden.importCSV(text);
				if (!result.added) ui.showToast('No rows found in that file.');
				else ui.showToast(`Imported ${plural(result.added, 'seed')}.${result.ignored.length ? ` Not imported: ${result.ignored.join(', ')}.` : ''}`);
			}).catch(() => ui.showToast('Couldn’t read that file.'));
		});
		document.body.append(input); input.click();
	},

	/** Download seedkeep-library.csv and toast the count. */
	exportCSV: (): void => {
		const url = URL.createObjectURL(new Blob([garden.exportCSV()], { type: 'text/csv;charset=utf-8' }));
		const link = document.createElement('a'); link.href = url; link.download = 'seedkeep-library.csv';
		document.body.append(link); link.click(); link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 500);
		ui.showToast(`Exported ${plural(garden.seeds.length, 'seed')} as CSV.`);
	},

	/** Print the library inventory from any route (Phase 2 adds the print-only view; until then window.print()). */
	printInventory: (): void => window.print(),

	/** Delete seeds and clear any selection, open detail, brush or selected event that pointed at them. */
	deleteSeeds: (ids: string[]): void => {
		const removed = new Set(ids);
		const eventIds = garden.events.filter((event) => removed.has(event.seed)).map((event) => event.id);
		garden.removeSeeds(ids);
		ui.seeds.selected = ui.seeds.selected.filter((id) => !removed.has(id));
		if (ui.seeds.seedId && removed.has(ui.seeds.seedId)) { ui.seeds.seedId = null; ui.close('detail'); }
		if (ui.garden.brush && removed.has(ui.garden.brush)) ui.garden.brush = null;
		if (ui.garden.selEv && eventIds.includes(ui.garden.selEv)) ui.garden.selEv = null;
	},

	/** Remove one planting event and clear the selected event if it was this one. */
	removeEvent: (id: string): void => {
		garden.removeEvent(id);
		if (ui.garden.selEv === id) ui.garden.selEv = null;
	},

	/** Open a seed's detail on Seeds, switching the state tab so the row is visible. */
	openSeed: async (id: string): Promise<void> => {
		const seed = garden.seeds.find((candidate) => candidate.id === id);
		if (!seed) return;
		if (ui.seeds.state !== 'all') ui.seeds.state = seed.state;
		ui.seeds.seedId = id;
		await commands.go('seeds');
		if (!ui.wide) ui.open('detail');
	},

	/** Mark an event done/undone and show a toast with Undo (Phase 4 uses this on Today). */
	completeEvent: (id: string): void => {
		const event = garden.events.find((candidate) => candidate.id === id);
		if (!event) return;
		garden.toggleDone(id);
		if (!garden.events.find((candidate) => candidate.id === id)?.done) { ui.dismissToast(); return; }
		const seed = garden.seeds.find((candidate) => candidate.id === event.seed);
		const kind = ({ sowing: 'sow', transplant: 'transplant', harvest: 'harvest', note: 'note' })[event.kind];
		ui.showToast(`Marked ${kind} ${seed ? seedTitle(seed) : 'Unknown seed'} done.`, { label: 'Undo', run: () => garden.updateEvent(id, { done: false }) });
	},

	/** Start painting a seed in Garden: set the brush, clear the selected event, navigate, toast the hint. (Phase 4 callers.) */
	planSeed: async (seedId: string): Promise<void> => {
		const seed = garden.seeds.find((candidate) => candidate.id === seedId);
		if (!seed) return;
		if (seed.state !== 'active') {
			ui.showToast(`Move ${seedTitle(seed)} to Active to plan it in a bed.`);
			return;
		}
		ui.garden.brush = seedId; ui.garden.selEv = null;
		await commands.go('garden');
		ui.showToast(`Click empty squares to plan ${seedTitle(seed)}.`);
	}
};

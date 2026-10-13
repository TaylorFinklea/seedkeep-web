import { STATE_LABEL } from '$lib/domain/constants';
import { seedTitle } from '$lib/domain/derive';
import type { GardenData } from '$lib/domain/types';
import { commands } from './commands';
import { ui } from './ui.svelte';
import { FEATURES } from '$lib/config';

export interface PaletteItem {
	id: string;
	label: string;
	group: 'Action' | 'Go to' | 'Bed' | 'Seed' | 'Help';
	hint?: string;
	run(): void | Promise<void>;
}

export function paletteItems(g: GardenData): PaletteItem[] {
	const actions: PaletteItem[] = [
		{ id: 'add', label: 'Add a seed', group: 'Action', hint: 'N', run: () => commands.openAdd() },
		{ id: 'scan', label: 'Scan a barcode', group: 'Action', run: () => commands.openAdd('scan') },
		{
			id: 'photo',
			label: 'Add from packet photo',
			group: 'Action',
			run: () => commands.openAdd('photo')
		},
		{ id: 'import', label: 'Import CSV', group: 'Action', run: () => commands.importCSV() },
		{
			id: 'export',
			label: 'Export library as CSV',
			group: 'Action',
			run: () => commands.exportCSV()
		},
		{
			id: 'print',
			label: 'Print inventory',
			group: 'Action',
			run: () => commands.printInventory()
		},
		{ id: 'sprout', label: 'Ask Sprout', group: 'Action', hint: 'A', run: () => ui.open('sprout') },
		{
			id: 'theme',
			label: `Switch to ${ui.theme === 'dark' ? 'light' : 'dark'} mode`,
			group: 'Action',
			run: () => commands.toggleTheme()
		},
		{
			id: 'shortcuts',
			label: 'Keyboard shortcuts',
			group: 'Help',
			hint: '?',
			run: () => commands.openShortcuts()
		}
	];
	const routes: PaletteItem[] = [
		{ id: 'today', label: 'Today', group: 'Go to', hint: 'G T', run: () => commands.go('today') },
		{
			id: 'seeds',
			label: 'Seeds',
			group: 'Go to',
			hint: 'G S',
			run: () => commands.focusSeedFilter()
		},
		{
			id: 'garden',
			label: 'Garden',
			group: 'Go to',
			hint: 'G B',
			run: async () => {
				ui.garden.selEv = null;
				await commands.go('garden');
			}
		},
		{
			id: 'windows',
			label: 'Planting windows',
			group: 'Go to',
			hint: 'G W',
			run: () => commands.go('windows')
		},
		{
			id: 'settings',
			label: 'Settings',
			group: 'Go to',
			hint: 'G P',
			run: () => commands.go('settings')
		}
	];
	const beds: PaletteItem[] = g.beds.map((bed) => ({
		id: `bed:${bed.id}`,
		label: bed.name,
		group: 'Bed',
		hint: `${bed.w}×${bed.l}`,
		run: async () => {
			ui.garden.bedId = bed.id;
			ui.garden.selEv = null;
			await commands.go('garden');
		}
	}));
	const seeds: PaletteItem[] = g.seeds.map((seed) => ({
		id: `seed:${seed.id}`,
		label: seedTitle(seed),
		group: 'Seed',
		hint: STATE_LABEL[seed.state],
		run: () => commands.openSeed(seed.id)
	}));
	return [
		...actions.filter(
			(item) =>
				(item.id !== 'scan' || FEATURES.barcodeScan) &&
				(item.id !== 'photo' || FEATURES.packetPhoto) &&
				(item.id !== 'import' || FEATURES.csvImport) &&
				(item.id !== 'sprout' || FEATURES.sprout)
		),
		...routes,
		...beds,
		...seeds
	];
}

export function filterItems(items: PaletteItem[], q: string): PaletteItem[] {
	const query = q.trim().toLowerCase();
	return items
		.filter(
			(item) =>
				!query || `${item.label} ${item.hint ?? ''} ${item.group}`.toLowerCase().includes(query)
		)
		.slice(0, 9);
}

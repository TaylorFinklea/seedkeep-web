// Fixed vocabularies, ported from the Workbench export.
// CONTRACT (parent-owned).
import type { ChangelogEntry, EventKind, SeedState, Verdict } from './types';

export const STATES: { key: SeedState; label: string }[] = [
	{ key: 'active', label: 'Active' },
	{ key: 'wishlist', label: 'Wishlist' },
	{ key: 'saved', label: 'Saved' },
	{ key: 'archived', label: 'Archived' }
];

export const STATE_LABEL: Record<SeedState, string> = {
	active: 'Active',
	wishlist: 'Wishlist',
	saved: 'Saved',
	archived: 'Archived'
};

export const VERDICT: Record<Verdict, { label: string; short: string; order: number }> = {
	plant_now: { label: 'Plant now', short: 'Now', order: 0 },
	plant_soon: { label: 'Plant soon', short: 'Soon', order: 1 },
	late: { label: 'Closing soon', short: 'Closing', order: 2 },
	too_early: { label: 'Too early', short: 'Later', order: 3 },
	too_late: { label: 'Missed this year', short: 'Missed', order: 4 }
};

export const KIND: Record<EventKind, string> = {
	sowing: 'Sow',
	transplant: 'Transplant',
	harvest: 'Harvest',
	note: 'Note'
};

export const CORR_FIELDS = [
	'Days to germinate',
	'Days to maturity',
	'Seed depth',
	'Plant spacing',
	'Row spacing',
	'Sun',
	'Frost tolerance',
	'Scientific name',
	'Something else'
];

export const CHANGELOG: ChangelogEntry[] = [
	{
		when: 'Oct 2026',
		title: 'Seedkeep on the web',
		lines: [
			{ k: 'New', t: 'Edit your library like a spreadsheet, with bulk changes.' },
			{ k: 'New', t: 'Import and export CSV.' },
			{ k: 'New', t: 'Command menu and keyboard shortcuts.' }
		]
	},
	{
		when: 'Sep 2026',
		title: 'Planting windows',
		lines: [
			{ k: 'Improved', t: 'Windows use your home ZIP and local frost dates.' },
			{ k: 'Fixed', t: 'Packet photos attach after a sync conflict.' }
		]
	}
];

/** Sample identity shown in the shell and Settings. Not a real account. */
export const SAMPLE_USER = { name: 'Sam Rivera', email: 'sam.rivera@example.com', household: 'Rivera garden' };

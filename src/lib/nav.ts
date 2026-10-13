// Route table, nav counts and page headers. CONTRACT (parent-owned).
import { dateParts, fmt, plural } from '$lib/domain/dates';
import { dueEvents, stateCounts } from '$lib/domain/derive';
import type { GardenData } from '$lib/domain/types';

export type RouteKey = 'today' | 'seeds' | 'garden' | 'windows' | 'settings';

export interface NavItem {
	key: RouteKey;
	href: string;
	label: string;
	/** Display form of the `G` chord, e.g. "G T". */
	chord: string;
	/** Second key of the chord. */
	letter: string;
}

export const NAV: NavItem[] = [
	{ key: 'today', href: '/', label: 'Today', chord: 'G T', letter: 't' },
	{ key: 'seeds', href: '/seeds', label: 'Seeds', chord: 'G S', letter: 's' },
	{ key: 'garden', href: '/garden', label: 'Garden', chord: 'G B', letter: 'b' },
	{ key: 'windows', href: '/windows', label: 'Planting windows', chord: 'G W', letter: 'w' },
	{ key: 'settings', href: '/settings', label: 'Settings', chord: 'G P', letter: 'p' }
];

export const hrefFor = (key: RouteKey): string => NAV.find((n) => n.key === key)!.href;

export function routeKey(pathname: string): RouteKey {
	const seg = pathname.replace(/\/+$/, '').split('/')[1] ?? '';
	return (NAV.find((n) => n.href === '/' + seg)?.key ?? 'today') as RouteKey;
}

/** Count shown beside a nav item, or '' for none. */
export function navCount(key: RouteKey, g: GardenData): number | '' {
	if (key === 'today') return dueEvents(g).length;
	if (key === 'seeds') return g.seeds.length;
	if (key === 'garden') return g.beds.length;
	return '';
}

/** Page header text. `householdName` is the signed-in garden's name (Settings subtitle). */
export function pageMeta(
	key: RouteKey,
	g: GardenData,
	householdName = ''
): { title: string; sub: string } {
	switch (key) {
		case 'today':
			return { title: 'Today', sub: dateParts().long };
		case 'seeds':
			return {
				title: 'Seeds',
				sub: stateCounts(g).active + ' active · ' + g.seeds.length + ' total'
			};
		case 'garden':
			return { title: 'Garden', sub: plural(g.beds.length, 'bed') };
		case 'windows':
			return {
				title: 'Planting windows',
				sub:
					'ZIP ' +
					g.home.zip +
					' · Zone ' +
					g.home.zone +
					' · first frost ' +
					fmt(g.home.firstFrost)
			};
		case 'settings':
			return { title: 'Settings', sub: householdName };
	}
}

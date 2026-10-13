// Canned Sprout replies over the sample garden.
import type { GardenData } from './types';
import { frostWarnings, isOld, seedTitle, windowDays } from './derive';
import { buildCells } from './garden';
import { fmt } from './dates';

/** Sample reply text plus a "sample · …" caption (never claims a real tool ran). */
export function sampleReply(g: GardenData, q: string): { text: string; tool: string } {
	const query = q.toLowerCase();
	const active = g.seeds.filter((seed) => seed.state === 'active');
	if (/frost|cold|freeze/.test(query)) {
		const warnings = frostWarnings(g);
		const detail = warnings.length
			? `${warnings.map((row) => `${row.seed} in ${row.bed} (${row.kindLabel.toLowerCase()} on ${row.dateLabel})`).join('; ')} ${warnings.length === 1 ? 'is' : 'are'} planned after that date. You might move ${warnings.length === 1 ? 'it' : 'them'} earlier.`
			: 'Nothing tender is planned after that date.';
		return {
			text: `The first frost is expected around ${fmt(g.home.firstFrost)} for ZIP ${g.home.zip}. ${detail}`,
			tool: `sample · Checked ${g.events.length} plantings against your frost dates`
		};
	}
	if (/old|germin|viab/.test(query)) {
		const old = active.filter(isOld);
		return {
			text: `${old.length} active ${old.length === 1 ? 'packet is' : 'packets are'} three or more years old${old.length ? `: ${old.map(seedTitle).join(', ')}` : ''}. Try a paper-towel germination test before you rely on them.`,
			tool: `sample · Read packed year on ${active.length} active seeds`
		};
	}
	if (/bed|where|space|room/.test(query)) {
		const bed = g.beds
			.map((item, order) => ({
				item,
				order,
				empty: buildCells(g, item, null).filter((cell) => !cell.eventId).length
			}))
			.sort((a, b) => b.empty - a.empty || a.order - b.order)[0];
		return {
			text: bed
				? `${bed.item.name} has the most open space, with ${bed.empty} empty ${bed.empty === 1 ? 'square' : 'squares'}.`
				: 'There are no beds in the sample garden.',
			tool: `sample · Looked at ${g.beds.length} bed layouts`
		};
	}
	const now = active.filter((seed) => seed.verdict === 'plant_now');
	const late = active.filter((seed) => seed.verdict === 'late');
	const list = [
		...now.map((seed) => `${seedTitle(seed)} (${windowDays(seed).toLowerCase()})`),
		...late.map((seed) => `${seedTitle(seed)} (closing soon, ${windowDays(seed).toLowerCase()})`)
	];
	return {
		text: `For Zone ${g.home.zone} this week: ${list.join(', ') || 'no active seeds have a current planting window'}.`,
		tool: `sample · Checked ${active.length} active seeds against your planting windows`
	};
}

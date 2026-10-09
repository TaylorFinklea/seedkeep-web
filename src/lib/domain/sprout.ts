// Canned Sprout replies over the sample garden. CONTRACT STUB — owner: Luna (Phase 5).
import type { GardenData } from './types';

/** Sample reply text plus a "sample · …" caption (never claims a real tool ran). */
export function sampleReply(g: GardenData, q: string): { text: string; tool: string } {
	void g;
	void q;
	return { text: '', tool: '' };
}

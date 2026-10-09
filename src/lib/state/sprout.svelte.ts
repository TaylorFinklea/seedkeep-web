// Sprout chat controller. Demo only: canned sample replies, no AI provider call.
// CONTRACT — signatures parent-owned; BODIES owned by Luna (Phase 5).
import { garden } from './garden.svelte';
import { sampleReply } from '$lib/domain/sprout';
export class SproutChat {
	draft = $state('');
	thinking = $state(false);

	/** The three suggestion prompts from the export. */
	readonly suggestions: string[] = ['What can I plant this week?', 'Anything at risk of frost?', 'Which packets are getting old?'];
	#timer: ReturnType<typeof setTimeout> | null = null;
	#generation = 0;

	/** Send `q` (or the trimmed draft): append the user's message to garden.thread, then a sample reply after ~900ms. */
	send = (q?: string): void => {
		if (this.thinking) return;
		const query = (q ?? this.draft).trim(); if (!query) return;
		this.cancel(); const generation = this.#generation;
		garden.thread = [...garden.thread, { role: 'me', text: query }]; this.draft = ''; this.thinking = true;
		this.#timer = setTimeout(() => {
			this.#timer = null;
			if (generation !== this.#generation) return;
			const reply = sampleReply(garden, query);
			garden.thread = [...garden.thread, { role: 'bot', text: reply.text, tool: reply.tool }]; this.thinking = false;
		}, 900);
	};

	/** Cancel a pending reply timer (called on destroy/reset only; closing the drawer keeps the thread). */
	cancel = (): void => { this.#generation++; if (this.#timer !== null) clearTimeout(this.#timer); this.#timer = null; this.thinking = false; };
}

export const sprout = new SproutChat();

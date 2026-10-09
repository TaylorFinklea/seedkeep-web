// Sprout chat controller. Demo only: canned sample replies, no AI provider call.
// CONTRACT — signatures parent-owned; BODIES owned by Luna (Phase 5).
export class SproutChat {
	draft = $state('');
	thinking = $state(false);

	/** The three suggestion prompts from the export. */
	readonly suggestions: string[] = [];

	/** Send `q` (or the trimmed draft): append the user's message to garden.thread, then a sample reply after ~900ms. */
	send = (q?: string): void => {
		void q;
	};

	/** Cancel a pending reply timer (called on destroy/reset only; closing the drawer keeps the thread). */
	cancel = (): void => {};
}

export const sprout = new SproutChat();

<!-- Sprout drawer (export lines 318–331). Non-modal: Escape is left to the global handler.
	Messages come from garden.thread; replies come from the sprout controller. -->
<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { sprout } from '$lib/state/sprout.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const open = $derived(ui.isOpen('sprout'));

	let logEl: HTMLElement | undefined = $state();
	/** Whether the log was within about 40px of its bottom at the last scroll event. */
	let pinned = true;

	function toBottom(): void {
		if (logEl) logEl.scrollTop = logEl.scrollHeight;
	}

	function onLogScroll(): void {
		if (!logEl) return;
		pinned = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight <= 40;
	}

	// Opening the drawer shows the newest messages.
	$effect(() => {
		if (open) {
			pinned = true;
			untrack(() => void tick().then(toBottom));
		}
	});

	// New messages or a thinking change scroll to the bottom when the reader was already there,
	// or when the newest message is the reader's own.
	$effect(() => {
		void garden.thread.length;
		void sprout.thinking;
		const fromMe = garden.thread.at(-1)?.role === 'me';
		untrack(() => {
			if (fromMe || pinned) void tick().then(toBottom);
		});
	});

	onDestroy(() => sprout.cancel());

	function onDraftKeydown(e: KeyboardEvent): void {
		if (e.key !== 'Enter' || e.isComposing) return;
		e.preventDefault();
		sprout.send();
	}
</script>

<Dialog variant="drawer" width="380px" label="Sprout" {open} onclose={() => ui.close('sprout')}>
	<div class="drawer">
		<div class="head">
			<div>
				<div class="title">Sprout</div>
				<div class="subline">Sample replies · no AI provider is called</div>
			</div>
			<button type="button" class="close" aria-label="Close" onclick={() => ui.close('sprout')}>×</button>
		</div>

		<div
			class="log"
			role="log"
			aria-live="polite"
			aria-label="Sprout conversation"
			bind:this={logEl}
			onscroll={onLogScroll}
		>
			{#each garden.thread as message, i (i)}
				{#if message.role === 'bot'}
					<div class="bot">
						{#if message.tool}
							<div class="tool mono">{message.tool}</div>
						{/if}
						<div class="bubble">{message.text}</div>
					</div>
				{:else}
					<div class="me">{message.text}</div>
				{/if}
			{/each}
			{#if sprout.thinking}
				<div class="mono muted">running sample reply…</div>
			{/if}
		</div>

		<div class="suggestions">
			{#each sprout.suggestions as suggestion (suggestion)}
				<button type="button" class="chip" disabled={sprout.thinking} onclick={() => sprout.send(suggestion)}>{suggestion}</button>
			{/each}
		</div>

		<div class="composer">
			<label class="sr-only-label">
				<span class="visually-hidden">Ask about your garden</span>
				<input
					type="text"
					value={sprout.draft}
					placeholder="Ask about your garden"
					oninput={(e) => (sprout.draft = e.currentTarget.value)}
					onkeydown={onDraftKeydown}
				/>
			</label>
			<button type="button" class="send" disabled={sprout.thinking} onclick={() => sprout.send()}>Send</button>
		</div>
	</div>
</Dialog>

<style>
	.drawer {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-bottom: 1px solid var(--line);
	}

	.title {
		font-weight: 700;
	}

	.subline {
		font-size: 12px;
		color: var(--muted);
	}

	.close {
		background: none;
		border: none;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		color: var(--muted);
	}

	.log {
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.bot {
		max-width: 92%;
	}

	.tool {
		display: inline-block;
		font-size: 11.5px;
		color: var(--accent);
		background: var(--accentSoft);
		border-radius: 5px;
		padding: 4px 8px;
		margin-bottom: 5px;
	}

	.bubble {
		background: var(--panel2);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 9px 11px;
	}

	.me {
		align-self: flex-end;
		max-width: 85%;
		background: var(--accent);
		color: var(--accentInk);
		border-radius: 8px;
		padding: 8px 11px;
	}

	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 0 14px 12px;
	}

	.chip {
		background: var(--panel);
		border: 1px solid var(--line2);
		border-radius: 14px;
		padding: 4px 10px;
		font-size: 12.5px;
		cursor: pointer;
	}

	.chip:disabled,
	.send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.composer {
		display: flex;
		gap: 8px;
		padding: 12px 14px;
		border-top: 1px solid var(--line);
	}

	.sr-only-label {
		flex: 1;
		min-width: 0;
		display: flex;
	}

	.composer input {
		flex: 1;
		min-width: 0;
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 7px 9px;
		background: var(--panel);
		color: var(--ink);
		font: inherit;
	}

	.send {
		background: var(--accent);
		color: var(--accentInk);
		border: none;
		border-radius: 6px;
		padding: 7px 12px;
		cursor: pointer;
		font-weight: 600;
	}

	.mono {
		font-family: var(--mono);
	}

	.muted {
		color: var(--muted);
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}
</style>

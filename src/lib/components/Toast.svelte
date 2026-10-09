<!-- Toast host. The live region is always present so messages are announced.
	Visible toast: fixed bottom-centre, ink on bg, optional action (e.g. Undo). -->
<script lang="ts">
	import { tick } from 'svelte';
	import { ui } from '$lib/state/ui.svelte';

	/** Run the action and dismiss. The Undo button unmounts, so move focus to #main if focus fell to <body>. */
	async function runAction(): Promise<void> {
		ui.toast?.action?.run();
		ui.dismissToast();
		await tick();
		if (document.activeElement === null || document.activeElement === document.body) {
			document.getElementById('main')?.focus();
		}
	}
</script>

<div class="region" role="status" aria-live="polite">
	{#if ui.toast}
		{#key ui.toast.id}
			<div class="toast">
				<span>{ui.toast.message}</span>
				{#if ui.toast.action}
					<button type="button" class="action" onclick={runAction}>{ui.toast.action.label}</button>
				{/if}
			</div>
		{/key}
	{/if}
</div>

<style>
	.region {
		position: fixed;
		left: 50%;
		bottom: 22px;
		transform: translateX(-50%);
		z-index: 1100;
		max-width: calc(100% - 28px);
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--ink);
		color: var(--bg);
		padding: 9px 14px;
		border-radius: 8px;
		font-weight: 500;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
	}

	.action {
		flex: none;
		background: none;
		border: none;
		padding: 0 2px;
		color: inherit;
		font-weight: 600;
		text-decoration: underline;
		cursor: pointer;
	}

	.action:hover {
		opacity: 0.85;
	}

	.action:focus-visible {
		outline-color: currentColor;
	}
</style>

<!-- Catalog-correction form (export lines 205–206). Local draft state only: it is
	discarded when the seed changes because the parent keys it on seedId. -->
<script lang="ts">
	import { CORR_FIELDS } from '$lib/domain/constants';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';

	let { seedId }: { seedId: string } = $props();

	let open = $state(false);
	let field = $state<string>(CORR_FIELDS[0]);
	let value = $state('');

	const canSend = $derived(value.trim().length > 0);

	function send(event: SubmitEvent): void {
		event.preventDefault();
		const text = value.trim();
		if (!text) return;
		const saved = garden.addContribution(seedId, field, text);
		if (saved) ui.showToast('Saved your correction locally (demo).');
		field = CORR_FIELDS[0];
		value = '';
	}
</script>

<button
	type="button"
	class="toggle"
	aria-expanded={open}
	aria-controls="correction-panel"
	onclick={() => (open = !open)}>Suggest a catalog correction</button
>

{#if open}
	<form id="correction-panel" class="panel" onsubmit={send}>
		<label class="field">
			<span>Field</span>
			<select bind:value={field}>
				{#each CORR_FIELDS as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>
		<label class="field">
			<span>Correct value</span>
			<input type="text" bind:value placeholder="Correct value" autocomplete="off" />
		</label>
		<button type="submit" class="send" disabled={!canSend}>Send</button>
	</form>
{/if}

<style>
	.toggle {
		background: none;
		border: none;
		padding: 0;
		color: var(--accent);
		cursor: pointer;
		font-weight: 500;
		text-align: left;
	}

	.panel {
		display: grid;
		gap: 8px;
		margin-top: 8px;
	}

	.field {
		display: grid;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.field select,
	.field input {
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 6px 8px;
		background: var(--panel);
		color: var(--ink);
		font-weight: 400;
		font-size: 14px;
	}

	.send {
		justify-self: start;
		background: var(--accent);
		color: var(--accentInk);
		border: none;
		border-radius: 6px;
		padding: 6px 12px;
		cursor: pointer;
		font-weight: 600;
	}

	.send:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>

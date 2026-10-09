<!-- Segmented control of beds (export lines 217–218). Reads garden and ui directly. -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';

	function pick(id: string): void {
		ui.garden.bedId = id;
		ui.garden.selEv = null;
	}
</script>

<div class="tabs" role="group" aria-label="Beds">
	{#each garden.beds as bed (bed.id)}
		<button type="button" class="tab" aria-pressed={ui.garden.bedId === bed.id} onclick={() => pick(bed.id)}>
			<span>{bed.name}</span>
			<span class="dims">{bed.w}×{bed.l}</span>
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		max-width: 100%;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 7px;
		padding: 2px;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.tab {
		flex: none;
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		background: transparent;
		border: none;
		border-radius: 5px;
		padding: 5px 11px;
		color: var(--ink);
		font-weight: 400;
		white-space: nowrap;
		cursor: pointer;
	}

	.tab:hover {
		background: var(--sel);
	}

	.tab[aria-pressed='true'] {
		background: var(--sel);
		font-weight: 600;
	}

	.dims {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--faint);
	}
</style>

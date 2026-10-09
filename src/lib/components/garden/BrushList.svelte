<!-- "Paint with a seed" brush list (export lines 223–228). Root is the panel section. -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { abbr, byId } from '$lib/domain/derive';
	import { brushRows } from '$lib/domain/garden';

	const rows = $derived(
		brushRows(garden).map((row) => ({ row, abbr: abbr(byId(garden.seeds, row.id)) }))
	);

	function pick(id: string): void {
		ui.garden.brush = ui.garden.brush === id ? null : id;
		ui.garden.selEv = null;
	}
</script>

<section class="brush" aria-labelledby="brush-title">
	<h2 id="brush-title" class="head">Paint with a seed</h2>
	<div class="list">
		{#each rows as item (item.row.id)}
			<button
				type="button"
				class="row"
				aria-pressed={ui.garden.brush === item.row.id}
				onclick={() => pick(item.row.id)}
			>
				<span class="chip">{item.abbr}</span>
				<span class="title">{item.row.title}</span>
				<span class="dot" style:background={item.row.dot} aria-hidden="true"></span>
				<span class="sr-only">{item.row.verdictLabel}</span>
			</button>
		{:else}
			<p class="empty">No active seeds to paint with.</p>
		{/each}
	</div>
</section>

<style>
	.brush {
		flex: 1 1 210px;
		max-width: 100%;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		overflow: hidden;
	}

	.head {
		margin: 0;
		padding: 10px 12px;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
		font-weight: 700;
	}

	.list {
		max-height: 520px;
		overflow: auto;
	}

	.row {
		width: 100%;
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr) 8px;
		gap: 8px;
		align-items: center;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--line);
		padding: 7px 12px;
		color: var(--ink);
		font-weight: 400;
		text-align: left;
		cursor: pointer;
	}

	.row:hover {
		background: var(--sel);
	}

	.row[aria-pressed='true'] {
		background: var(--sel);
		font-weight: 600;
	}

	.chip {
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 500;
		background: var(--k-sowing);
		border-radius: 4px;
		text-align: center;
		padding: 2px 0;
	}

	.title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.empty {
		margin: 0;
		padding: 10px 12px;
		color: var(--muted);
	}
</style>

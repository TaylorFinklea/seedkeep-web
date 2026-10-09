<!-- "Next 7 days" panel (export lines 87–90). -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { upcomingEvents } from '$lib/domain/derive';

	const soon = $derived(upcomingEvents(garden, 7));
</script>

<section class="panel" aria-labelledby="next-week-title">
	<div class="panel-head">
		<h2 id="next-week-title">Next 7 days</h2>
		<span class="mono muted count">{soon.length}</span>
	</div>
	{#each soon as row (row.id)}
		<div class="row">
			<span class="mono muted date">{row.dateLabel}</span>
			<span class="what">{row.kindLabel} {row.seedTitle}</span>
			<span class="muted bed" title={row.bed}>{row.bed}</span>
		</div>
	{:else}
		<p class="empty">Nothing planned this week.</p>
	{/each}
</section>

<style>
	.panel {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		min-width: 0;
	}

	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 14px;
		border-bottom: 1px solid var(--line);
	}

	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
	}

	.row {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) minmax(0, auto);
		gap: 10px;
		align-items: center;
		padding: 9px 14px;
		border-bottom: 1px solid var(--line);
	}

	.what {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bed {
		min-width: 0;
		max-width: 40%;
		font-size: 12.5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.date,
	.count {
		font-size: 12px;
	}

	.mono {
		font-family: var(--mono);
	}

	.muted {
		color: var(--muted);
	}

	.empty {
		margin: 0;
		padding: 14px;
		color: var(--muted);
	}
</style>

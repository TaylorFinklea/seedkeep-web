<!-- "Plant now" panel (export lines 102–108): the first window group's rows. -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { commands } from '$lib/state/commands';
	import { whatToPlant } from '$lib/domain/derive';

	const rows = $derived(whatToPlant(garden)[0]?.rows ?? []);
</script>

<section class="panel" aria-labelledby="plant-now-title">
	<div class="panel-head">
		<h2 id="plant-now-title">Plant now</h2>
		<a class="link" href="/windows">All windows →</a>
	</div>
	{#each rows as row (row.id)}
		<div class="row">
			<span class="dot" style:background={row.dot}
				><span class="sr-only">{row.verdictLabel}</span></span
			>
			<button type="button" class="title" onclick={() => void commands.openSeed(row.id)}
				>{row.title}</button
			>
			<span class="mono muted days">{row.daysLabel}</span>
			{#if row.state === 'active'}
				<button type="button" class="plan" onclick={() => void commands.planSeed(row.id)}
					>Plan</button
				>
			{:else}
				<span></span>
			{/if}
		</div>
	{:else}
		<p class="empty">Nothing to plant right now.</p>
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
		gap: 10px;
		padding: 12px 14px;
		border-bottom: 1px solid var(--line);
	}

	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
	}

	.link {
		font-weight: 500;
	}

	.row {
		display: grid;
		grid-template-columns: 8px minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: center;
		padding: 8px 14px;
		border-bottom: 1px solid var(--line);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.title {
		min-width: 0;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.days {
		font-size: 12px;
		white-space: nowrap;
	}

	.plan {
		background: var(--panel);
		border: 1px solid var(--line2);
		border-radius: 5px;
		padding: 3px 8px;
		font-size: 12.5px;
		cursor: pointer;
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

<!-- Today (export lines 75–120). Frost banners, then five panels in an auto-fit grid. -->
<script lang="ts">
	import { garden } from '$lib/state/garden.svelte';
	import { frostWarnings } from '$lib/domain/derive';
	import DueNow from '$lib/components/today/DueNow.svelte';
	import UpcomingWeek from '$lib/components/today/UpcomingWeek.svelte';
	import DaylightCard from '$lib/components/today/DaylightCard.svelte';
	import PlantNow from '$lib/components/today/PlantNow.svelte';
	import LatestNote from '$lib/components/today/LatestNote.svelte';

	const frosts = $derived(frostWarnings(garden));
</script>

{#each frosts as row (row.id)}
	<div class="banner">
		<span class="badge mono">FROST</span>
		<span>{row.bed}: {row.frost}</span>
	</div>
{/each}

<div class="grid">
	<DueNow />
	<UpcomingWeek />
	<DaylightCard />
	<PlantNow />
	<LatestNote />
</div>

<style>
	.banner {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--warnSoft);
		color: var(--warn);
		border-radius: 8px;
		padding: 10px 14px;
		margin-bottom: 14px;
		font-weight: 500;
	}

	.badge {
		font-size: 12px;
		border: 1px solid currentColor;
		border-radius: 4px;
		padding: 0 5px;
		flex: none;
	}

	.mono {
		font-family: var(--mono);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
		gap: 14px;
	}
</style>

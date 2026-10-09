<script lang="ts">
	import BedTabs from '$lib/components/garden/BedTabs.svelte';
	import NewBedForm from '$lib/components/garden/NewBedForm.svelte';
	import BrushList from '$lib/components/garden/BrushList.svelte';
	import BedGrid from '$lib/components/garden/BedGrid.svelte';
	import SquareDetails from '$lib/components/garden/SquareDetails.svelte';
	import BedEvents from '$lib/components/garden/BedEvents.svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';

	$effect(() => {
		const brushId = ui.garden.brush;
		if (brushId && garden.seeds.find((seed) => seed.id === brushId)?.state !== 'active') {
			ui.garden.brush = null;
		}
	});
</script>

<div class="toolbar"><BedTabs /><NewBedForm /></div>
<div class="workbench"><BrushList /><BedGrid /><SquareDetails /></div>
<BedEvents />

<style>
	.toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
	.workbench { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; min-width: 0; }
</style>

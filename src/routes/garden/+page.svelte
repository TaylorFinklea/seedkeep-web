<script lang="ts">
	import BedTabs from '$lib/components/garden/BedTabs.svelte';
	import NewBedForm from '$lib/components/garden/NewBedForm.svelte';
	import BrushList from '$lib/components/garden/BrushList.svelte';
	import BedGrid from '$lib/components/garden/BedGrid.svelte';
	import SquareDetails from '$lib/components/garden/SquareDetails.svelte';
	import BedEvents from '$lib/components/garden/BedEvents.svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { tick } from 'svelte';
	import { cellIndex } from '$lib/domain/garden';
	import { ui } from '$lib/state/ui.svelte';

	let previousCell: { row: number; col: number } | null = null;
	$effect(() => {
		const selected = garden.events.find((event) => event.id === ui.garden.selEv);
		const bed = selected ? garden.beds.find((item) => item.id === selected.bed) ?? garden.beds[0] : null;
		const cell = selected && bed ? cellIndex(bed, selected) : null;
		if (cell) previousCell = cell;
		if (!ui.garden.selEv && previousCell && document.activeElement === document.body) {
			const target = previousCell; previousCell = null;
			void tick().then(() => document.querySelector<HTMLElement>(`[data-cell="${target.row}-${target.col}"]`)?.focus());
		}
	});
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

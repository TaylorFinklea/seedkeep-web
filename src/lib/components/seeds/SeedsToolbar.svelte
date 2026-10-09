<script lang="ts">
	import { STATES } from '$lib/domain/constants';
	import { filterSeeds, stateCounts, typeOptions } from '$lib/domain/derive';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const counts = $derived(stateCounts(garden));
	const types = $derived(typeOptions(garden));
	const total = $derived(garden.seeds.length);
	const filteredCount = $derived(filterSeeds(garden, ui.seeds).length);
	const tabs = $derived([
		{ key: 'all' as const, label: 'All', count: total },
		...STATES.map((state) => ({ ...state, count: counts[state.key] }))
	]);
	$effect(() => {
		if (ui.seeds.type && !types.includes(ui.seeds.type)) ui.seeds.type = '';
	});

	function setState(state: typeof ui.seeds.state): void {
		ui.seeds.state = state;
		ui.seeds.selected = [];
	}
</script>

<div class="toolbar">
	<div class="tabs" role="group" aria-label="Seed status filter">
		{#each tabs as tab (tab.key)}
			<button type="button" class:active={ui.seeds.state === tab.key} aria-pressed={ui.seeds.state === tab.key} onclick={() => setState(tab.key)}>
				{tab.label}<span class="count">{tab.count}</span>
			</button>
		{/each}
	</div>
	<label class="sr-only" for="seed-filter">Filter seeds</label>
	<input id="seed-filter" type="search" aria-label="Filter seeds" placeholder="Filter seeds   /" value={ui.seeds.q} oninput={(event) => ui.seeds.q = event.currentTarget.value} />
	<label class="sr-only" for="seed-type-filter">Filter by type</label>
	<select id="seed-type-filter" aria-label="Filter by type" value={ui.seeds.type} onchange={(event) => ui.seeds.type = event.currentTarget.value}>
		<option value="">All types</option>
		{#each types as type (type)}<option value={type}>{type}</option>{/each}
	</select>
	<span class="row-count">{filteredCount === 1 ? '1 row' : `${filteredCount} rows`}</span>
</div>

<style>
	.toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
	.tabs { display:flex; flex:none; max-width:100%; overflow-x:auto; padding:2px; border:1px solid var(--line); border-radius:7px; background:var(--panel); }
	.tabs button { display:flex; align-items:center; gap:6px; flex:none; border:0; border-radius:5px; padding:5px 10px; background:transparent; cursor:pointer; font-weight:400; white-space:nowrap; }
	.tabs button.active { background:var(--sel); font-weight:600; }
	.count { color:var(--faint); font:11px var(--mono); }
	input, select { border:1px solid var(--line2); border-radius:6px; background:var(--panel); padding:6px 10px; }
	input { flex:1 1 200px; max-width:320px; min-width:160px; }
	select { padding:6px 8px; }
	.row-count { margin-left:auto; color:var(--muted); font:12px var(--mono); white-space:nowrap; }
	@media (max-width:899px), (pointer:coarse) { .toolbar > input, .toolbar > select { min-height:44px; } }
	@media (max-width:899px) { .tabs { scrollbar-width:none; } .tabs::-webkit-scrollbar { display:none; } }
</style>

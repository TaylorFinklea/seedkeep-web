<script lang="ts">
	import { STATES, STATE_LABEL } from '$lib/domain/constants';
	import { plural } from '$lib/domain/dates';
	import { commands } from '$lib/state/commands';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const selectedIds = $derived([...ui.seeds.selected]);
	const count = $derived(selectedIds.length);

	function clear(): void { ui.seeds.selected = []; }
	function setStatus(state: (typeof STATES)[number]['key']): void {
		const actionCount = count;
		garden.bulkUpdate(selectedIds, { state });
		ui.showToast(`Moved ${plural(actionCount, 'seed')} to ${STATE_LABEL[state]}.`);
		clear();
	}
	function move(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;
		const loc = select.value;
		if (!loc) return;
		const actionCount = count;
		garden.bulkUpdate(selectedIds, { loc });
		const location = garden.locations.find((item) => item.id === loc)?.name ?? 'location';
		ui.showToast(`Moved ${plural(actionCount, 'seed')} to ${location}.`);
		select.value = '';
	}
	function tag(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;
		const tagId = select.value;
		if (!tagId) return;
		const actionCount = count;
		garden.tagSeeds(selectedIds, tagId);
		ui.showToast(`Tagged ${plural(actionCount, 'seed')}.`);
		select.value = '';
	}
	function remove(): void {
		const actionCount = count;
		commands.deleteSeeds(selectedIds);
		ui.showToast(`Deleted ${plural(actionCount, 'seed')}.`);
	}
</script>

{#if count > 0}
	<div class="bulk" role="group" aria-label="Bulk actions">
		<span class="selected-count">{count} selected</span>
		<span class="set-label">Set status</span>
		{#each STATES as state (state.key)}
			<button type="button" class="action" onclick={() => setStatus(state.key)}>{state.label}</button>
		{/each}
		<label class="sr-only" for="bulk-location">Move selected seeds</label>
		<select id="bulk-location" aria-label="Move selected seeds" onchange={move}>
			<option value="">Move to…</option>
			{#each garden.locations as location (location.id)}<option value={location.id}>{location.name}</option>{/each}
		</select>
		<label class="sr-only" for="bulk-tag">Add tag to selected seeds</label>
		<select id="bulk-tag" aria-label="Add tag to selected seeds" onchange={tag}>
			<option value="">Add tag…</option>
			{#each garden.tags as tag (tag.id)}<option value={tag.id}>{tag.name}</option>{/each}
		</select>
		<button type="button" class="delete" onclick={remove}>Delete</button>
		<button type="button" class="clear" onclick={clear}>Clear</button>
	</div>
{/if}

<style>
	.bulk { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:10px; padding:8px 12px; border-radius:8px; background:var(--ink); color:var(--bg); }
	.selected-count { margin-right:6px; font-weight:600; }
	.set-label { opacity:.7; }
	.action, .delete { padding:3px 8px; border:1px solid color-mix(in srgb, var(--bg) 40%, transparent); border-radius:5px; background:transparent; color:inherit; cursor:pointer; font-size:12.5px; }
	.bulk select { padding:3px 6px; border:1px solid color-mix(in srgb, var(--bg) 40%, transparent); border-radius:5px; background:var(--ink); color:var(--bg); font-size:12.5px; }
	.bulk option { background:var(--panel); color:var(--ink); }
	.delete { border-color:color-mix(in srgb, var(--warn) 60%, transparent); color:var(--warn); }
	.clear { margin-left:auto; padding:3px 0 3px 8px; border:0; background:none; color:inherit; opacity:.75; cursor:pointer; }
	.action:hover, .delete:hover, .clear:hover { opacity:.85; }
	@media (max-width:899px), (pointer:coarse) { .bulk button, .bulk select { min-height:44px; } }
</style>

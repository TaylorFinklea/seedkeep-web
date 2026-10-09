<script lang="ts">
	import { tick } from 'svelte';
	import { STATES } from '$lib/domain/constants';
	import { filterSeeds, seedRow, sortRows } from '$lib/domain/derive';
	import type { Seed } from '$lib/domain/types';
	import type { SortKey } from '$lib/state/ui.svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const columns: { key: SortKey; label: string }[] = [
		{ key: 'name', label: 'Name' }, { key: 'variety', label: 'Variety' }, { key: 'type', label: 'Type' },
		{ key: 'company', label: 'Company' }, { key: 'year', label: 'Year' }, { key: 'packets', label: 'Pkts' },
		{ key: 'state', label: 'Status' }, { key: 'loc', label: 'Stored in' }, { key: 'verdict', label: 'Window' }
	];
	const rows = $derived(sortRows(garden, filterSeeds(garden, ui.seeds), ui.seeds.sort).map((seed) => ({ seed, row: seedRow(garden, seed) })));
	const rowOrder = $derived(rows.map(({ seed }) => seed.id).join('\u0000'));
	const shownIds = $derived(rows.map(({ seed }) => seed.id));
	const selectedShown = $derived(shownIds.filter((id) => ui.seeds.selected.includes(id)));
	const allShown = $derived(shownIds.length > 0 && selectedShown.length === shownIds.length);
	const someShown = $derived(selectedShown.length > 0 && !allShown);

	let { onOpen }: { onOpen: (id: string) => void } = $props();
	let selectAll = $state<HTMLInputElement>();
	let previousRowOrder: string | undefined;
	let pendingFocus: { element: HTMLElement; start: number | null; end: number | null; direction: 'forward' | 'backward' | 'none' | null } | null = null;
	$effect.pre(() => {
		const order = rowOrder;
		if (previousRowOrder !== undefined && previousRowOrder !== order && typeof document !== 'undefined') {
			const active = document.activeElement;
			if (active instanceof HTMLElement && active.closest('.table-viewport')) {
				const input = active instanceof HTMLInputElement ? active : null;
				pendingFocus = {
					element: active,
					start: input?.selectionStart ?? null,
					end: input?.selectionEnd ?? null,
					direction: input?.selectionDirection ?? null
				};
			}
		}
		previousRowOrder = order;
	});
	$effect(() => {
		const order = rowOrder;
		void order;
		const captured = pendingFocus;
		if (!captured) return;
		pendingFocus = null;
		void tick().then(() => {
			if (!captured.element.isConnected || document.activeElement === captured.element) return;
			captured.element.focus({ preventScroll: true });
			if (captured.element instanceof HTMLInputElement && captured.start != null && captured.end != null) {
				captured.element.setSelectionRange(captured.start, captured.end, captured.direction ?? undefined);
			}
		});
	});
	$effect(() => {
		const shown = new Set(shownIds);
		const selected = ui.seeds.selected.filter((id) => shown.has(id));
		if (selected.length !== ui.seeds.selected.length) ui.seeds.selected = selected;
	});
	$effect(() => {
		const indeterminate = someShown;
		void tick().then(() => { if (selectAll) selectAll.indeterminate = indeterminate; });
	});

	function toggleSort(key: SortKey): void {
		ui.seeds.sort = { key, dir: ui.seeds.sort.key === key ? (ui.seeds.sort.dir === 1 ? -1 : 1) : 1 };
	}
	function toggleOne(id: string): void {
		ui.seeds.selected = ui.seeds.selected.includes(id)
			? ui.seeds.selected.filter((selected) => selected !== id)
			: [...ui.seeds.selected, id];
	}
	function toggleAll(): void {
		const shown = new Set(shownIds);
		ui.seeds.selected = allShown
			? ui.seeds.selected.filter((id) => !shown.has(id))
			: [...new Set([...ui.seeds.selected, ...shownIds])];
	}
	function commit(id: string, field: 'name' | 'variety' | 'type' | 'company' | 'year' | 'packets', input: HTMLInputElement): void {
		const value = input.value;
		if (field === 'year') {
			if (value === '') { garden.updateSeed(id, { year: null }); return; }
			if (!/^\d{4}$/.test(value) || Number(value) < 1900 || Number(value) > 2100) {
				input.value = storedValue(id, field);
				ui.showToast('Year must be a 4-digit year.');
				return;
			}
			garden.updateSeed(id, { year: Number(value) });
			return;
		}
		if (field === 'packets') {
			if (!/^\d+$/.test(value) || Number(value) > 999) {
				input.value = storedValue(id, field);
				ui.showToast('Packets must be a whole number from 0 to 999.');
				return;
			}
			garden.updateSeed(id, { packets: Number(value) });
			return;
		}
		const trimmed = value.trim();
		if (field === 'name' && !trimmed) {
			input.value = storedValue(id, field);
			ui.showToast("Name can't be empty.");
			return;
		}
		const committed = field === 'type' ? (trimmed || 'Untyped') : trimmed;
		input.value = committed;
		garden.updateSeed(id, { [field]: committed });
	}
	function storedValue(id: string, field: 'name' | 'variety' | 'type' | 'company' | 'year' | 'packets'): string {
		const seed = garden.seeds.find((item) => item.id === id);
		if (!seed) return '';
		const value = seed[field];
		return value == null ? '' : String(value);
	}
	function keydown(event: KeyboardEvent, id: string, field: 'name' | 'variety' | 'type' | 'company' | 'year' | 'packets'): void {
		const input = event.currentTarget as HTMLInputElement;
		if (event.isComposing) return;
		if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			input.value = storedValue(id, field);
			input.blur();
		}
	}
	function inputLabel(field: string, title: string): string { return `${field} for ${title}`; }
</script>

<div class="table-viewport" role="table" aria-label="Seed inventory">
	<div class="table-inner">
		<div class="grid header" role="row">
			<div class="check-cell" role="columnheader"><label class="check-target"><input bind:this={selectAll} type="checkbox" aria-label="Select all shown rows" checked={allShown} disabled={shownIds.length === 0} onchange={toggleAll} /></label></div>
			{#each columns as column (column.key)}
				<div class="heading" role="columnheader" aria-sort={ui.seeds.sort.key === column.key ? (ui.seeds.sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
					<button type="button" onclick={() => toggleSort(column.key)}>{column.label}{ui.seeds.sort.key === column.key ? (ui.seeds.sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button>
				</div>
			{/each}
			<div role="columnheader"></div>
		</div>
		{#each rows as item (item.seed.id)}
			{@const seed = item.seed}
			{@const row = item.row}
			<div class="grid data-row" class:selected={ui.seeds.selected.includes(seed.id) || ui.seeds.seedId === seed.id} role="row">
				<div class="check-cell" role="cell"><label class="check-target"><input type="checkbox" aria-label={`Select ${row.title}`} checked={ui.seeds.selected.includes(seed.id)} onchange={() => toggleOne(seed.id)} /></label></div>
				<div role="cell"><input class="edit name" aria-label={inputLabel('Name', row.title)} value={seed.name} onchange={(event) => commit(seed.id, 'name', event.currentTarget)} onkeydown={(event) => keydown(event, seed.id, 'name')} /></div>
				<div role="cell"><input class="edit" aria-label={inputLabel('Variety', row.title)} value={seed.variety} onchange={(event) => commit(seed.id, 'variety', event.currentTarget)} onkeydown={(event) => keydown(event, seed.id, 'variety')} /></div>
				<div role="cell"><input class="edit muted" aria-label={inputLabel('Type', row.title)} value={seed.type} onchange={(event) => commit(seed.id, 'type', event.currentTarget)} onkeydown={(event) => keydown(event, seed.id, 'type')} /></div>
				<div role="cell"><input class="edit muted" aria-label={inputLabel('Company', row.title)} value={seed.company} onchange={(event) => commit(seed.id, 'company', event.currentTarget)} onkeydown={(event) => keydown(event, seed.id, 'company')} /></div>
				<div role="cell"><input class="edit mono year" class:old={row.old} aria-label={inputLabel('Year', row.title)} inputmode="numeric" value={seed.year == null ? '' : String(seed.year)} onchange={(event) => commit(seed.id, 'year', event.currentTarget)} onkeydown={(event) => keydown(event, seed.id, 'year')} /></div>
				<div role="cell"><input class="edit mono packets" aria-label={inputLabel('Packets', row.title)} inputmode="numeric" value={String(seed.packets)} onchange={(event) => commit(seed.id, 'packets', event.currentTarget)} onkeydown={(event) => keydown(event, seed.id, 'packets')} /></div>
				<div role="cell"><select aria-label={`Status for ${row.title}`} value={seed.state} onchange={(event) => garden.updateSeed(seed.id, { state: event.currentTarget.value as Seed['state'] })}>{#each STATES as state (state.key)}<option value={state.key}>{state.label}</option>{/each}</select></div>
				<div role="cell"><select class="location" aria-label={`Stored in for ${row.title}`} value={seed.loc} onchange={(event) => garden.updateSeed(seed.id, { loc: event.currentTarget.value })}><option value="">—</option>{#each garden.locations as location (location.id)}<option value={location.id}>{location.name}</option>{/each}</select></div>
				<div role="cell" class="window"><span class="dot" style:background={row.dot}></span><span class="verdict" style:color={row.verdict ? row.dot : 'var(--muted)'}>{row.verdictShort}</span><span class="days">{row.daysLabel}</span></div>
				<div role="cell"><button type="button" class="open" aria-label={`Open ${row.title}`} data-open-seed={seed.id} onclick={() => onOpen(seed.id)}>›</button></div>
			</div>
		{:else}
			<div role="row"><div class="empty" role="cell">No seeds match these filters.</div></div>
		{/each}
	</div>
</div>
<p class="hint">Click any cell to edit. Changes save when you press Enter or leave the cell. Years in orange are three or more seasons old; test germination first.</p>

<style>
	.table-viewport { overflow:auto; max-height:calc(100vh - 190px); border:1px solid var(--line); border-radius:10px; background:var(--panel); }
	.table-inner { min-width:1060px; }
	.grid { display:grid; grid-template-columns:36px minmax(150px,1.3fr) minmax(140px,1.2fr) 108px minmax(150px,1.2fr) 64px 56px 108px 150px 176px 34px; align-items:center; }
	.header { position:sticky; top:0; z-index:1; border-bottom:1px solid var(--line2); background:var(--panel2); color:var(--muted); font-size:12px; font-weight:600; }
	.heading button { width:100%; border:0; background:none; padding:8px 6px; text-align:left; white-space:nowrap; font-weight:600; cursor:pointer; color:inherit; }
	.check-cell { display:flex; justify-content:center; padding:0; }
	.check-target { display:flex; width:36px; min-height:34px; align-items:center; justify-content:center; cursor:pointer; }
	.check-cell input { accent-color:var(--accent); }
	.data-row { min-height:38px; border-bottom:1px solid var(--line); }
	.data-row:hover, .data-row.selected { background:var(--sel); }
	.edit { width:100%; min-width:0; border:1px solid transparent; border-radius:4px; background:transparent; padding:5px 6px; }
	.edit:focus { border-color:var(--accent); background:var(--panel); outline:none; }
	.name { font-weight:600; }
	.muted { color:var(--muted); }
	.mono, .days { font-family:var(--mono); font-size:12px; }
	.year.old { color:var(--warn); }
	.packets { text-align:right; }
	.data-row select { width:calc(100% - 8px); min-width:0; margin:0 4px; padding:4px 2px; border:1px solid transparent; border-radius:4px; background:transparent; font-size:13px; }
	.data-row select:hover, .data-row select:focus-visible { border-color:var(--line2); }
	.location { color:var(--muted); }
	.window { display:flex; gap:7px; align-items:center; overflow:hidden; padding:0 6px; white-space:nowrap; }
	.dot { width:8px; height:8px; flex:none; border-radius:50%; background:transparent; }
	.verdict { overflow:hidden; font-weight:500; text-overflow:ellipsis; }
	.days { overflow:hidden; color:var(--muted); font-size:11.5px; text-overflow:ellipsis; }
	.open { width:100%; min-height:34px; border:0; background:none; color:var(--faint); font-size:16px; cursor:pointer; }
	.empty { margin:0; padding:24px; color:var(--muted); }
	.hint { margin:10px 2px; color:var(--faint); font-size:12.5px; }
	@media (max-width:899px) { .table-viewport { max-height:none; overflow-x:auto; overflow-y:hidden; } .header { position:static; } }
	@media (max-width:899px), (pointer:coarse) { .edit, .data-row select, .open, .check-target { min-height:44px; } }
</style>

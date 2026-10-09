<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import BulkBar from '$lib/components/seeds/BulkBar.svelte';
	import SeedDetail from '$lib/components/seeds/SeedDetail.svelte';
	import SeedsTable from '$lib/components/seeds/SeedsTable.svelte';
	import SeedsToolbar from '$lib/components/seeds/SeedsToolbar.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { ui } from '$lib/state/ui.svelte';

	let previousWide = ui.wide;
	let previousSeedId: string | null = ui.seeds.seedId;
	let lastOpenedSeedId: string | null = ui.seeds.seedId;
	let focusWasInDetail = false;
	let previousSelectionCount = ui.seeds.selected.length;
	let selectionAnnouncement = $state(previousSelectionCount ? `${previousSelectionCount} selected` : '');

	function focusReturnTarget(): HTMLElement | null {
		const id = lastOpenedSeedId ?? ui.seeds.seedId;
		if (id) {
			const rowButton = [...document.querySelectorAll<HTMLElement>('[data-open-seed]')].find((element) => element.dataset.openSeed === id);
			if (rowButton) return rowButton;
		}
		return document.getElementById('seed-filter');
	}
	function closeDetail(): void {
		ui.seeds.seedId = null;
		ui.close('detail');
		if (ui.wide) void tick().then(() => focusReturnTarget()?.focus());
	}
	function openDetail(id: string): void {
		lastOpenedSeedId = id;
		ui.seeds.seedId = id;
		if (!ui.wide) ui.open('detail');
	}
	function onFocusIn(event: FocusEvent): void {
		const target = event.target;
		focusWasInDetail = target instanceof Element && !!target.closest('[data-detail-container]');
	}

	$effect(() => {
		const count = ui.seeds.selected.length;
		if (count !== previousSelectionCount) {
			selectionAnnouncement = count ? `${count} selected` : 'Selection cleared';
			previousSelectionCount = count;
		}
	});

	$effect(() => {
		const seedId = ui.seeds.seedId;
		if (seedId) lastOpenedSeedId = seedId;
		if (previousSeedId && !seedId && ui.wide) void tick().then(() => focusReturnTarget()?.focus());
		previousSeedId = seedId;
	});

	$effect(() => {
		const wide = ui.wide;
		const seedId = ui.seeds.seedId;
		const modalOpen = ui.modalOpen;
		if (!wide && seedId && !modalOpen && !ui.isOpen('detail')) ui.open('detail');
	});

	$effect(() => {
		const wide = ui.wide;
		if (wide === previousWide) return;
		previousWide = wide;
		if (!ui.seeds.seedId) return;
		if (wide) ui.close('detail');
		else if (!ui.modalOpen) ui.open('detail');
		if (focusWasInDetail) void tick().then(() => document.querySelector<HTMLElement>('[data-detail-close]')?.focus());
	});

	onMount(() => {
		document.addEventListener('focusin', onFocusIn);
		if (!ui.wide && ui.seeds.seedId && !ui.modalOpen) ui.open('detail');
		return () => document.removeEventListener('focusin', onFocusIn);
	});
	onDestroy(() => ui.close('detail'));
</script>

<div class="workbench">
	<section class="table-column" aria-label="Seed library">
		<SeedsToolbar />
		<BulkBar />
		<SeedsTable onOpen={openDetail} />
		<div class="sr-only" role="status" aria-live="polite">{selectionAnnouncement}</div>
	</section>
	{#if ui.wide && ui.seeds.seedId}
		<aside class="detail-container" data-detail-container aria-label="Seed details">
			{#key ui.seeds.seedId}<SeedDetail seedId={ui.seeds.seedId} onclose={closeDetail} />{/key}
		</aside>
	{/if}
</div>

<Dialog variant="sheet" open={ui.isOpen('detail')} label="Seed details" onclose={closeDetail} returnFocus={focusReturnTarget}>
	{#if ui.seeds.seedId}
		<div data-detail-container>
			{#key ui.seeds.seedId}<SeedDetail seedId={ui.seeds.seedId} onclose={closeDetail} />{/key}
		</div>
	{/if}
</Dialog>

<style>
	.workbench { display:flex; align-items:flex-start; gap:16px; min-width:0; }
	.table-column { flex:1; min-width:0; }
	.detail-container { flex:0 0 360px; position:sticky; top:12px; align-self:flex-start; max-height:calc(100vh - 110px); overflow:auto; border:1px solid var(--line); border-radius:10px; background:var(--panel); }
	.detail-container :global(.detail) { border:0; border-radius:0; background:transparent; }
	@media (max-width:899px) { .workbench { display:block; } }
</style>

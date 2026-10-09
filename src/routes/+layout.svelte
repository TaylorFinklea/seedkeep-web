<script lang="ts">
	import '../app.css';
	import '@fontsource/public-sans/400.css';
	import '@fontsource/public-sans/500.css';
	import '@fontsource/public-sans/600.css';
	import '@fontsource/public-sans/700.css';
	import '@fontsource/public-sans/400-italic.css';
	import '@fontsource/jetbrains-mono/400.css';
	import '@fontsource/jetbrains-mono/500.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { pageMeta, routeKey } from '$lib/nav';
	import { bindShortcuts } from '$lib/keys';
	import { commands } from '$lib/state/commands';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import Sidebar from '$lib/components/shell/Sidebar.svelte';
	import NarrowHeader from '$lib/components/shell/NarrowHeader.svelte';
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import PrintInventory from '$lib/components/PrintInventory.svelte';
	import CommandPalette from '$lib/components/overlays/CommandPalette.svelte';
	import AddSeedModal from '$lib/components/overlays/AddSeedModal.svelte';
	import SproutDrawer from '$lib/components/overlays/SproutDrawer.svelte';
	import ShortcutsDialog from '$lib/components/overlays/ShortcutsDialog.svelte';

	let { children } = $props();

	const key = $derived(routeKey(page.url.pathname));
	const meta = $derived(pageMeta(key, garden));

	onMount(() => {
		ui.initTheme();
		return bindShortcuts({
			palette: () => commands.togglePalette(),
			escape: () => commands.escape(),
			add: () => commands.openAdd(),
			filter: () => void commands.focusSeedFilter(),
			shortcuts: () => commands.openShortcuts(),
			sprout: () => commands.toggleSprout(),
			go: (k) => void commands.go(k),
			isModalOpen: () => ui.modalOpen
		});
	});
</script>

<svelte:head>
	<title>{meta.title} · Seedkeep</title>
</svelte:head>

<a class="skip-link" href="#main">Skip to content</a>

<div id="app-root">
	{#if ui.wide}
		<Sidebar />
	{/if}
	<div class="column">
		{#if !ui.wide}
			<NarrowHeader />
		{/if}
		<PageHeader title={meta.title} sub={meta.sub} route={key} />
		<main id="main">{@render children?.()}</main>
	</div>
</div>

<Toast />
<PrintInventory />
<CommandPalette />
<AddSeedModal />
<SproutDrawer />
<ShortcutsDialog />

<style>
	#app-root {
		min-height: 100vh;
		display: flex;
		background: var(--bg);
		color: var(--ink);
	}

	.column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	main {
		padding: 18px 22px 80px;
	}
</style>

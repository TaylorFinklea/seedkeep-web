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
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { pageMeta, routeKey } from '$lib/nav';
	import { bindShortcuts } from '$lib/keys';
	import { FEATURES } from '$lib/config';
	import { clock } from '$lib/state/clock.svelte';
	import { commands } from '$lib/state/commands';
	import { garden } from '$lib/state/garden.svelte';
	import { session } from '$lib/state/session.svelte';
	import type { SessionStatus } from '$lib/state/session.svelte';
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

	const path = $derived(page.url.pathname.replace(/\/+$/, '') || '/');
	const key = $derived(routeKey(path));
	const meta = $derived(pageMeta(key, garden, session.household?.name ?? ''));
	const onSignin = $derived(path === '/signin');
	const onOnboarding = $derived(path === '/onboarding');
	const authRoute = $derived(onSignin || onOnboarding);

	/** Route a session status to the page it belongs on, or null to stay. */
	function guardTarget(
		status: SessionStatus,
		current: { signin: boolean; onboarding: boolean }
	): string | null {
		switch (status) {
			case 'signed-out':
				return current.signin ? null : '/signin';
			case 'no-household':
				return current.onboarding ? null : '/onboarding';
			case 'ready':
				return current.signin || current.onboarding ? '/' : null;
			default:
				return null;
		}
	}

	$effect(() => {
		const target = guardTarget(session.status, { signin: onSignin, onboarding: onOnboarding });
		if (target) void goto(target, { replaceState: true });
	});

	/** Auth pages render without the shell when they are the right place for the current status. */
	const showAuthPage = $derived(
		(onSignin && session.status === 'signed-out') ||
			(onOnboarding && session.status === 'no-household')
	);
	/** Shell-only overlays and shortcuts act only once the household is ready. */
	const live = (): boolean => session.status === 'ready';

	function retry(): void {
		void session.init();
	}

	onMount(() => {
		ui.initTheme();
		const stopClock = clock.start();
		const unbind = bindShortcuts({
			palette: () => {
				if (live()) commands.togglePalette();
			},
			escape: () => commands.escape(),
			add: () => {
				if (live()) commands.openAdd();
			},
			filter: () => {
				if (live()) void commands.focusSeedFilter();
			},
			shortcuts: () => {
				if (live()) commands.openShortcuts();
			},
			sprout: () => {
				if (FEATURES.sprout && live()) commands.toggleSprout();
			},
			go: (k) => {
				if (live()) void commands.go(k);
			},
			isModalOpen: () => ui.modalOpen
		});
		void session.init();
		return () => {
			unbind();
			stopClock();
		};
	});
</script>

<svelte:head>
	<title>{meta.title} · Seedkeep</title>
</svelte:head>

{#if session.status === 'loading'}
	<div class="splash" role="status" aria-live="polite">
		<img src="/logo-mark.png" alt="" width="40" height="40" class="logo" />
		<span>Loading your garden…</span>
	</div>
{:else if session.status === 'error'}
	<div class="splash">
		<section class="retry" aria-labelledby="retry-title">
			<h1 id="retry-title">Couldn’t reach Seedkeep</h1>
			<p role="alert">{session.error || 'Check your connection, then try again.'}</p>
			<button type="button" class="primary" onclick={retry}>Try again</button>
		</section>
	</div>
{:else if showAuthPage}
	{@render children?.()}
{:else if session.status === 'ready' && !authRoute}
	<a class="skip-link" href="#main">Skip to content</a>

	<div id="app-root">
		{#if ui.wide}
			<Sidebar />
		{/if}
		<div class="column">
			{#if !ui.wide}
				<NarrowHeader />
			{/if}
			{#if session.notice}
				<div class="notice" role="status">
					<span class="notice-text">{session.notice}</span>
					<button type="button" class="notice-dismiss" onclick={() => (session.notice = '')}
						>Dismiss</button
					>
				</div>
			{/if}
			<PageHeader title={meta.title} sub={meta.sub} route={key} />
			<main id="main" tabindex="-1">{@render children?.()}</main>
		</div>
	</div>

	<PrintInventory />
	<CommandPalette />
	<AddSeedModal />
	{#if FEATURES.sprout}
		<SproutDrawer />
	{/if}
	<ShortcutsDialog />
{:else}
	<div class="splash" role="status" aria-live="polite">
		<img src="/logo-mark.png" alt="" width="40" height="40" class="logo" />
		<span>Loading your garden…</span>
	</div>
{/if}

<Toast />

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

	/* Programmatic focus target after navigation; no ring on the whole page. */
	main:focus {
		outline: none;
	}

	.splash {
		min-height: 100vh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--bg);
		color: var(--muted);
	}

	.logo {
		width: 40px;
		height: 40px;
		border-radius: 8px;
	}

	.retry {
		width: 100%;
		max-width: 380px;
		display: grid;
		gap: 12px;
		padding: 24px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		color: var(--ink);
	}

	.retry h1 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
	}

	.retry p {
		margin: 0;
		color: var(--warn);
	}

	.primary {
		min-height: 44px;
		border: none;
		border-radius: 6px;
		background: var(--accent);
		color: var(--accentInk);
		font-weight: 600;
		cursor: pointer;
	}

	.primary:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.notice {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin: 12px 22px 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: var(--warnSoft);
		color: var(--warn);
		font-size: 13px;
		min-width: 0;
	}

	.notice-text {
		flex: 1 1 200px;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.notice-dismiss {
		min-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}

	.notice-dismiss:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	@media (max-width: 420px) {
		.notice {
			margin: 12px 16px 0;
		}
	}
</style>

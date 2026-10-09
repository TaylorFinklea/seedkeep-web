<script lang="ts">
	import { page } from '$app/state';
	import { NAV, routeKey } from '$lib/nav';
	import { commands } from '$lib/state/commands';
	import { ui } from '$lib/state/ui.svelte';

	const key = $derived(routeKey(page.url.pathname));
	const themeLabel = $derived(ui.theme === 'dark' ? 'Light' : 'Dark');
	const themeAria = $derived(ui.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
</script>

<header class="narrow">
	<div class="top">
		<img src="/logo-mark.png" alt="" width="26" height="26" class="logo" />
		<div class="brand">
			<span class="name">Seedkeep</span>
			<span class="marker">Sample data</span>
		</div>
		<div class="actions">
			<button type="button" class="search" onclick={() => commands.togglePalette()}>Search</button>
			<button type="button" class="sprout" onclick={() => commands.toggleSprout()}>Sprout</button>
			<button type="button" class="theme" aria-label={themeAria} onclick={() => ui.toggleTheme()}>
				{themeLabel}
			</button>
		</div>
	</div>
	<nav class="pills" aria-label="Main">
		{#each NAV as item (item.key)}
			<a
				class="pill"
				class:active={item.key === key}
				href={item.href}
				aria-current={item.key === key ? 'page' : undefined}>{item.label}</a
			>
		{/each}
	</nav>
</header>

<style>
	.narrow {
		position: sticky;
		top: 0;
		z-index: 30;
		background: var(--panel2);
		border-bottom: 1px solid var(--line);
	}

	.top {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
	}

	.logo {
		flex: none;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		display: block;
	}

	.brand {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-width: 0;
		flex: 1 1 auto;
	}

	.name {
		max-width: 100%;
		font-weight: 700;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.marker {
		font-family: var(--mono);
		font-size: 10px;
		line-height: 1.4;
		color: var(--muted);
		border: 1px solid var(--line2);
		border-radius: 999px;
		padding: 0 6px;
		white-space: nowrap;
	}

	.actions {
		flex: none;
		margin-left: auto;
		display: flex;
		flex-wrap: nowrap;
		gap: 6px;
	}

	.search,
	.theme {
		flex: none;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 8px;
		color: var(--muted);
		white-space: nowrap;
		cursor: pointer;
	}

	.theme {
		background: none;
		border-color: var(--line2);
		font-size: 12px;
		padding: 5px 7px;
	}

	.sprout {
		flex: none;
		background: var(--accentSoft);
		border: none;
		border-radius: 6px;
		padding: 6px 8px;
		color: var(--accent);
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}

	.pills {
		display: flex;
		gap: 2px;
		overflow-x: auto;
		/* Room for the 2px focus outline so it is not clipped by the scroller. */
		padding: 6px 10px 8px;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.pills::-webkit-scrollbar {
		display: none;
	}

	.pill {
		flex: none;
		display: inline-flex;
		align-items: center;
		border-radius: 6px;
		padding: 6px 10px;
		color: var(--ink);
		text-decoration: none;
		white-space: nowrap;
	}

	.pill:hover {
		background: var(--sel);
		text-decoration: none;
	}

	.pill:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.pill.active {
		background: var(--sel);
		font-weight: 600;
	}
</style>

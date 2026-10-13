<script lang="ts">
	import { page } from '$app/state';
	import { NAV, navCount, routeKey } from '$lib/nav';
	import { FEATURES } from '$lib/config';
	import { commands } from '$lib/state/commands';
	import { garden } from '$lib/state/garden.svelte';
	import { session } from '$lib/state/session.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const key = $derived(routeKey(page.url.pathname));
	const items = $derived(NAV.map((n) => ({ ...n, count: navCount(n.key, garden) })));
	const themeLabel = $derived(ui.theme === 'dark' ? 'Light' : 'Dark');
	const themeAria = $derived(ui.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');

	async function switchHousehold(id: string): Promise<void> {
		try {
			await session.selectHousehold(id);
		} catch (e) {
			ui.showToast(
				e instanceof Error && e.message ? e.message : 'Couldn’t switch gardens. Try again.'
			);
		}
	}
</script>

<aside class="sidebar">
	<div class="brand">
		<img src="/logo-mark.png" alt="" width="26" height="26" class="logo" />
		<span class="name">Seedkeep</span>
		{#if garden.home.hasLocation}
			<span class="zip">{garden.home.zip}</span>
		{/if}
	</div>

	<div class="household">
		{#if session.households.length > 1}
			<label class="household-label">
				<span class="sr-only-label">Household</span>
				<select
					class="household-select"
					value={session.householdId}
					onchange={(e) => void switchHousehold(e.currentTarget.value)}
				>
					{#each session.households as household (household.id)}
						<option value={household.id}>{household.name}</option>
					{/each}
				</select>
			</label>
		{:else}
			<div class="household-name">{session.household?.name ?? ''}</div>
		{/if}
	</div>

	<button type="button" class="search" onclick={() => commands.togglePalette()}>
		<span>Search or command</span>
		<span class="kbd">⌘K</span>
	</button>

	<nav class="nav" aria-label="Main">
		{#each items as item (item.key)}
			<a
				class="nav-item"
				class:active={item.key === key}
				href={item.href}
				aria-current={item.key === key ? 'page' : undefined}
			>
				<span class="grow">{item.label}</span>
				{#if item.count !== ''}
					<span class="mono count">{item.count}</span>
				{/if}
				<span class="mono chord">{item.chord}</span>
			</a>
		{/each}
	</nav>

	<div class="section-label">Tools</div>
	<div class="tools">
		{#if FEATURES.csvImport}
			<button type="button" class="tool" onclick={() => commands.importCSV()}>Import CSV</button>
		{/if}
		<button type="button" class="tool" onclick={() => commands.exportCSV()}>Export CSV</button>
		<button type="button" class="tool" onclick={() => commands.printInventory()}
			>Print inventory</button
		>
		<button type="button" class="tool" onclick={() => commands.openShortcuts()}>
			<span class="grow">Keyboard shortcuts</span>
			<span class="mono hint">?</span>
		</button>
	</div>

	<div class="footer">
		{#if FEATURES.sprout}
			<button type="button" class="sprout" onclick={() => commands.toggleSprout()}>
				<span>Ask Sprout</span>
				<span class="mono hint">A</span>
			</button>
		{/if}
		<div class="user">
			<span class="name-user" title={session.user?.email ?? ''}>{session.user?.email ?? ''}</span>
			<button type="button" class="theme" aria-label={themeAria} onclick={() => ui.toggleTheme()}>
				{themeLabel}
			</button>
		</div>
	</div>
</aside>

<style>
	.sidebar {
		flex: 0 0 228px;
		position: sticky;
		top: 0;
		height: 100vh;
		border-right: 1px solid var(--line);
		background: var(--panel2);
		display: flex;
		flex-direction: column;
		padding: 14px 10px;
		overflow-y: auto;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 4px 8px 14px;
	}

	.logo {
		width: 26px;
		height: 26px;
		border-radius: 6px;
		display: block;
	}

	.name {
		font-weight: 700;
		font-size: 15px;
		letter-spacing: -0.01em;
	}

	.zip {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--faint);
	}

	.mono {
		font-family: var(--mono);
	}

	.grow {
		flex: 1;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 7px 9px;
		cursor: pointer;
		color: var(--muted);
		margin-bottom: 12px;
		white-space: nowrap;
	}

	.search > span:first-child {
		flex: 1;
		text-align: left;
	}

	.kbd {
		font-family: var(--mono);
		font-size: 11px;
		border: 1px solid var(--line2);
		border-radius: 4px;
		padding: 0 4px;
	}

	.nav {
		display: grid;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		border-radius: 6px;
		padding: 7px 9px;
		color: var(--ink);
		text-decoration: none;
		font-weight: 400;
	}

	.nav-item.active {
		background: var(--sel);
		font-weight: 600;
	}

	.nav-item:hover {
		background: var(--sel);
		text-decoration: none;
	}

	.count {
		font-size: 11px;
		color: var(--faint);
	}

	.chord {
		font-size: 10px;
		color: var(--faint);
		min-width: 22px;
		text-align: right;
		white-space: nowrap;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--faint);
		padding: 20px 9px 6px;
	}

	.tools {
		display: grid;
		gap: 2px;
	}

	.tool {
		display: flex;
		align-items: center;
		text-align: left;
		background: none;
		border: none;
		border-radius: 6px;
		padding: 6px 9px;
		cursor: pointer;
		color: var(--muted);
	}

	.tool:hover {
		background: var(--sel);
	}

	.hint {
		font-size: 10px;
		color: var(--faint);
	}

	.footer {
		margin-top: auto;
		display: grid;
		gap: 6px;
		border-top: 1px solid var(--line);
		padding-top: 12px;
	}

	.sprout {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--accentSoft);
		border: none;
		border-radius: 6px;
		padding: 8px 9px;
		cursor: pointer;
		color: var(--accent);
		font-weight: 600;
	}

	.sprout > span:first-child {
		flex: 1;
		text-align: left;
	}

	.user {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 9px;
		color: var(--muted);
		font-size: 13px;
		white-space: nowrap;
	}

	.name-user {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.household {
		padding: 0 8px 12px;
	}

	.household-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.household-label {
		display: block;
	}

	.household-select {
		width: 100%;
		min-height: 32px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		font: inherit;
		font-size: 13px;
		padding: 4px 6px;
	}

	.sr-only-label {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}

	@media (max-width: 899px), (pointer: coarse) {
		.household-select,
		.tool,
		.nav-item,
		.search,
		.sprout,
		.theme {
			min-height: 44px;
		}
	}

	.theme {
		background: none;
		border: 1px solid var(--line2);
		border-radius: 5px;
		padding: 2px 8px;
		cursor: pointer;
		font-size: 12px;
		color: var(--muted);
	}

	.theme:hover {
		background: var(--sel);
	}
</style>

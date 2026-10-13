<script lang="ts">
	import { page } from '$app/state';
	import { NAV, routeKey } from '$lib/nav';
	import { FEATURES } from '$lib/config';
	import { commands } from '$lib/state/commands';
	import { session } from '$lib/state/session.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const key = $derived(routeKey(page.url.pathname));
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

<header class="narrow">
	<div class="top">
		<img src="/logo-mark.png" alt="" width="26" height="26" class="logo" />
		<div class="brand">
			<span class="name">Seedkeep</span>
			{#if session.households.length > 1}
				<select
					class="household-select"
					aria-label="Household"
					value={session.householdId}
					onchange={(e) => void switchHousehold(e.currentTarget.value)}
				>
					{#each session.households as household (household.id)}
						<option value={household.id}>{household.name}</option>
					{/each}
				</select>
			{:else if session.household}
				<span class="household" title={session.user?.email ?? ''}>{session.household.name}</span>
			{/if}
		</div>
		<div class="actions">
			<button type="button" class="search" onclick={() => commands.togglePalette()}>Search</button>
			{#if FEATURES.sprout}
				<button type="button" class="sprout" onclick={() => commands.toggleSprout()}>Sprout</button>
			{/if}
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

	.household {
		max-width: 100%;
		font-size: 12px;
		line-height: 1.4;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.household-select {
		max-width: 100%;
		min-height: 44px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		font: inherit;
		font-size: 12px;
		padding: 4px 6px;
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
		min-height: 44px;
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
		min-height: 44px;
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
		min-height: 44px;
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

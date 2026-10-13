<script lang="ts">
	import { FEATURES } from '$lib/config';
	import { ApiError } from '$lib/api';
	import { garden } from '$lib/state/garden.svelte';
	import { session } from '$lib/state/session.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import type { Provider } from '$lib/domain/types';

	let zipDraft = $state(garden.home.zip);
	let keyDraft = $state('');
	let locationDraft = $state('');
	let tagDraft = $state('');
	let signingOut = $state(false);

	const locationRows = $derived(
		garden.locations.map((location) => ({
			...location,
			count: garden.seeds.filter((seed) => seed.loc === location.id).length
		}))
	);
	const tagRows = $derived(
		garden.tags.map((tag) => ({
			...tag,
			count: garden.seeds.filter((seed) => seed.tags.includes(tag.id)).length
		}))
	);

	function messageOf(e: unknown, fallback: string): string {
		if (e instanceof ApiError && e.message) return e.message;
		if (e instanceof Error && e.message) return e.message;
		return fallback;
	}

	async function saveZip(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const zip = zipDraft.trim();
		if (!/^\d{5}$/.test(zip)) {
			ui.showToast('Enter a 5-digit ZIP.');
			return;
		}
		try {
			const saved = await garden.saveZip(zip);
			ui.showToast(
				saved
					? 'Home ZIP saved. Frost dates, daylight and planting windows now use it.'
					: 'Couldn’t save that ZIP. Try again.'
			);
		} catch (e) {
			ui.showToast(messageOf(e, 'Couldn’t save that ZIP. Try again.'));
		}
	}

	function saveKey(event: SubmitEvent): void {
		event.preventDefault();
		if (!garden.saveKey(keyDraft)) {
			ui.showToast('Paste a key first.');
			return;
		}
		keyDraft = '';
		ui.showToast('Saved a masked preview. The key itself was discarded.');
	}

	async function addLocation(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		try {
			const location = await garden.addLocation(locationDraft);
			if (!location) {
				ui.showToast('Enter a new, unique location name.');
				return;
			}
			locationDraft = '';
		} catch (e) {
			ui.showToast(messageOf(e, 'Couldn’t add that location. Try again.'));
		}
	}

	async function addTag(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		try {
			const tag = await garden.addTag(tagDraft);
			if (!tag) {
				ui.showToast('Enter a new, unique tag name.');
				return;
			}
			tagDraft = '';
		} catch (e) {
			ui.showToast(messageOf(e, 'Couldn’t add that tag. Try again.'));
		}
	}

	async function signOut(): Promise<void> {
		if (signingOut) return;
		signingOut = true;
		try {
			await session.signOut();
		} catch (e) {
			ui.showToast(messageOf(e, 'Couldn’t sign out. Try again.'));
		} finally {
			signingOut = false;
		}
	}

	function setProvider(provider: Provider): void {
		garden.setProvider(provider);
	}
</script>

<div class="settings-grid">
	<section class="panel">
		<h2>Home location</h2>
		<p>Your ZIP sets frost dates, daylight and planting windows.</p>
		<form class="form-row" onsubmit={saveZip}>
			<label class="sr-only" for="home-zip">Home ZIP</label>
			<input
				id="home-zip"
				bind:value={zipDraft}
				inputmode="numeric"
				maxlength="5"
				aria-label="Home ZIP"
			/>
			<button class="primary" type="submit">Save</button>
			{#if garden.home.hasLocation}
				<span class="home">{garden.home.place} · Zone {garden.home.zone}</span>
			{:else}
				<span class="home">No home ZIP yet</span>
			{/if}
		</form>
	</section>

	{#if FEATURES.aiKey}
		<section class="panel">
			<h2>AI provider</h2>
			<p>
				Only a masked preview stays in this tab. The key itself is discarded after saving and never
				sent.
			</p>
			<div class="segmented" role="group" aria-label="AI provider">
				{#each ['Anthropic', 'OpenAI'] as provider (provider)}
					<button
						type="button"
						aria-pressed={garden.key.provider === provider}
						class:chosen={garden.key.provider === provider}
						onclick={() => setProvider(provider as Provider)}>{provider}</button
					>
				{/each}
			</div>
			{#if garden.key.saved}
				<div class="saved-key">
					<span>{garden.key.masked}</span><button
						class="text-danger"
						type="button"
						onclick={() => garden.removeKey()}>Remove</button
					>
				</div>
			{/if}
			<form class="form-row key-form" onsubmit={saveKey}>
				<label class="sr-only" for="api-key">API key</label>
				<input
					id="api-key"
					class="mono"
					type="password"
					autocomplete="off"
					placeholder="Paste API key"
					bind:value={keyDraft}
				/>
				<button type="submit">Save key</button>
			</form>
		</section>
	{/if}

	<section class="panel">
		<h2>Storage locations</h2>
		<div class="rows">
			{#each locationRows as location (location.id)}
				<div class="item-row">
					<span class="item-name">{location.name}</span><span class="item-actions"
						><span class="count">{location.count}</span><button
							class="remove"
							type="button"
							aria-label="Remove location {location.name}"
							onclick={() => garden.removeLocation(location.id)}>×</button
						></span
					>
				</div>
			{/each}
		</div>
		<form class="form-row add-form" onsubmit={addLocation}>
			<label class="sr-only" for="new-location">New location</label>
			<input id="new-location" placeholder="New location" bind:value={locationDraft} />
			<button type="submit">Add</button>
		</form>
	</section>

	<section class="panel">
		<h2>Tags</h2>
		<div class="pills">
			{#each tagRows as tag (tag.id)}
				<span class="pill"
					><span class="item-name">{tag.name}</span><span class="pill-count">{tag.count}</span
					><button
						class="remove"
						type="button"
						aria-label="Remove tag {tag.name}"
						onclick={() => garden.removeTag(tag.id)}>×</button
					></span
				>
			{/each}
		</div>
		<form class="form-row add-form" onsubmit={addTag}>
			<label class="sr-only" for="new-tag">New tag</label>
			<input id="new-tag" placeholder="New tag" bind:value={tagDraft} />
			<button type="submit">Add</button>
		</form>
	</section>

	{#if FEATURES.catalogCorrections}
		<section class="panel">
			<h2>Catalog corrections</h2>
			<p class="caption">New corrections stay in this browser.</p>
			{#if garden.contributions.length}
				{#each garden.contributions as contribution (contribution.id)}
					<div class="contribution">
						<div class="contribution-head">
							<strong>{contribution.seed}</strong><span class="status">{contribution.status}</span>
						</div>
						<div class="change">{contribution.change}</div>
						<div class="when">{contribution.when}</div>
					</div>
				{/each}
			{:else}<p class="empty">No corrections yet.</p>{/if}
		</section>
	{/if}

	<section class="panel">
		<h2>Account</h2>
		<dl class="account">
			<dt>Email</dt>
			<dd>{session.user?.email ?? ''}</dd>
			<dt>Household</dt>
			<dd>{session.household?.name ?? ''}</dd>
		</dl>
		<button class="sign-out" type="button" disabled={signingOut} onclick={signOut}
			>{signingOut ? 'Signing out…' : 'Sign out'}</button
		>
	</section>
</div>

<style>
	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
		gap: 14px;
		align-items: start;
	}
	.panel {
		min-width: 0;
		padding: 14px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
	}
	h2 {
		margin: 0 0 6px;
		font-size: 14px;
		font-weight: 700;
	}
	p {
		margin: 4px 0 10px;
		color: var(--muted);
	}
	.form-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	input {
		min-width: 0;
		width: 100px;
		padding: 6px 8px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
	}
	button {
		cursor: pointer;
	}
	.form-row > button {
		padding: 6px 12px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.primary {
		border-color: var(--accent) !important;
		background: var(--accent) !important;
		color: var(--accentInk) !important;
		font-weight: 600;
	}
	.home {
		color: var(--muted);
	}
	.segmented {
		display: flex;
		width: max-content;
		max-width: 100%;
		padding: 2px;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--panel2);
	}
	.segmented button {
		padding: 5px 12px;
		border: 0;
		border-radius: 5px;
		background: transparent;
		color: var(--ink);
	}
	.segmented button.chosen {
		background: var(--panel);
		font-weight: 600;
	}
	.saved-key {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		font-size: 12.5px;
		overflow-wrap: anywhere;
	}
	.text-danger,
	.remove {
		border: 0;
		background: transparent;
		color: var(--warn);
	}
	.key-form {
		margin-top: 10px;
		flex-wrap: nowrap;
	}
	.key-form input {
		flex: 1;
		width: auto;
	}
	.item-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid var(--line);
	}
	.item-name {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.item-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.count {
		color: var(--muted);
		font-size: 12px;
	}
	.remove {
		color: var(--faint);
		font-size: 18px;
	}
	.add-form {
		margin-top: 10px;
		flex-wrap: nowrap;
	}
	.add-form input {
		flex: 1;
		width: auto;
	}
	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.pill {
		display: inline-flex;
		max-width: 100%;
		min-width: 0;
		align-items: center;
		gap: 4px;
		padding: 2px 4px 2px 10px;
		border-radius: 12px;
		background: var(--accentSoft);
		color: var(--accent);
		font-weight: 500;
	}
	.pill-count {
		font: 11px var(--mono);
		opacity: 0.7;
	}
	.pill button {
		padding: 0 4px;
		border: 0;
		background: transparent;
		color: inherit;
	}
	@media (max-width: 899px), (pointer: coarse) {
		.remove {
			min-width: 44px;
		}
	}
	.caption {
		margin: 0 0 6px;
		font-size: 13px;
		color: var(--muted);
	}
	.status {
		padding: 1px 8px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--panel2);
		font-size: 12px;
		white-space: nowrap;
	}
	.change {
		color: var(--muted);
		font-size: 12px;
	}
	.when {
		color: var(--faint);
		font-size: 12px;
	}
	.empty {
		margin: 4px 0 0;
	}
	.account {
		display: grid;
		grid-template-columns: 90px minmax(0, 1fr);
		gap: 6px 10px;
		margin: 0;
	}
	.account dt {
		color: var(--muted);
	}
	.account dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.sign-out {
		margin-top: 12px;
		padding: 5px 12px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: transparent;
		color: var(--warn);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>

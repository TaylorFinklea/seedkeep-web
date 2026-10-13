<!-- First household ("garden") setup. Shown without the app shell when the signed-in user has no household. -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError } from '$lib/api';
	import { session } from '$lib/state/session.svelte';

	let name = $state('');
	let zip = $state('');
	let error = $state('');
	let busy = $state(false);

	function messageOf(e: unknown, fallback: string): string {
		if (e instanceof ApiError && e.message) return e.message;
		if (e instanceof Error && e.message) return e.message;
		return fallback;
	}

	async function create(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const gardenName = name.trim();
		const zipCode = zip.trim();
		if (!gardenName) {
			error = 'Give your garden a name.';
			return;
		}
		if (zipCode && !/^\d{5}$/.test(zipCode)) {
			error = 'Home ZIP must be 5 digits, or leave it blank for now.';
			return;
		}
		busy = true;
		error = '';
		try {
			// A ZIP that fails to save is reported through session.notice in the app shell.
			await session.createHousehold(gardenName, zipCode || undefined);
			await goto('/', { replaceState: true });
		} catch (e) {
			error = messageOf(e, 'Couldn’t create your garden. Try again.');
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Set up your garden · Seedkeep</title>
</svelte:head>

<div class="auth">
	<section class="panel" aria-labelledby="onboarding-title">
		<header class="brand">
			<img src="/logo-mark.png" alt="" width="36" height="36" class="logo" />
			<span class="name">Seedkeep</span>
		</header>

		<h1 id="onboarding-title">Set up your garden</h1>
		<p class="lede">
			Name your garden. Add a home ZIP now or later, and it sets frost dates and planting windows.
		</p>

		{#if error}
			<p class="alert" role="alert">{error}</p>
		{/if}

		<form class="stack" onsubmit={create} novalidate>
			<label class="field">
				<span>Garden name <span class="req" aria-hidden="true">(required)</span></span>
				<input
					type="text"
					name="name"
					autocomplete="organization"
					bind:value={name}
					required
					aria-required="true"
				/>
			</label>
			<label class="field">
				<span>Home ZIP (optional)</span>
				<input
					type="text"
					name="zip"
					inputmode="numeric"
					autocomplete="postal-code"
					maxlength="5"
					class="mono"
					bind:value={zip}
				/>
			</label>
			<button type="submit" class="primary" disabled={busy}
				>{busy ? 'Creating…' : 'Create garden'}</button
			>
		</form>
	</section>
</div>

<style>
	.auth {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 16px;
		background: var(--bg);
		color: var(--ink);
	}

	.panel {
		width: 100%;
		max-width: 420px;
		padding: 24px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.12);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 18px;
	}

	.logo {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		display: block;
	}

	.name {
		font-weight: 700;
		font-size: 17px;
		letter-spacing: -0.01em;
	}

	h1 {
		margin: 0 0 6px;
		font-size: 20px;
		font-weight: 700;
	}

	.lede {
		margin: 0 0 14px;
		color: var(--muted);
		font-size: 13px;
	}

	.alert {
		margin: 0 0 12px;
		padding: 8px 10px;
		border-radius: 6px;
		background: var(--warnSoft);
		color: var(--warn);
		font-size: 13px;
	}

	.stack {
		display: grid;
		gap: 12px;
	}

	.field {
		display: grid;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.req {
		font-weight: 400;
		color: var(--faint);
	}

	.field input {
		width: 100%;
		min-height: 44px;
		box-sizing: border-box;
		padding: 8px 10px;
		border: 1px solid var(--line2);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		font: inherit;
		font-size: 15px;
		font-weight: 400;
	}

	.mono {
		font-family: var(--mono);
	}

	.primary {
		min-height: 44px;
		border: none;
		border-radius: 6px;
		background: var(--accent);
		color: var(--accentInk);
		font-weight: 600;
		font-size: 15px;
		cursor: pointer;
	}

	.primary:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
</style>

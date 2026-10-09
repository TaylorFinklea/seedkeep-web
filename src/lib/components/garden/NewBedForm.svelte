<!-- "+ New bed" toggle and inline form (export lines 219–221, 510–511). Owns its toggle. -->
<script lang="ts">
	import { tick } from 'svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';

	const ERROR_ID = 'new-bed-error';

	let open = $state(false);
	let toggleEl: HTMLButtonElement | undefined = $state();
	let name = $state('');
	let w = $state('4');
	let l = $state('8');
	let error = $state('');
	let wInvalid = $state(false);
	let lInvalid = $state(false);
	let wEl: HTMLInputElement | undefined = $state();
	let lEl: HTMLInputElement | undefined = $state();

	/** A whole number from 1 to 20, or null. */
	function parseDim(raw: string): number | null {
		const text = raw.trim();
		if (!/^\d+$/.test(text)) return null;
		const n = Number(text);
		return n >= 1 && n <= 20 ? n : null;
	}

	/** Close the form and return focus to the toggle, because the form's focused control unmounts. */
	async function close(): Promise<void> {
		error = '';
		wInvalid = false;
		lInvalid = false;
		open = false;
		await tick();
		toggleEl?.focus();
	}

	function add(event: SubmitEvent): void {
		event.preventDefault();
		const width = parseDim(w);
		const length = parseDim(l);
		wInvalid = width === null;
		lInvalid = length === null;
		if (width === null || length === null) {
			if (wInvalid && lInvalid) error = 'Width and length must be whole numbers from 1 to 20.';
			else if (wInvalid) error = 'Width must be a whole number from 1 to 20.';
			else error = 'Length must be a whole number from 1 to 20.';
			(wInvalid ? wEl : lEl)?.focus();
			return;
		}
		const bed = garden.addBed({ name: name.trim(), w: width, l: length });
		ui.garden.bedId = bed.id;
		ui.garden.selEv = null;
		ui.showToast(`Added ${bed.name}.`);
		name = '';
		w = '4';
		l = '8';
		void close();
	}

	function cancel(): void {
		void close();
	}

	/** Listen for Escape on the form node. Attached as an action so no template key handler is needed. */
	function escapeWithin(node: HTMLElement) {
		const listener = (e: KeyboardEvent) => onFormKeydown(e);
		node.addEventListener('keydown', listener);
		return { destroy: () => node.removeEventListener('keydown', listener) };
	}

	/** Escape inside the open form closes it, and stops the global handler from also acting. */
	function onFormKeydown(e: KeyboardEvent): void {
		if (e.key !== 'Escape') return;
		e.stopPropagation();
		e.preventDefault();
		cancel();
	}
</script>

<div class="new-bed">
	<button
		type="button"
		class="toggle"
		aria-expanded={open}
		aria-controls="new-bed-form"
		bind:this={toggleEl}
		onclick={() => (open = !open)}>+ New bed</button
	>

	{#if open}
		<form id="new-bed-form" class="form" onsubmit={add} use:escapeWithin>
			<label class="field name-field">
				<span>Bed name</span>
				<input type="text" bind:value={name} placeholder="New bed" autocomplete="off" />
			</label>
			<label class="field dim-field">
				<span>W ft</span>
				<input
					type="text"
					inputmode="numeric"
					bind:this={wEl}
					bind:value={w}
					aria-describedby={wInvalid ? ERROR_ID : undefined}
					aria-invalid={wInvalid ? 'true' : undefined}
				/>
			</label>
			<label class="field dim-field">
				<span>L ft</span>
				<input
					type="text"
					inputmode="numeric"
					bind:this={lEl}
					bind:value={l}
					aria-describedby={lInvalid ? ERROR_ID : undefined}
					aria-invalid={lInvalid ? 'true' : undefined}
				/>
			</label>
			<div class="actions">
				<button type="submit" class="add">Add</button>
				<button type="button" class="cancel" onclick={cancel}>Cancel</button>
			</div>
			{#if error}
				<p id={ERROR_ID} class="error" role="alert">{error}</p>
			{/if}
		</form>
	{/if}
</div>

<style>
	.new-bed {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px;
	}

	.toggle {
		background: var(--panel);
		border: 1px dashed var(--line2);
		border-radius: 6px;
		padding: 5px 11px;
		color: var(--muted);
		cursor: pointer;
	}

	.toggle:hover {
		background: var(--sel);
	}

	.form {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 6px;
	}

	.field {
		display: grid;
		gap: 2px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.field input {
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 5px 8px;
		background: var(--panel);
		color: var(--ink);
		font-weight: 400;
		font-size: 14px;
	}

	.name-field input {
		width: 150px;
	}

	.dim-field input {
		width: 60px;
		font-family: var(--mono);
	}

	.field input[aria-invalid='true'] {
		border-color: var(--warn);
	}

	.actions {
		display: flex;
		gap: 6px;
	}

	.add {
		background: var(--accent);
		color: var(--accentInk);
		border: none;
		border-radius: 6px;
		padding: 5px 11px;
		font-weight: 600;
		cursor: pointer;
	}

	.cancel {
		background: var(--panel);
		color: var(--muted);
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 5px 11px;
		cursor: pointer;
	}

	.error {
		flex-basis: 100%;
		margin: 0;
		font-size: 12.5px;
		color: var(--warn);
	}
</style>

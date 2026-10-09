<!-- Add seed modal (export lines 333–352). Renders addFlow state and calls its methods.
	The flow is reset when the modal opens and disposed when it closes or unmounts. -->
<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { addFlow } from '$lib/state/addFlow.svelte';
	import { ui, type AddMode } from '$lib/state/ui.svelte';

	const open = $derived(ui.isOpen('add'));
	let wasOpen = false;

	let dropEl: HTMLElement | undefined = $state();
	let previewEl: HTMLElement | undefined = $state();
	let fieldsEl: HTMLElement | undefined = $state();

	$effect(() => {
		const now = open;
		if (now && !wasOpen) untrack(() => addFlow.reset());
		else if (!now && wasOpen) untrack(() => addFlow.dispose());
		wasOpen = now;
	});

	// Focus management: a reading or scanning phase moves focus to its wrapper, because the
	// button that started it may be unmounted or disabled. A fill that finishes moves focus to Name.
	let lastPhase: string = 'idle';
	$effect(() => {
		const phase = addFlow.phase;
		const banner = addFlow.banner;
		const mode = addFlow.mode;
		const prev = lastPhase;
		lastPhase = phase;
		untrack(() => {
			if (phase === 'reading' || phase === 'scanning') {
				void tick().then(() => (phase === 'reading' ? dropEl : previewEl)?.focus());
			} else if (phase === 'idle' && prev !== 'idle' && banner && mode === 'manual') {
				void tick().then(() => fieldsEl?.querySelector<HTMLInputElement>('input[name="name"]')?.focus());
			}
		});
	});

	onDestroy(() => addFlow.dispose());

	const TABS: { mode: AddMode; label: string }[] = [
		{ mode: 'manual', label: 'Type it in' },
		{ mode: 'photo', label: 'From a photo' },
		{ mode: 'scan', label: 'Scan a barcode' }
	];
</script>

<Dialog variant="modal" width="640px" labelledby="add-seed-title" {open} onclose={() => addFlow.close()}>
	<div class="head">
		<h2 id="add-seed-title">Add a seed</h2>
		<button type="button" class="close" aria-label="Close" onclick={() => addFlow.close()}>×</button>
	</div>

	<div class="body">
		<div class="tabs" role="group" aria-label="How to add">
			{#each TABS as tab (tab.mode)}
				<button
					type="button"
					class="tab"
					aria-pressed={addFlow.mode === tab.mode}
					onclick={() => addFlow.setMode(tab.mode)}>{tab.label}</button
				>
			{/each}
		</div>

		<!-- One permanent live region, so the demo-honesty banner is announced when it appears. -->
		<div class="live" role="status" aria-live="polite">
			{#if addFlow.banner}
				<div class="banner">
					{#each addFlow.files as url (url)}
						<img src={url} alt="" width="38" height="38" class="thumb" />
					{/each}
					<span>{addFlow.banner}</span>
				</div>
			{/if}
		</div>

		{#if addFlow.mode === 'photo'}
			<div
				class="drop"
				role="group"
				aria-label="Packet photo drop zone"
				class:over={addFlow.over}
				tabindex="-1"
				bind:this={dropEl}
				ondragover={(e) => addFlow.onDragOver(e)}
				ondragleave={() => addFlow.onDragLeave()}
				ondrop={(e) => addFlow.onDrop(e)}
			>
				{#if addFlow.phase === 'reading'}
					<p class="mono muted">reading sample (demo)…</p>
				{:else}
					<div class="drop-title">Drop packet photos here</div>
					<p class="muted">JPG or PNG. Photos stay in this browser.</p>
					<div class="drop-actions">
						<button type="button" class="primary" onclick={() => addFlow.pickFiles()}>Choose files</button>
						<button type="button" class="secondary" onclick={() => addFlow.useSample()}>Use sample</button>
					</div>
				{/if}
			</div>
		{:else if addFlow.mode === 'scan'}
			<div class="scan" tabindex="-1" bind:this={previewEl}>
				<div class="preview" aria-hidden="true">
					<span class="frame"></span>
					<span class="cap mono">camera preview</span>
				</div>
				<p class="mono muted status">
					{addFlow.phase === 'scanning' ? 'simulating scan…' : 'center the barcode in the frame'}
				</p>
				<div class="center">
					<button type="button" class="primary" disabled={addFlow.phase === 'scanning'} onclick={() => addFlow.startScan()}
						>Simulate scan (demo)</button
					>
				</div>
			</div>
		{:else}
			<div class="fields" bind:this={fieldsEl}>
				{#each addFlow.fields as field (field.key)}
					<label class="field">
						<span>{field.label}</span>
						{#if field.options}
							<select
								name={field.key}
								value={addFlow.form[field.key]}
								onchange={(e) => addFlow.setField(field.key, e.currentTarget.value)}
							>
								{#each field.options as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						{:else}
							<input
								type="text"
								name={field.key}
								value={addFlow.form[field.key]}
								placeholder={field.placeholder}
								oninput={(e) => addFlow.setField(field.key, e.currentTarget.value)}
							/>
						{/if}
					</label>
				{/each}
			</div>

			<label class="field notes">
				<span>Notes</span>
				<textarea value={addFlow.form.notes} oninput={(e) => addFlow.setField('notes', e.currentTarget.value)}></textarea>
			</label>

			{#if addFlow.error}
				<p class="error" role="alert">{addFlow.error}</p>
			{/if}

			<div class="footer">
				<button type="button" class="secondary" onclick={() => addFlow.close()}>Cancel</button>
				<button type="button" class="primary" disabled={!addFlow.canSave} onclick={() => addFlow.save()}>Save seed</button>
			</div>
		{/if}
	</div>
</Dialog>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		border-bottom: 1px solid var(--line);
	}

	h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
	}

	.close {
		background: none;
		border: none;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		color: var(--muted);
	}

	.body {
		padding: 14px 16px;
	}

	.tabs {
		display: flex;
		background: var(--panel2);
		border: 1px solid var(--line);
		border-radius: 7px;
		padding: 2px;
		margin-bottom: 14px;
		overflow-x: auto;
	}

	.tab {
		flex: 1 0 auto;
		background: transparent;
		border: none;
		border-radius: 5px;
		padding: 6px 10px;
		cursor: pointer;
		font-weight: 400;
		white-space: nowrap;
	}

	.tab[aria-pressed='true'] {
		background: var(--panel);
		font-weight: 600;
	}

	.live:empty {
		display: none;
	}

	.drop {
		border: 1.5px dashed var(--line2);
		background: var(--panel2);
		border-radius: 10px;
		padding: 40px 16px;
		text-align: center;
	}

	.drop.over {
		background: var(--sel);
	}

	.drop:focus,
	.scan:focus {
		outline: none;
	}

	.drop:focus-visible,
	.scan:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.drop-title {
		font-weight: 600;
		font-size: 15px;
	}

	.drop p {
		margin: 4px 0 14px;
	}

	.drop-actions {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.preview {
		position: relative;
		aspect-ratio: 16 / 9;
		border-radius: 10px;
		overflow: hidden;
		background: repeating-linear-gradient(135deg, var(--panel2) 0 10px, var(--line) 10px 20px);
		display: grid;
		place-items: center;
	}

	.frame {
		width: 60%;
		height: 32%;
		border: 2px solid var(--accent);
		border-radius: 6px;
	}

	.cap {
		position: absolute;
		top: 10px;
		left: 12px;
		font-size: 11px;
		color: var(--muted);
	}

	.status {
		margin: 10px 0 0;
		text-align: center;
	}

	.center {
		display: flex;
		justify-content: center;
		margin-top: 12px;
	}

	.banner {
		display: flex;
		gap: 10px;
		align-items: center;
		background: var(--accentSoft);
		color: var(--accent);
		border-radius: 8px;
		padding: 8px 10px;
		margin-bottom: 12px;
	}

	.thumb {
		width: 38px;
		height: 38px;
		object-fit: cover;
		border-radius: 4px;
		flex: none;
	}

	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
		gap: 10px 12px;
	}

	.field {
		display: grid;
		gap: 3px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.field input,
	.field select,
	.field textarea {
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 6px 8px;
		background: var(--panel);
		color: var(--ink);
		font-weight: 400;
		font-size: 14px;
	}

	.notes {
		margin-top: 10px;
	}

	.notes textarea {
		min-height: 60px;
		resize: vertical;
	}

	.error {
		color: var(--warn);
		margin: 10px 0 0;
	}

	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 14px;
	}

	.primary {
		background: var(--accent);
		color: var(--accentInk);
		border: none;
		border-radius: 6px;
		padding: 6px 12px;
		cursor: pointer;
		font-weight: 600;
	}

	.primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.secondary {
		background: var(--panel);
		color: var(--ink);
		border: 1px solid var(--line2);
		border-radius: 6px;
		padding: 6px 12px;
		cursor: pointer;
	}

	.mono {
		font-family: var(--mono);
	}

	.muted {
		color: var(--muted);
	}
</style>

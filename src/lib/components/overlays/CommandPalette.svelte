<script lang="ts">
	import { tick } from 'svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { garden } from '$lib/state/garden.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { filterItems, paletteItems, type PaletteItem } from '$lib/state/palette';

	let q = $state('');
	let index = $state(0);
	let wasOpen = false;
	const open = $derived(ui.isOpen('palette'));
	const items = $derived(paletteItems(garden));
	const results = $derived(filterItems(items, q));
	const activeIndex = $derived(Math.min(index, Math.max(0, results.length - 1)));
	const activeId = $derived(results.length ? `palette-option-${activeIndex}` : undefined);
	$effect(() => {
		if (open && !wasOpen) {
			q = '';
			index = 0;
		}
		wasOpen = open;
	});

	async function run(item: PaletteItem): Promise<void> {
		ui.close('palette');
		await tick();
		await item.run();
		await tick();
		if (
			(item.group === 'Go to' || item.group === 'Bed') &&
			(document.activeElement === document.body || !document.activeElement?.isConnected)
		) {
			document.querySelector<HTMLElement>('#main')?.focus();
		}
	}
	async function keydown(event: KeyboardEvent): Promise<void> {
		if (event.isComposing) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			index = Math.min(activeIndex + 1, results.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			index = Math.max(activeIndex - 1, 0);
		} else if (event.key === 'Enter' && results[activeIndex]) {
			event.preventDefault();
			void run(results[activeIndex]);
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			await tick();
			document
				.getElementById(`palette-option-${activeIndex}`)
				?.scrollIntoView({ block: 'nearest' });
		}
	}
</script>

<Dialog
	variant="palette"
	width="580px"
	label="Command menu"
	{open}
	onclose={() => ui.close('palette')}
	initialFocus="#palette-query"
>
	<div class="content">
		<input
			id="palette-query"
			bind:value={q}
			oninput={() => (index = 0)}
			onkeydown={keydown}
			role="combobox"
			aria-label="Search commands and seeds"
			aria-expanded="true"
			aria-controls="palette-listbox"
			aria-activedescendant={activeId}
			placeholder="Type a command or search seeds…"
		/>
		<div class="results" id="palette-listbox" role="listbox" aria-label="Commands and seeds">
			{#each results as item, i (item.id)}
				<button
					id="palette-option-{i}"
					type="button"
					class="option"
					class:active={i === activeIndex}
					role="option"
					aria-selected={i === activeIndex}
					tabindex="-1"
					onclick={() => void run(item)}
				>
					<span class="group">{item.group}</span><span class="label">{item.label}</span><span
						class="hint">{item.hint ?? ''}</span
					>
				</button>
			{:else}<p class="empty">No matches.</p>{/each}
		</div>
		<div class="footer"><span>↑↓ move</span><span>↵ run</span><span>esc close</span></div>
	</div>
</Dialog>

<style>
	.content {
		overflow: hidden;
		border-radius: 11px;
	}
	input {
		width: 100%;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		padding: 14px 16px;
		font: 400 16px/1.4 var(--sans);
	}
	.results {
		padding: 6px;
		max-height: 52vh;
		overflow: auto;
	}
	.option {
		width: 100%;
		min-height: 38px;
		display: grid;
		grid-template-columns: 70px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		border: 0;
		border-radius: 7px;
		padding: 8px 10px;
		background: transparent;
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}
	.option.active {
		background: var(--palSel);
	}
	.group {
		color: var(--faint);
		font-size: 11.5px;
	}
	.label {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.hint,
	.footer {
		color: var(--faint);
		font: 11px var(--mono);
	}
	.empty {
		margin: 10px;
		color: var(--muted);
	}
	.footer {
		display: flex;
		gap: 14px;
		border-top: 1px solid var(--line);
		padding: 8px 14px;
	}
	input:focus-visible,
	.option:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	@media (max-width: 899px), (pointer: coarse) {
		.option {
			min-height: 44px;
		}
	}
</style>

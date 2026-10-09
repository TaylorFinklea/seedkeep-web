<script lang="ts">
	import { onMount, tick } from 'svelte';

	type View = 'Today' | 'Library' | 'Garden' | 'Journal' | 'You';
	type Modal = 'planting' | 'seed' | 'note' | null;
	type Seed = { name: string; variety: string; state: string; image: string; description: string; days: string };
	type Task = { id: number; name: string; bed: string; image: string; date: string; done: boolean };
	type Planting = { id: number; name: string; bed: string; date: string; note: string; done: boolean };

	const navItems: { label: View; icon: string }[] = [
		{ label: 'Today', icon: 'ph-calendar-blank' },
		{ label: 'Library', icon: 'ph-books' },
		{ label: 'Garden', icon: 'ph-plant' },
		{ label: 'Journal', icon: 'ph-pencil-line' },
		{ label: 'You', icon: 'ph-user' }
	];
	let librarySeeds: Seed[] = [
		{ name: 'Radish', variety: 'Cherry Belle', state: 'Active', image: 'radish', description: 'A crisp, quick-growing root with rosy color and a peppery bite.', days: '22–28 days' },
		{ name: 'Spinach', variety: 'Bloomsdale Long Standing', state: 'Active', image: 'spinach', description: 'Tender, dark green leaves that enjoy the cooler edges of the season.', days: '40–48 days' },
		{ name: 'Lemon balm', variety: 'Common', state: 'Saved', image: 'seedling', description: 'A bright, lemon-scented perennial for tea and pollinators.', days: '60–70 days' },
		{ name: 'Dill', variety: 'Bouquet', state: 'Wished', image: 'seedling', description: 'Feathery herbs for summer pickles and a busy patch of beneficial insects.', days: '40–55 days' },
		{ name: 'Marigold', variety: 'Crackerjack', state: 'Archive', image: 'seedling', description: 'Warm golden flowers that bring a little summer cheer to the beds.', days: '55–65 days' }
	];
	let currentView: View = 'Today';
	let modal: Modal = null;
	let selectedSeed: Seed | null = null;
	let selectedBed = '';
	let libraryQuery = '';
	let libraryFilter = 'All';
	let completedMessage = '';
	let photoPreview = '';
	let formError = '';
	let firstField: HTMLInputElement | HTMLTextAreaElement | null = null;
	let dialogClose: HTMLButtonElement | null = null;
	let lastFocused: HTMLElement | null = null;
	let nextId = 4;

	let tasks: Task[] = [
		{ id: 1, name: 'Sow radishes', bed: 'North bed', image: 'radish', date: '2026-09-06', done: false },
		{ id: 2, name: 'Plant spinach', bed: 'Kitchen bed', image: 'spinach', date: '2026-09-06', done: false }
	];
	let plantings: Planting[] = [
		{ id: 1, name: 'Radish', bed: 'North bed', date: '2026-09-06', note: 'A little patch for quick autumn color.', done: false },
		{ id: 2, name: 'Spinach', bed: 'Kitchen bed', date: '2026-09-06', note: 'The first cool-weather sowing.', done: false }
	];
	let beds = ['North bed', 'Kitchen bed', 'Herb boxes'];
	let journalEntries: { id: number; date: string; title: string; body: string; photo: string }[] = [
		{ id: 1, date: 'Yesterday · Sat, Sep 5', title: 'The first seedlings are through.', body: 'A quiet morning check-in. The first little leaves have made their way up.', photo: '/assets/seedling.png' }
	];

	let plantingForm = { seed: '', bed: 'North bed', date: '2026-09-06', note: '' };
	let seedForm = { name: '', variety: '' };
	let noteForm = { title: '', body: '' };

	$: filteredSeeds = librarySeeds.filter((seed) => {
		const matchesQuery = `${seed.name} ${seed.variety}`.toLowerCase().includes(libraryQuery.toLowerCase());
		const matchesFilter = libraryFilter === 'All' || seed.state === libraryFilter;
		return matchesQuery && matchesFilter;
	});
	$: completedCount = tasks.filter((task) => task.done).length;

	onMount(() => {
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && modal) { closeModal(); return; }
			if (event.key === 'Escape' && selectedSeed) { closeSeedDetails(); return; }
			if (event.key === 'Tab' && (modal || selectedSeed)) {
				const dialog = document.querySelector('.modal') as HTMLElement | null;
				if (!dialog) return;
				const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, textarea, select, [href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'));
				if (!focusable.length) return;
				const first = focusable[0]; const last = focusable[focusable.length - 1];
				if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
				else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
			}
		};
		document.addEventListener('keydown', onKeydown);
		return () => document.removeEventListener('keydown', onKeydown);
	});

	async function openModal(kind: Modal) {
		lastFocused = document.activeElement as HTMLElement;
		modal = kind;
		formError = '';
		await tick();
		(firstField ?? dialogClose)?.focus();
	}

	function closeModal() {
		modal = null;
		formError = '';
		photoPreview = '';
		tick().then(() => lastFocused?.focus());
	}

	async function openSeedDetails(seed: Seed) {
		lastFocused = document.activeElement as HTMLElement;
		selectedSeed = seed;
		await tick();
		dialogClose?.focus();
	}

	function closeSeedDetails() {
		selectedSeed = null;
		tick().then(() => lastFocused?.focus());
	}

	function chooseView(view: View) {
		currentView = view;
		selectedSeed = null;
	}

	function toggleTask(id: number) {
		tasks = tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
		const done = tasks.find((task) => task.id === id)?.done ?? false;
		plantings = plantings.map((planting) => (planting.id === id ? { ...planting, done } : planting));
		completedMessage = 'A little garden progress made.';
	}

	function addPlanting() {
		if (!plantingForm.seed.trim() || !plantingForm.bed.trim() || !plantingForm.date) {
			formError = 'Choose a seed, bed, and date to save this planting.';
			return;
		}
		const id = nextId++;
		const name = plantingForm.seed.trim();
		plantings = [...plantings, { id, name, bed: plantingForm.bed, date: plantingForm.date, note: plantingForm.note.trim(), done: false }];
		tasks = [...tasks, { id, name: `Plant ${name.toLowerCase()}`, bed: plantingForm.bed, image: name.toLowerCase().includes('spinach') ? 'spinach' : 'seedling', date: plantingForm.date, done: false }];
		if (!beds.includes(plantingForm.bed)) beds = [...beds, plantingForm.bed];
		plantingForm = { seed: '', bed: 'North bed', date: '2026-09-06', note: '' };
		completedMessage = `${name} was added to your garden.`;
		closeModal();
	}

	function addSeed() {
		if (!seedForm.name.trim()) {
			formError = 'Give your seed a name before saving.';
			return;
		}
		const name = seedForm.name.trim();
		librarySeeds = [...librarySeeds, { name, variety: seedForm.variety.trim() || 'Home saved', state: 'Active', image: 'seedling', description: 'A new seed in your growing library.', days: '—' }];
		libraryQuery = name;
		seedForm = { name: '', variety: '' };
		completedMessage = 'Seed saved to your library.';
		closeModal();
	}

	function addNote() {
		if (!noteForm.body.trim()) {
			formError = 'Write a note before saving your journal entry.';
			return;
		}
		journalEntries = [{ id: nextId++, date: 'Today · Sun, Sep 6', title: noteForm.title.trim() || 'A note from the garden', body: noteForm.body.trim(), photo: photoPreview }, ...journalEntries];
		noteForm = { title: '', body: '' };
		completedMessage = 'Your note was added to the journal.';
		closeModal();
	}

	function previewPhoto(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) photoPreview = URL.createObjectURL(file);
	}

	function imageSrc(key: string) {
		return `/assets/${key}.png`;
	}

	function formatDate(dateString: string) {
		const [year, month, day] = dateString.split('-').map(Number);
		return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day));
	}
</script>

<div class="app-shell">
	<header class="mobile-top">
		<button class="brand" aria-label="Seedkeep home" onclick={() => chooseView('Today')}>
			<img src="/logo-mark.png" alt="" />
			<span class="brand-name">Seedkeep</span>
		</button>
		<div class="mobile-garden" aria-label="Current garden">Home garden <i class="ph-caret-down" aria-hidden="true"></i></div>
	</header>

	<aside class="side-rail" aria-label="Primary navigation">
		<button class="brand" aria-label="Seedkeep home" onclick={() => chooseView('Today')}>
			<img src="/logo-mark.png" alt="" />
			<span class="brand-name">Seedkeep</span>
		</button>
		<div class="garden-switcher" aria-label="Current garden">Home garden <i class="ph-caret-down" aria-hidden="true"></i></div>
		<nav class="primary-nav">
			{#each navItems as item}
				<button class:active={currentView === item.label} class="nav-item" aria-current={currentView === item.label ? 'page' : undefined} onclick={() => chooseView(item.label)}>
					<i class={item.icon} aria-hidden="true"></i><span>{item.label}</span>
				</button>
			{/each}
		</nav>
		<div class="rail-bottom">
			<img src="/logo-mark.png" class="rail-mark" alt="" />
			<p>Seedkeep is free and open source.</p>
			<div class="rail-links"><button onclick={() => chooseView('You')}>About</button><button onclick={() => chooseView('You')}>Help</button><button onclick={() => chooseView('You')}>Install</button></div>
		</div>
	</aside>

	<main id="main" class="main-column">
		<div class="content-wrap page-view">
			{#if currentView === 'Today'}
				<p class="date-kicker">Sunday, September 6, 2026</p>
				<h1 class="hero-title">A little time in the garden.</h1>
				<div class="ornament" aria-hidden="true"><i class="ph-plant"></i></div>
				<div class="content-grid">
					<section aria-labelledby="today-tasks">
						<div class="section-intro"><span id="today-tasks">{tasks.filter((task) => task.date === '2026-09-06' && !task.done).length} planting{tasks.filter((task) => task.date === '2026-09-06' && !task.done).length === 1 ? '' : 's'} planned for today.</span><button class="primary-action" onclick={() => openModal('planting')}><i class="ph-leaf" aria-hidden="true"></i>Log a planting</button></div>
						<div class="tasks">
							{#each tasks.filter((task) => task.date === '2026-09-06') as task}
								<article class:done={task.done} class="task-row">
									<div class="plant-illustration">
										<img src={imageSrc(task.image)} alt={`${task.name} illustration`} />
									</div>
									<div class="task-info"><h2>{task.name}</h2><div class="task-meta"><span>{task.bed}</span><span class="dot">·</span><span>{task.done ? 'Completed today' : 'Planned for today'}</span></div></div>
									<button class="complete-action" onclick={() => toggleTask(task.id)}><i class={task.done ? 'ph-arrow-u-up-left' : 'ph-check-circle'} aria-hidden="true"></i>{task.done ? 'Undo' : 'Mark complete'}</button>
								</article>
							{/each}
						</div>
						{#if completedMessage}<p class="demo-note" role="status">{completedMessage}</p>{/if}
					</section>
					<aside class="journal-card" aria-labelledby="journal-preview-title">
						<div class="journal-heading" id="journal-preview-title"><i class="ph-book-open" aria-hidden="true"></i> JOURNAL</div>
						<p class="journal-date">{journalEntries[0].date}</p>
						{#if journalEntries[0].photo}<img class="seedling-photo" src={journalEntries[0].photo} alt="A seedling emerging from dark soil" />{:else}<div class="seedling-photo photo-fallback"><i class="ph-book-open" aria-hidden="true"></i></div>{/if}
						<p class="quote">{journalEntries[0].title}</p><button class="journal-link" onclick={() => chooseView('Journal')}>Open journal <i class="ph-arrow-right" aria-hidden="true"></i></button>
					</aside>
				</div>

			{:else if currentView === 'Library'}
				<p class="date-kicker">Your seeds</p><h1 class="subhead">A library for what you grow.</h1>
				<div class="view-toolbar"><div class="search"><i class="ph-magnifying-glass" aria-hidden="true"></i><label class="sr-only" for="seed-search">Search seeds</label><input id="seed-search" type="search" placeholder="Search your library" bind:value={libraryQuery} /></div><button class="primary-action" onclick={() => openModal('seed')}><i class="ph-plus" aria-hidden="true"></i>Add a seed</button></div>
				<div class="filter-row" aria-label="Library filters">{#each ['All', 'Active', 'Wished', 'Saved', 'Archive'] as filter}<button class:active={libraryFilter === filter} class="filter-chip" onclick={() => (libraryFilter = filter)}>{filter}</button>{/each}</div>
				{#if filteredSeeds.length}<div class="collection">{#each filteredSeeds as seed}<button class="seed-row" onclick={() => openSeedDetails(seed)}><div class="seed-thumb" aria-hidden="true"><img src={imageSrc(seed.image)} alt="" /></div><div class="row-copy"><h2 class="row-title">{seed.name}</h2><p>{seed.variety} · {seed.state}</p></div><span class="row-action">View</span></button>{/each}</div>{:else}<div class="empty-state"><i class="ph-magnifying-glass" aria-hidden="true"></i><h3>No seeds found</h3><p>Try another name or choose All.</p></div>{/if}
				{#if selectedSeed}<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeSeedDetails()}><dialog open class="modal" aria-labelledby="seed-detail-title"><div class="modal-head"><div><p class="date-kicker">{selectedSeed.state} seed</p><h2 id="seed-detail-title" class="modal-title">{selectedSeed.name}</h2></div><button bind:this={dialogClose} class="close-button" aria-label="Close seed details" onclick={closeSeedDetails}><i class="ph-x" aria-hidden="true"></i></button></div><p>{selectedSeed.description}</p><div class="detail-meta"><div><small>Variety</small><strong>{selectedSeed.variety}</strong></div><div><small>Days to harvest</small><strong>{selectedSeed.days}</strong></div></div><div class="modal-actions"><button class="secondary-action" onclick={closeSeedDetails}>Close</button><button class="primary-action" onclick={() => { plantingForm.seed = selectedSeed?.name ?? ''; closeSeedDetails(); openModal('planting'); }}>Log planting</button></div></dialog></div>{/if}

			{:else if currentView === 'Garden'}
				<p class="date-kicker">Home garden</p><h1 class="subhead">The shape of your garden.</h1>
				<div class="view-toolbar"><p class="section-intro">{beds.length} beds · {plantings.length} plantings</p><button class="primary-action" onclick={() => openModal('planting')}><i class="ph-leaf" aria-hidden="true"></i>Log a planting</button></div>
				<div class="collection">{#each beds as bed}<section class="bed-row"><div class="seed-thumb" aria-hidden="true"><i class="ph-plant"></i></div><div class="row-copy"><h2 class="row-title">{bed}</h2><p>{plantings.filter((planting) => planting.bed === bed).length} planting{plantings.filter((planting) => planting.bed === bed).length === 1 ? '' : 's'} recorded</p></div><button class="row-action" onclick={() => (selectedBed = selectedBed === bed ? '' : bed)}>{selectedBed === bed ? 'Hide details' : 'View bed'}</button></section>{#if selectedBed === bed}<div class="detail-panel" style="margin: 0 0 15px 0"><p class="date-kicker">{bed}</p>{#each plantings.filter((planting) => planting.bed === bed) as planting}<div class="entry-row"><div class="row-copy"><h3 class="row-title">{planting.name}</h3><p>{planting.done ? 'Completed' : 'Planted'} {formatDate(planting.date)}{planting.note ? ` · ${planting.note}` : ''}</p></div></div>{/each}</div>{/if}{/each}</div>

			{:else if currentView === 'Journal'}
				<p class="date-kicker">Garden journal</p><h1 class="subhead">Notes from the growing season.</h1>
				<div class="view-toolbar"><p class="section-intro">A place for observations, small wins, and weather.</p><button class="primary-action" onclick={() => openModal('note')}><i class="ph-pencil-simple" aria-hidden="true"></i>Add a note</button></div>
				<div class="collection">{#each journalEntries as entry}<article class="entry-row">{#if entry.photo}<img class="seed-thumb" src={entry.photo} alt="" />{:else}<div class="seed-thumb" aria-hidden="true"><i class="ph-pencil-simple"></i></div>{/if}<div class="row-copy"><p class="date-kicker" style="margin:0 0 5px">{entry.date}</p><h2 class="row-title">{entry.title}</h2><p>{entry.body}</p></div></article>{/each}</div>

			{:else}
				<p class="date-kicker">Your Seedkeep</p><h1 class="subhead">A garden that stays with you.</h1><p class="section-intro" style="max-width:620px;display:block">Keep your seeds, plantings, and garden notes close at hand. This design preview uses sample data so you can explore the shape of the website.</p>
				<div class="settings-list"><div class="setting"><div><h3>Home garden</h3><p>Your current garden and its beds</p></div><span class="row-action">Active</span></div><div class="setting"><div><h3>Reset this preview</h3><p>Clear the fictional changes made during this visit</p></div><button class="row-action" onclick={() => location.reload()}>Reset</button></div></div>
				<div class="install-note"><h3>Keep Seedkeep close</h3><p>When the website is ready, you can keep it handy on your phone:</p><ul><li><strong>iPhone:</strong> in Safari, use Share → Add to Home Screen (then Open as Web App where available).</li><li><strong>Android:</strong> in Chrome, open the menu → Add to home screen → Install, when offered.</li></ul></div><p class="demo-note">Design preview · sample data lives only in this browser tab.</p>{#if completedMessage}<p class="demo-note" role="status">{completedMessage}</p>{/if}
			{/if}
		</div>
	</main>

	<div class="sprig" aria-hidden="true"><img src="/assets/botanical-sprig.png" alt="" /></div>
	<nav class="mobile-nav" aria-label="Mobile navigation">{#each navItems as item}<button class:active={currentView === item.label} aria-current={currentView === item.label ? 'page' : undefined} onclick={() => chooseView(item.label)}><i class={item.icon} aria-hidden="true"></i><span>{item.label}</span></button>{/each}</nav>
</div>

{#if modal === 'planting'}
	<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}><dialog open class="modal" aria-labelledby="planting-title"><div class="modal-head"><h2 id="planting-title" class="modal-title">Log a planting</h2><button class="close-button" aria-label="Close log planting dialog" onclick={closeModal}><i class="ph-x" aria-hidden="true"></i></button></div><form class="form-grid" onsubmit={(event) => { event.preventDefault(); addPlanting(); }}><div class="field"><label for="plant-seed">What are you planting?</label><input id="plant-seed" bind:this={firstField} bind:value={plantingForm.seed} placeholder="e.g. Radish" required /></div><div class="field"><label for="plant-bed">Which bed?</label><select id="plant-bed" bind:value={plantingForm.bed}>{#each beds as bed}<option>{bed}</option>{/each}<option value="New bed">New bed</option></select></div><div class="field"><label for="plant-date">Planting date</label><input id="plant-date" type="date" bind:value={plantingForm.date} required /></div><div class="field"><label for="plant-note">Note <span style="font-weight:400;color:var(--muted)">(optional)</span></label><textarea id="plant-note" bind:value={plantingForm.note} placeholder="What do you want to remember?"></textarea></div>{#if formError}<p class="field-error" role="alert">{formError}</p>{/if}<div class="modal-actions"><button type="button" class="secondary-action" onclick={closeModal}>Cancel</button><button class="primary-action" type="submit">Save planting</button></div></form></dialog></div>
{:else if modal === 'seed'}
	<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}><dialog open class="modal" aria-labelledby="seed-title"><div class="modal-head"><h2 id="seed-title" class="modal-title">Add a seed</h2><button class="close-button" aria-label="Close add seed dialog" onclick={closeModal}><i class="ph-x" aria-hidden="true"></i></button></div><form class="form-grid" onsubmit={(event) => { event.preventDefault(); addSeed(); }}><div class="field"><label for="seed-name">Seed name</label><input id="seed-name" bind:this={firstField} bind:value={seedForm.name} placeholder="e.g. Lemon balm" required /></div><div class="field"><label for="seed-variety">Variety <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input id="seed-variety" bind:value={seedForm.variety} placeholder="e.g. Common" /></div>{#if formError}<p class="field-error" role="alert">{formError}</p>{/if}<div class="modal-actions"><button type="button" class="secondary-action" onclick={closeModal}>Cancel</button><button class="primary-action" type="submit">Save seed</button></div></form></dialog></div>
{:else if modal === 'note'}
	<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}><dialog open class="modal" aria-labelledby="note-title"><div class="modal-head"><h2 id="note-title" class="modal-title">Add a journal note</h2><button class="close-button" aria-label="Close add journal note dialog" onclick={closeModal}><i class="ph-x" aria-hidden="true"></i></button></div><form class="form-grid" onsubmit={(event) => { event.preventDefault(); addNote(); }}><div class="field"><label for="entry-title">Title <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input id="entry-title" bind:this={firstField} bind:value={noteForm.title} placeholder="A note from the garden" /></div><div class="field"><label for="entry-body">What happened?</label><textarea id="entry-body" bind:value={noteForm.body} placeholder="The first seedlings are through…" required></textarea></div><div class="field"><label for="entry-photo">Photo <span style="font-weight:400;color:var(--muted)">(optional, local preview only)</span></label><input id="entry-photo" type="file" accept="image/*" onchange={previewPhoto} />{#if photoPreview}<img src={photoPreview} alt="Selected local preview" style="width:76px;height:76px;object-fit:cover;border-radius:8px" />{/if}</div>{#if formError}<p class="field-error" role="alert">{formError}</p>{/if}<div class="modal-actions"><button type="button" class="secondary-action" onclick={closeModal}>Cancel</button><button class="primary-action" type="submit">Save note</button></div></form></dialog></div>
{/if}

import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ goto: vi.fn(), url: { pathname: '/today' } }));
vi.mock('$app/navigation', () => ({ goto: navigation.goto }));
vi.mock('$app/state', () => ({ page: { get url() { return navigation.url; } } }));

import { commands } from './commands';
import { garden } from './garden.svelte';
import { ui } from './ui.svelte';

describe('commands', () => {
	beforeEach(() => {
		ui.overlays = []; ui.toast = null;
		ui.seeds.state = 'active'; ui.seeds.seedId = null; ui.seeds.selected = [];
		ui.garden.brush = null; ui.garden.selEv = null;
		navigation.goto.mockClear(); navigation.url = { pathname: '/today' };
	});

	it('escapes overlay, seed detail, then garden brush and event in order', () => {
		ui.overlays = ['sprout']; commands.escape(); expect(ui.overlays).toEqual([]);
		navigation.url = { pathname: '/seeds' }; ui.seeds.seedId = 's1'; commands.escape(); expect(ui.seeds.seedId).toBeNull();
		navigation.url = { pathname: '/garden' }; ui.garden.brush = 's1'; ui.garden.selEv = 'e1'; commands.escape();
		expect(ui.garden.brush).toBeNull(); expect(ui.garden.selEv).toBe('e1'); commands.escape(); expect(ui.garden.selEv).toBeNull();
	});

	it('obeys modal palette rules and unavailable overlays do not enter the stack', () => {
		commands.togglePalette(); expect(ui.overlays).toEqual([]); expect(ui.toast?.message).toContain('later build phase');
		ui.overlays = ['detail']; commands.togglePalette(); expect(ui.overlays).toEqual(['detail']);
		ui.overlays = ['sprout']; commands.togglePalette(); expect(ui.overlays).toEqual(['sprout']);
	});

	it('completes idempotently through Undo and dismisses toast when toggled back', () => {
		const event = garden.events.find((candidate) => candidate.id === 'e3')!;
		event.done = false; commands.completeEvent(event.id);
		expect(garden.events.find((candidate) => candidate.id === event.id)?.done).toBe(true);
		const undo = ui.toast!.action!; undo.run(); undo.run();
		expect(garden.events.find((candidate) => candidate.id === event.id)?.done).toBe(false);
		commands.completeEvent(event.id); commands.completeEvent(event.id); expect(ui.toast).toBeNull();
	});

	it('deletes seed references and closes detail; preserves all state on openSeed', async () => {
		ui.seeds.seedId = 's1'; ui.seeds.selected = ['s1', 's2']; ui.garden.brush = 's1'; ui.garden.selEv = 'e1'; ui.overlays = ['detail'];
		commands.deleteSeeds(['s1']);
		expect(ui.seeds.seedId).toBeNull(); expect(ui.overlays).toEqual([]); expect(ui.seeds.selected).toEqual(['s2']);
		expect(ui.garden.brush).toBeNull(); expect(ui.garden.selEv).toBeNull(); expect(garden.events.some((event) => event.seed === 's1')).toBe(false);
		ui.seeds.state = 'all'; await commands.openSeed('s2'); expect(ui.seeds.state).toBe('all'); expect(ui.seeds.seedId).toBe('s2');
	});
});

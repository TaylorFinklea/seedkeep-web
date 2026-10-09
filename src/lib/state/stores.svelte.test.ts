import { afterEach, describe, expect, it, vi } from 'vitest';
import { Garden } from './garden.svelte';
import { AVAILABLE_OVERLAYS, Ui } from './ui.svelte';

describe('Garden actions', () => {
	it('coerces new seed values and updates by id', () => {
		const garden = new Garden();
		const seed = garden.addSeed({ name: ' ', type: '', packets: '-2', year: '20x6' });
		expect(seed.name).toBe('Untitled seed');
		expect(seed.type).toBe('Untyped');
		expect(seed.packets).toBe(1);
		expect(seed.year).toBeNull();
		expect(seed.catalog).toBe(false);
		const wish = garden.addSeed({ state: 'wishlist', packets: '', year: '2025', verdict: 'plant_now' });
		expect(wish.packets).toBe(0);
		expect(wish.year).toBe(2025);
		expect(wish.catalog).toBe(true);
		garden.updateSeed(seed.id, { name: 'Renamed' });
		garden.bulkUpdate([seed.id], { type: 'Herb' });
		garden.tagSeeds([seed.id, wish.id], 't1');
		expect(garden.seeds.find((item) => item.id === seed.id)).toMatchObject({ name: 'Renamed', type: 'Herb', tags: ['t1'] });
		expect(garden.seeds.find((item) => item.id === wish.id)?.tags).toEqual(['t1']);
	});
	it('adds and edits events and beds, and cascades seed deletion', () => {
		const garden = new Garden();
		const event = garden.addEvent({ bed: 'b1', seed: 's1', kind: 'note', date: '2026-10-10', x: 1, y: 1 });
		expect(event).toMatchObject({ done: false, notes: '' });
		garden.updateEvent(event.id, { done: true });
		expect(garden.events.find((item) => item.id === event.id)?.done).toBe(true);
		garden.toggleDone(event.id);
		garden.removeEvent(event.id);
		const bed = garden.addBed({ name: '', w: 2, l: 3 });
		expect(bed).toMatchObject({ name: 'New bed', desc: '', w: 2, l: 3 });
		garden.removeSeeds(['s1']);
		expect(garden.seeds.some((seed) => seed.id === 's1')).toBe(false);
		expect(garden.events.some((planting) => planting.seed === 's1')).toBe(false);
	});
	it('validates and cascades locations and tags', () => {
		const garden = new Garden();
		expect(garden.addLocation(' ')).toBeNull();
		expect(garden.addLocation(' garage fridge ')).toBeNull();
		const location = garden.addLocation(' Potting shed ');
		expect(location?.name).toBe('Potting shed');
		garden.updateSeed('s1', { loc: location!.id });
		garden.removeLocation(location!.id);
		expect(garden.seeds.find((seed) => seed.id === 's1')?.loc).toBe('');
		const tag = garden.addTag(' New tag ');
		expect(tag?.name).toBe('New tag');
		garden.tagSeeds(['s1'], tag!.id);
		garden.removeTag(tag!.id);
		expect(garden.seeds.find((seed) => seed.id === 's1')?.tags).not.toContain(tag!.id);
	});
	it('validates ZIP and masks keys without storing the raw value', () => {
		const garden = new Garden();
		const originalZip = garden.home.zip;
		expect(garden.saveZip('1234')).toBe(false);
		expect(garden.home.zip).toBe(originalZip);
		expect(garden.saveZip('02139')).toBe(true);
		expect(garden.home.zip).toBe('02139');
		expect(garden.saveKey('   ')).toBe(false);
		expect(garden.saveKey('1234567890')).toBe(true);
		expect(garden.key).toMatchObject({ saved: true, masked: '1••••••••0' });
		expect(garden.saveKey('1234567890123456789012345678901234567890')).toBe(true);
		expect(garden.key.masked).toBe('12345••••••••7890');
		expect(JSON.stringify(garden.key)).not.toContain('1234567890123456789012345678901234567890');
		garden.setProvider('OpenAI');
		expect(garden.key.provider).toBe('OpenAI');
		garden.removeKey();
		expect(garden.key).toMatchObject({ saved: false, masked: '' });
	});
	it('imports supported columns and saves local corrections', () => {
		const garden = new Garden();
		const before = garden.seeds.length;
		const result = garden.importCSV('name,status,packets,stored_in\nNew pea,Wishlist,0,Pantry');
		expect(result).toEqual({ added: 1, ignored: ['stored_in'] });
		expect(garden.seeds).toHaveLength(before + 1);
		expect(garden.seeds[0]).toMatchObject({ name: 'New pea', state: 'wishlist', packets: 0 });
		expect(garden.exportCSV()).toContain('New pea');
		const contribution = garden.addContribution('s1', 'Sun', 'Full sun');
		expect(contribution).toMatchObject({ status: 'Saved locally (demo)', change: 'Sun → Full sun' });
		expect(garden.addContribution('missing', 'Sun', 'Shade')).toBeNull();
	});
});

describe('UI overlay and toast state', () => {
	afterEach(() => { vi.useRealTimers(); (AVAILABLE_OVERLAYS as Set<string>).clear(); });
	it('moves opened overlays to the top and closes one layer at a time', () => {
		(AVAILABLE_OVERLAYS as Set<string>).add('palette').add('add').add('sprout');
		const ui = new Ui();
		ui.open('palette'); ui.open('sprout'); ui.open('palette');
		expect(ui.overlays).toEqual(['sprout', 'palette']);
		expect(ui.modalOpen).toBe(true);
		expect(ui.closeTop()).toBe(true);
		expect(ui.top).toBe('sprout');
		ui.toggle('sprout');
		expect(ui.overlays).toEqual([]);
		expect(ui.modalOpen).toBe(false);
		expect(ui.closeTop()).toBe(false);
	});
	it('replaces and cancels toast timers, with longer action timing', () => {
		vi.useFakeTimers();
		const ui = new Ui();
		ui.showToast('First');
		const firstId = ui.toast!.id;
		vi.advanceTimersByTime(1000);
		ui.showToast('Second', { label: 'Undo', run: () => undefined });
		expect(ui.toast?.id).toBe(firstId + 1);
		vi.advanceTimersByTime(2800);
		expect(ui.toast?.message).toBe('Second');
		vi.advanceTimersByTime(3200);
		expect(ui.toast).toBeNull();
		ui.showToast('Third');
		expect(ui.toast?.id).toBe(firstId + 2);
		ui.dismissToast();
		vi.advanceTimersByTime(3000);
		expect(ui.toast).toBeNull();
	});
	it('only shows a toast when an unavailable overlay is requested', () => {
		const ui = new Ui();
		ui.open('shortcuts');
		expect(ui.overlays).toEqual([]);
		expect(ui.toast?.message).toBe('The shortcuts list arrives in a later build phase.');
	});
});

import { describe, expect, it } from 'vitest';
import { sampleData } from './sample';
import { sampleReply } from './sprout';

describe('sampleReply', () => {
	it('summarizes frost risk from current plantings', () => {
		const result = sampleReply(sampleData(), 'frost');
		expect(result.text).toContain('Oct 21');
		expect(result.text).toContain('Basil in Herb spiral');
		expect(result.tool).toMatch(/^sample · /);
	});
	it('lists old active packets', () => {
		const result = sampleReply(sampleData(), 'old packets');
		expect(result.text).toContain('active packets are three or more years old');
		expect(result.text).toContain('Radish — French Breakfast');
	});
	it('selects the bed with most empty squares and reports its count', () => {
		const result = sampleReply(sampleData(), 'which bed has room?');
		expect(result.text).toContain('South raised bed has the most open space, with 28 empty squares.');
	});
	it('lists active now and closing soon seeds with window labels by default', () => {
		const result = sampleReply(sampleData(), 'what should I plant?');
		expect(result.text).toContain('Garlic — Music');
		expect(result.text).toContain('Lettuce — Winter Density (closing soon');
		expect(result.tool).toMatch(/^sample · /);
	});
});

import { describe, expect, it } from 'vitest';
import { solarDay, withSolar } from './solar';

describe('solarDay', () => {
	it('computes Kansas City sunrise and sunset for the contract date', () => {
		const result = solarDay(39.0997, -94.5786, '2026-10-09');
		expect(result.state).toBe('normal');
		expect(result.sunrise).toMatch(/^7:2[0-4] AM$/);
		expect(result.sunset).toMatch(/^6:5[0-6] PM$/);
		expect(result.length).toMatch(/^11h /);
	});
	it('labels missing coordinates and polar day and night explicitly', () => {
		expect(solarDay(null, 0, '2026-06-21').state).toBe('unknown');
		expect(solarDay(89, 0, '2026-06-21')).toMatchObject({
			state: 'polar-day',
			sunrise: 'Polar day',
			sunset: 'Polar day',
			length: '24h 00m'
		});
		expect(solarDay(89, 0, '2026-12-21')).toMatchObject({
			state: 'polar-night',
			sunrise: 'Polar night',
			sunset: 'Polar night',
			length: '0h 00m'
		});
	});
	it('uses local civil time so daylight saving time changes the displayed clock', () => {
		const before = solarDay(39.0997, -94.5786, '2026-03-07');
		const after = solarDay(39.0997, -94.5786, '2026-03-09');
		const minute = (s: string) => {
			const [h, m] = s
				.replace(/ (AM|PM)/, '')
				.split(':')
				.map(Number);
			return (h % 12) * 60 + m + (s.endsWith('PM') ? 720 : 0);
		};
		expect(minute(after.sunrise) - minute(before.sunrise)).toBeGreaterThanOrEqual(55);
		expect(minute(after.sunrise) - minute(before.sunrise)).toBeLessThanOrEqual(65);
	});
	it('copies the solar state onto household daylight', () => {
		const base = {
			zip: '',
			zone: '',
			place: '',
			firstFrost: '',
			lastFrost: '',
			sunrise: '',
			sunset: '',
			length: '',
			riseMin: 0,
			setMin: 0,
			hasLocation: true,
			daylight: 'unknown' as const,
			latitude: 89,
			longitude: 0
		};
		expect(withSolar(base, '2026-06-21').daylight).toBe('polar-day');
		expect(withSolar({ ...base, latitude: null }, '2026-06-21').daylight).toBe('unknown');
	});
});

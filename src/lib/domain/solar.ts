import type { Home, YMD } from './types';

export interface SolarDay {
	sunrise: string;
	sunset: string;
	length: string;
	riseMin: number | null;
	setMin: number | null;
	state: 'normal' | 'polar-day' | 'polar-night' | 'unknown';
}
const rad = (n: number): number => (n * Math.PI) / 180;
const deg = (n: number): number => (n * 180) / Math.PI;
const pad = (n: number): string => String(n).padStart(2, '0');
function formatMinute(utcMinutes: number, date: YMD): { text: string; minutes: number } {
	const [y, m, d] = date.split('-').map(Number);
	const instant = new Date(Date.UTC(y, m - 1, d) + utcMinutes * 60_000);
	const text = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
		instant
	);
	return { text, minutes: instant.getHours() * 60 + instant.getMinutes() };
}
/** NOAA sunrise/sunset calculation. Browser local timezone conversion applies the date's DST offset. */
export function solarDay(
	latitude: number | null | undefined,
	longitude: number | null | undefined,
	date: YMD
): SolarDay {
	if (
		latitude == null ||
		longitude == null ||
		!Number.isFinite(latitude) ||
		!Number.isFinite(longitude) ||
		Math.abs(latitude) > 90 ||
		Math.abs(longitude) > 180
	)
		return {
			sunrise: 'Unknown',
			sunset: 'Unknown',
			length: 'Unknown',
			riseMin: null,
			setMin: null,
			state: 'unknown'
		};
	const [year, month, day] = date.split('-').map(Number);
	const dayOfYear = Math.floor(
		(Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000
	);
	const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
	const equation =
		229.18 *
		(0.000075 +
			0.001868 * Math.cos(gamma) -
			0.032077 * Math.sin(gamma) -
			0.014615 * Math.cos(2 * gamma) -
			0.040849 * Math.sin(2 * gamma));
	const decl =
		0.006918 -
		0.399912 * Math.cos(gamma) +
		0.070257 * Math.sin(gamma) -
		0.006758 * Math.cos(2 * gamma) +
		0.000907 * Math.sin(2 * gamma) -
		0.002697 * Math.cos(3 * gamma) +
		0.00148 * Math.sin(3 * gamma);
	const lat = rad(latitude),
		cosH =
			Math.cos(rad(90.833)) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl);
	if (cosH > 1)
		return {
			sunrise: 'Polar night',
			sunset: 'Polar night',
			length: '0h 00m',
			riseMin: null,
			setMin: null,
			state: 'polar-night'
		};
	if (cosH < -1)
		return {
			sunrise: 'Polar day',
			sunset: 'Polar day',
			length: '24h 00m',
			riseMin: null,
			setMin: null,
			state: 'polar-day'
		};
	const hourAngle = deg(Math.acos(cosH));
	const noon = 720 - 4 * longitude - equation;
	const rise = noon - 4 * hourAngle,
		set = noon + 4 * hourAngle;
	const fRise = formatMinute(rise, date),
		fSet = formatMinute(set, date);
	let length = Math.round(set - rise);
	if (length < 0) length += 1440;
	return {
		sunrise: fRise.text,
		sunset: fSet.text,
		length: `${Math.floor(length / 60)}h ${pad(length % 60)}m`,
		riseMin: fRise.minutes,
		setMin: fSet.minutes,
		state: 'normal'
	};
}
export function withSolar(home: Home, date: YMD): Home {
	const s = solarDay(home.latitude, home.longitude, date);
	return {
		...home,
		sunrise: s.sunrise,
		sunset: s.sunset,
		length: s.length,
		riseMin: s.riseMin ?? 0,
		setMin: s.setMin ?? 0,
		daylight: s.state
	};
}

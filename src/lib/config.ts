// Runtime configuration. CONTRACT (parent-owned).

/** Base URL of seedkeep-server, without a trailing slash. */
export const API_BASE: string =
	(import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ??
	'http://localhost:8787';

/**
 * Feature switches. M2 features stay hidden in M1 (no button, palette item,
 * shortcut or Settings section) rather than shown as demos.
 */
export const FEATURES = {
	sprout: false,
	packetPhoto: false,
	barcodeScan: false,
	csvImport: false,
	aiKey: false,
	catalogCorrections: false
} as const;

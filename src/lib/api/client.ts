import { API_BASE } from '$lib/config';

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly data?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

let householdId: string | null = null;
let unauthorized: (() => void) | null = null;
export function setHouseholdHeader(id: string | null): void {
	householdId = id;
}
export function setUnauthorizedHandler(handler: (() => void) | null): void {
	unauthorized = handler;
}

export interface RequestOptions extends RequestInit {
	timeoutMs?: number;
	protected?: boolean;
}

function errorFrom(status: number, body: any): ApiError {
	const source = body?.error ?? body?.data?.error ?? body ?? {};
	const code = String(
		source.code ?? source.type ?? (status === 401 ? 'unauthorized' : 'request_failed')
	);
	const data = source.data ?? (source.current ? { current: source.current } : body?.data);
	const retry = source.retry_after_seconds ?? body?.retry_after_seconds;
	const message = String(
		source.message || source.error_description || body?.message || fallback(status, code, retry)
	);
	return new ApiError(status, code, message, {
		...(data && typeof data === 'object' ? data : {}),
		...(retry == null ? {} : { retry_after_seconds: retry })
	});
}
function fallback(status: number, code = '', retry?: unknown): string {
	const messages: Record<string, string> = {
		invalid_email: 'Enter a valid email address.',
		otp_busy: 'A sign-in code is already being sent. Try again shortly.',
		otp_unavailable: 'Sign-in codes are temporarily unavailable. Try again shortly.',
		mail_send_failed: 'We could not send the sign-in email. Try again shortly.',
		unsupported_media_type: 'That file type is not supported.',
		mail_not_configured: 'Email sign-in is not configured.',
		csrf_origin_rejected: 'This request came from an untrusted origin.',
		household_forbidden: 'You do not have access to this garden.',
		version_conflict: 'This changed elsewhere. Reload and try again.'
	};
	if (code === 'rate_limited') {
		const seconds = Number(retry);
		return Number.isFinite(seconds) && seconds > 0
			? `Too many requests. Try again in ${seconds} seconds.`
			: 'Too many requests. Please try again shortly.';
	}
	if (messages[code]) return messages[code];
	return status === 401
		? 'Please sign in again.'
		: status === 429
			? 'Too many requests. Please try again shortly.'
			: `Request failed (${status}).`;
}

function transportError(controller: AbortController): ApiError {
	return controller.signal.aborted
		? new ApiError(0, 'timeout', 'The request timed out.')
		: new ApiError(0, 'network_error', 'The response could not be read.');
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const {
		timeoutMs = 12_000,
		protected: isProtected = !path.startsWith('/api/auth/'),
		...init
	} = options;
	const controller = new AbortController();
	const timer = setTimeout(
		() => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
		timeoutMs
	);
	const abort = () => controller.abort(init.signal?.reason);
	init.signal?.addEventListener('abort', abort, { once: true });
	if (init.signal?.aborted) abort();
	const headers = new Headers(init.headers);
	if (householdId) headers.set('X-Household-Id', householdId);
	if (
		init.body &&
		!(init.body instanceof FormData) &&
		!(init.body instanceof Blob) &&
		!headers.has('Content-Type')
	)
		headers.set('Content-Type', 'application/json');
	try {
		let response: Response;
		try {
			response = await fetch(`${API_BASE}${path}`, {
				...init,
				headers,
				credentials: 'include',
				signal: controller.signal
			});
		} catch (error) {
			if (controller.signal.aborted) throw new ApiError(0, 'timeout', 'The request timed out.');
			throw new ApiError(
				0,
				'network_error',
				error instanceof Error ? error.message : 'Network request failed.'
			);
		}
		if (response.status === 401 && isProtected) unauthorized?.();
		if (!response.ok) {
			let body: any = null;
			try {
				body = await response.clone().json();
			} catch (error) {
				if (
					controller.signal.aborted ||
					error instanceof TypeError ||
					(response.headers.get('content-type') ?? '').includes('json')
				)
					throw transportError(controller);
			}
			throw errorFrom(response.status, body);
		}
		if (response.status === 204) return undefined as T;
		const contentType = response.headers.get('content-type') ?? '';
		let body: any;
		try {
			if (!contentType.includes('json')) return (await response.blob()) as T;
			body = await response.json();
		} catch {
			throw transportError(controller);
		}
		if (body && typeof body === 'object' && 'ok' in body) {
			if (!body.ok) throw errorFrom(response.status, body);
			return body.data as T;
		}
		return body as T;
	} finally {
		clearTimeout(timer);
		init.signal?.removeEventListener('abort', abort);
	}
}

export async function allPages<T>(path: string): Promise<T[]> {
	const items: T[] = [];
	let since = '0',
		sinceId = '';
	for (let page = 0; page < 1000; page++) {
		const query = new URLSearchParams({ since, limit: '200' });
		if (sinceId) query.set('since_id', sinceId);
		const result = await request<{
			items: T[];
			cursor: number;
			cursor_id?: string;
			has_more: boolean;
		}>(`${path}?${query}`);
		items.push(...result.items);
		if (!result.has_more) return items;
		since = String(result.cursor);
		sinceId = result.cursor_id ?? '';
	}
	throw new ApiError(0, 'pagination_limit', 'The server returned too many pages.');
}

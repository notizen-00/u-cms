import type { RequestEvent } from '@sveltejs/kit';
import { API_URL, SESSION_COOKIE_NAME } from '$lib/server/env';
import type { ApiFieldError } from '$lib/types';

export class ApiError extends Error {
	status: number;
	fieldErrors?: ApiFieldError[];

	constructor(status: number, message: string, fieldErrors?: ApiFieldError[]) {
		super(message);
		this.status = status;
		this.fieldErrors = fieldErrors;
	}
}

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

interface RawFetchOptions {
	method?: string;
	body?: unknown;
	fetch: typeof fetch;
	cookie?: string;
	headers?: Record<string, string>;
}

/** Low-level call that returns the raw Response — needed by auth.ts to read Set-Cookie on login. */
export async function rawApiFetch(
	path: string,
	{ method = 'GET', body, fetch, cookie, headers: customHeaders = {} }: RawFetchOptions
): Promise<Response> {
	const headers: Record<string, string> = { ...customHeaders };
	const isFormData = body instanceof FormData;
	// Let fetch set Content-Type itself for FormData bodies (it needs to add the multipart boundary).
	if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
	if (cookie) headers['Cookie'] = cookie;

	try {
		return await fetch(`${API_URL}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body)
		});
	} catch {
		throw new ApiError(0, 'Tidak bisa terhubung ke server. Periksa koneksi dan coba lagi.');
	}
}

function defaultMessageForStatus(status: number): string {
	switch (status) {
		case 401:
			return 'Sesi berakhir, silakan login kembali.';
		case 403:
			return 'Anda tidak punya akses untuk melakukan aksi ini.';
		case 404:
			return 'Data tidak ditemukan.';
		default:
			return 'Terjadi kesalahan. Coba lagi.';
	}
}

export async function toApiError(response: Response): Promise<ApiError> {
	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		// empty/non-JSON body
	}

	if (response.status === 400 && Array.isArray(payload)) {
		return new ApiError(400, 'Data tidak valid.', payload as ApiFieldError[]);
	}

	const message =
		payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message: unknown }).message === 'string'
			? (payload as { message: string }).message
			: defaultMessageForStatus(response.status);

	return new ApiError(response.status, message);
}

export function sessionCookieHeader(event: MinimalEvent): string | undefined {
	const value = event.cookies.get(SESSION_COOKIE_NAME);
	return value ? `${SESSION_COOKIE_NAME}=${value}` : undefined;
}

/** Server-side JSON call to the backend API, forwarding the admin app's own session cookie as-is. */
export async function apiFetch<T>(
	event: MinimalEvent,
	path: string,
	options: { method?: string; body?: unknown } = {}
): Promise<T> {
	const response = await rawApiFetch(path, {
		method: options.method ?? 'GET',
		body: options.body,
		fetch: event.fetch,
		cookie: sessionCookieHeader(event)
	});

	if (!response.ok) {
		throw await toApiError(response);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	const text = await response.text();
	return (text ? JSON.parse(text) : undefined) as T;
}

/** Server-side `multipart/form-data` call — for the one endpoint (media upload) that isn't plain JSON. */
export async function apiUpload<T>(event: MinimalEvent, path: string, formData: FormData): Promise<T> {
	const response = await rawApiFetch(path, {
		method: 'POST',
		body: formData,
		fetch: event.fetch,
		cookie: sessionCookieHeader(event)
	});

	if (!response.ok) {
		throw await toApiError(response);
	}

	const text = await response.text();
	return (text ? JSON.parse(text) : undefined) as T;
}

import { MEDIA_ALLOWED_MIME_TYPES, MEDIA_MAX_FILE_SIZE_BYTES, type Media } from '$lib/types';

export interface FileValidationError {
	message: string;
}

/** Mirrors backend validation (media_guide.md §6.2) so obviously-bad files never reach the network. */
export function validateMediaFile(file: File): FileValidationError | null {
	if (!MEDIA_ALLOWED_MIME_TYPES.includes(file.type as (typeof MEDIA_ALLOWED_MIME_TYPES)[number])) {
		return { message: 'Tipe file tidak didukung.' };
	}
	if (file.size > MEDIA_MAX_FILE_SIZE_BYTES) {
		return { message: 'Ukuran file melebihi 10MB.' };
	}
	return null;
}

/**
 * Uploads via XHR (not `fetch`) so `xhr.upload.onprogress` gives real per-file progress —
 * native `fetch` has no upload progress event (media_guide.md §8). Always same-origin, hitting
 * this app's own `+server.ts` proxy, never MinIO/the NestJS API directly from the browser.
 */
export function uploadMediaFile(
	siteId: string,
	file: File,
	altText: string,
	onProgress: (percent: number) => void
): Promise<Media> {
	return new Promise((resolve, reject) => {
		const formData = new FormData();
		formData.append('file', file);
		if (altText.trim()) formData.append('altText', altText.trim());

		const xhr = new XMLHttpRequest();
		xhr.open('POST', `/sites/${siteId}/media/upload`);
		xhr.withCredentials = true;

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
		};

		xhr.onload = () => {
			let payload: unknown = null;
			try {
				payload = JSON.parse(xhr.responseText);
			} catch {
				// non-JSON response
			}
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(payload as Media);
			} else {
				const message =
					payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message: unknown }).message === 'string'
						? (payload as { message: string }).message
						: 'Upload gagal.';
				reject(new Error(message));
			}
		};

		xhr.onerror = () => reject(new Error('Tidak bisa terhubung ke server. Periksa koneksi dan coba lagi.'));

		xhr.send(formData);
	});
}

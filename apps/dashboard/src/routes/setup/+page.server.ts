import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { initializeSetup } from '$lib/server/api/setup';
import { ApiError } from '$lib/server/api/client';
import type { ApiFieldError, SetupInitInput } from '$lib/types';

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function fieldError(path: string, message: string): ApiFieldError {
	return { path, message };
}

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const setupToken = String(formData.get('setupToken') ?? '').trim();
		const adminName = String(formData.get('adminName') ?? '').trim();
		const adminEmail = String(formData.get('adminEmail') ?? '').trim().toLowerCase();
		const adminPassword = String(formData.get('adminPassword') ?? '');
		const confirmPassword = String(formData.get('confirmPassword') ?? '');
		const siteName = String(formData.get('siteName') ?? '').trim();
		const siteSlug = String(formData.get('siteSlug') ?? '').trim().toLowerCase();
		const siteDomain = String(formData.get('siteDomain') ?? '').trim().toLowerCase();

		const values = {
			setupToken,
			adminName,
			adminEmail,
			siteName,
			siteSlug,
			siteDomain
		};

		const errors: ApiFieldError[] = [];
		if (!adminName) errors.push(fieldError('admin.name', 'Nama super admin wajib diisi.'));
		if (!adminEmail) {
			errors.push(fieldError('admin.email', 'Email super admin wajib diisi.'));
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
			errors.push(fieldError('admin.email', 'Format email super admin tidak valid.'));
		}
		if (adminPassword.length < 8) {
			errors.push(fieldError('admin.password', 'Password minimal 8 karakter.'));
		}
		if (adminPassword !== confirmPassword) {
			errors.push(fieldError('confirmPassword', 'Konfirmasi password tidak sama.'));
		}
		if (!siteName) errors.push(fieldError('site.name', 'Nama website wajib diisi.'));
		if (!siteSlug) {
			errors.push(fieldError('site.slug', 'Slug website wajib diisi.'));
		} else if (!SLUG_PATTERN.test(siteSlug)) {
			errors.push(fieldError('site.slug', 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.'));
		}

		if (errors.length > 0) {
			return fail(400, { values, errors, step: 3 });
		}

		const input: SetupInitInput = {
			admin: {
				name: adminName,
				email: adminEmail,
				password: adminPassword
			},
			site: {
				name: siteName,
				slug: siteSlug,
				...(siteDomain ? { domain: siteDomain } : {})
			}
		};

		try {
			await initializeSetup(event, input, setupToken || undefined);
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 409) redirect(303, '/login');

				return fail(err.status === 0 ? 503 : err.status, {
					values,
					errors: err.fieldErrors,
					message:
						err.status === 403
							? 'Setup token tidak valid atau belum diisi. Salin token dari log container API.'
							: err.message,
					step: err.status === 403 ? 1 : 3
				});
			}
			throw err;
		}

		redirect(303, '/');
	}
};

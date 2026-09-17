import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { initializeSetup } from '$lib/server/api/setup';
import { ApiError } from '$lib/server/api/client';
import type { ApiFieldError, SetupInitInput } from '$lib/types';

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

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
		const siteDomain = String(formData.get('siteDomain') ?? '').trim().toLowerCase();

		const values = {
			setupToken,
			adminName,
			adminEmail,
			siteName,
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
		if (!siteDomain) errors.push(fieldError('site.domain', 'Nama domain wajib diisi.'));
		else if (!DOMAIN_PATTERN.test(siteDomain)) errors.push(fieldError('site.domain', 'Masukkan hostname valid, misalnya cms.unej.ac.id.'));

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
				domain: siteDomain
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

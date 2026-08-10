import type { RequestEvent } from '@sveltejs/kit';
import type { CmsForm, FormField, FormSubmission } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listForms(event: MinimalEvent, siteId: string): Promise<CmsForm[]> {
	return apiFetch<CmsForm[]>(event, `/sites/${siteId}/forms`);
}

export function getForm(event: MinimalEvent, siteId: string, formId: string): Promise<CmsForm> {
	return apiFetch<CmsForm>(event, `/sites/${siteId}/forms/${formId}`);
}

export interface FormInput {
	title: string;
	fields: FormField[];
	submitLabel?: string;
	successMessage?: string;
}

export function createForm(event: MinimalEvent, siteId: string, input: FormInput): Promise<CmsForm> {
	return apiFetch<CmsForm>(event, `/sites/${siteId}/forms`, { method: 'POST', body: input });
}

export function updateForm(
	event: MinimalEvent,
	siteId: string,
	formId: string,
	input: Partial<FormInput>
): Promise<CmsForm> {
	return apiFetch<CmsForm>(event, `/sites/${siteId}/forms/${formId}`, { method: 'PATCH', body: input });
}

export function deleteForm(event: MinimalEvent, siteId: string, formId: string): Promise<void> {
	return apiFetch(event, `/sites/${siteId}/forms/${formId}`, { method: 'DELETE' });
}

export function listSubmissions(
	event: MinimalEvent,
	siteId: string,
	formId: string
): Promise<FormSubmission[]> {
	return apiFetch<FormSubmission[]>(event, `/sites/${siteId}/forms/${formId}/submissions`);
}

export function deleteSubmission(
	event: MinimalEvent,
	siteId: string,
	formId: string,
	submissionId: string
): Promise<void> {
	return apiFetch(event, `/sites/${siteId}/forms/${formId}/submissions/${submissionId}`, { method: 'DELETE' });
}

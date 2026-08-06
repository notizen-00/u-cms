import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types';
import { apiFetch } from './client';

type MinimalEvent = Pick<RequestEvent, 'fetch' | 'cookies'>;

export function listUsers(event: MinimalEvent): Promise<User[]> {
	return apiFetch<User[]>(event, '/users');
}

export function getUser(event: MinimalEvent, userId: string): Promise<User> {
	return apiFetch<User>(event, `/users/${userId}`);
}

export interface CreateUserInput {
	email: string;
	password: string;
	name: string;
	isSuperAdmin?: boolean;
}

export function createUser(event: MinimalEvent, input: CreateUserInput): Promise<User> {
	return apiFetch<User>(event, '/users', { method: 'POST', body: input });
}

export interface UpdateUserInput {
	name?: string;
	password?: string;
	isSuperAdmin?: boolean;
}

export function updateUser(event: MinimalEvent, userId: string, input: UpdateUserInput): Promise<User> {
	return apiFetch<User>(event, `/users/${userId}`, { method: 'PATCH', body: input });
}

export function deleteUser(event: MinimalEvent, userId: string): Promise<void> {
	return apiFetch(event, `/users/${userId}`, { method: 'DELETE' });
}

<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, type ButtonVariant } from '$lib/components/ui/button';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Hapus',
		action,
		variant = 'destructive',
		hiddenFields,
		onSuccess
	}: {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		action: string;
		variant?: ButtonVariant;
		/** A `string[]` value renders one hidden input per element under the same `name` (read server-side via `formData.getAll(name)`) — used for bulk actions. */
		hiddenFields?: Record<string, string | string[]>;
		/** Called after a successful submit, right before the default `update()` reload — for callers that keep their own local copy of the list (e.g. merged with polling) and need to prune it themselves. */
		onSuccess?: () => void;
	} = $props();

	let submitting = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<form
			method="POST"
			{action}
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					open = false;
					if (result.type === 'success') onSuccess?.();
					await update();
				};
			}}
		>
			{#if hiddenFields}
				{#each Object.entries(hiddenFields) as [key, value] (key)}
					{#if Array.isArray(value)}
						{#each value as v (v)}
							<input type="hidden" name={key} value={v} />
						{/each}
					{:else}
						<input type="hidden" name={key} {value} />
					{/if}
				{/each}
			{/if}
			<Dialog.Footer class="mt-2">
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={submitting}>
					Batal
				</Button>
				<Button type="submit" {variant} disabled={submitting}>
					{#if submitting}
						<LoaderCircle class="animate-spin" />
					{/if}
					{confirmLabel}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

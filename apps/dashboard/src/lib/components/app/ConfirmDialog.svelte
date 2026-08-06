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
		hiddenFields
	}: {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		action: string;
		variant?: ButtonVariant;
		hiddenFields?: Record<string, string>;
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
				return async ({ update }) => {
					submitting = false;
					open = false;
					await update();
				};
			}}
		>
			{#if hiddenFields}
				{#each Object.entries(hiddenFields) as [key, value] (key)}
					<input type="hidden" name={key} {value} />
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

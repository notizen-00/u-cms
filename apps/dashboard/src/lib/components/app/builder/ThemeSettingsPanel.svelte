<script lang="ts">
	/**
	 * Renders a theme's `settings` schema (docs/cms_sdk.md §15) via the same
	 * `PropertyField.svelte` the standalone `/sites/{id}/theme/settings` page
	 * and the Builder's block inspector both use — extracted here so the
	 * Builder's "Tema" tab can show the identical form without duplicating the
	 * field loop. Controlled (`bind:value`), not form-submitted: the caller
	 * owns saving (see `onChange`), same split BlockInspector.svelte uses for
	 * block props.
	 */
	import PropertyField from '$lib/components/app/theme/PropertyField.svelte';
	import type { PropertySchema } from '$lib/types';

	let {
		schema,
		values,
		siteId,
		disabled = false,
		onChange
	}: {
		schema: PropertySchema;
		values: Record<string, unknown>;
		siteId: string;
		disabled?: boolean;
		onChange: (values: Record<string, unknown>) => void;
	} = $props();

	const fields = $derived(Object.entries(schema));

	let draft = $state<Record<string, unknown>>({ ...values });

	$effect(() => {
		const next = $state.snapshot(draft) as Record<string, unknown>;
		if (JSON.stringify(next) === JSON.stringify(values)) return;
		onChange(next);
	});
</script>

{#if fields.length === 0}
	<p class="text-sm text-muted-foreground">Tema ini tidak menyediakan opsi yang bisa diatur.</p>
{:else}
	<fieldset {disabled} class="space-y-4">
		{#each fields as [key, field] (key)}
			<PropertyField name={key} {field} {siteId} initialValue={values[key]} bind:value={draft[key]} />
		{/each}
	</fieldset>
{/if}

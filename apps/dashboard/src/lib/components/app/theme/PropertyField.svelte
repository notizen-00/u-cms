<script lang="ts">
	/**
	 * Renders one `PropertyFieldSchema` as its matching control — the single
	 * schema-to-control mapping in the app, shared by the theme settings form
	 * and the Page Builder's block inspector (docs/theme_aware_prd.md §7).
	 *
	 * Every control is bound to `value`, and every control still carries
	 * `name`. That serves both callers without two code paths: the settings
	 * page keeps submitting through FormData exactly as before (a bound input
	 * with a `name` still posts), while the builder — which has no surrounding
	 * form and needs each keystroke reflected in its live block state — reads
	 * the same `value` via `bind:`.
	 */
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Select } from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import MediaPicker from '$lib/components/app/media/MediaPicker.svelte';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import type { Media, PropertyFieldSchema } from '$lib/types';

	let {
		name,
		field,
		initialValue,
		siteId,
		value = $bindable()
	}: {
		name: string;
		field: PropertyFieldSchema;
		initialValue?: unknown;
		siteId: string;
		value?: unknown;
	} = $props();

	function seed(): unknown {
		if (initialValue !== undefined && initialValue !== null) return initialValue;
		if ('default' in field && field.default !== undefined) return field.default;
		if (field.type === 'boolean') return false;
		if (field.type === 'array') return [];
		if (field.type === 'object') return {};
		if (field.type === 'color') return '#000000';
		return '';
	}

	// Seeded once on purpose: this is the field's starting value, not a live
	// mirror of a parent that would fight the user's own typing.
	if (value === undefined) value = seed();

	// Bound separately because these need a specific primitive type, which
	// `unknown` can't provide directly to the control.
	let textValue = $state(String(value ?? ''));
	let numberValue = $state(Number(value ?? 0));
	let boolValue = $state(Boolean(value));
	let jsonText = $state(JSON.stringify(value ?? (field.type === 'array' ? [] : {}), null, 2));

	let mediaPickerOpen = $state(false);

	const jsonError = $derived.by(() => {
		try {
			JSON.parse(jsonText);
			return '';
		} catch {
			return 'JSON tidak valid.';
		}
	});

	// Each control owns one of the typed mirrors above; whichever one this
	// field actually renders is the one that writes back to `value`.
	$effect(() => {
		if (field.type === 'number') value = numberValue;
		else if (field.type === 'boolean') value = boolValue;
		else if (field.type === 'array' || field.type === 'object') {
			try {
				value = JSON.parse(jsonText);
			} catch {
				// Keep the last valid value while the author is mid-edit rather
				// than writing a broken one into the block.
			}
		} else value = textValue;
	});
</script>

<div class="space-y-1.5">
	{#if field.type !== 'boolean'}
		<Label for={name}>{field.label}{#if field.required}<span aria-hidden="true"> *</span>{/if}</Label>
	{/if}
	{#if field.description}
		<p class="text-xs text-muted-foreground">{field.description}</p>
	{/if}

	{#if field.type === 'string'}
		<Input
			id={name}
			{name}
			bind:value={textValue}
			placeholder={field.placeholder}
			required={field.required}
		/>
	{:else if field.type === 'number'}
		<Input
			id={name}
			{name}
			type="number"
			bind:value={numberValue}
			min={field.min}
			max={field.max}
			step={field.step ?? 'any'}
			required={field.required}
		/>
	{:else if field.type === 'boolean'}
		<label class="flex items-center gap-2 text-sm font-medium" for={name}>
			<Checkbox id={name} {name} bind:checked={boolValue} />
			{field.label}{#if field.required}<span aria-hidden="true"> *</span>{/if}
		</label>
	{:else if field.type === 'select'}
		<Select id={name} {name} bind:value={textValue} required={field.required}>
			{#each field.options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</Select>
	{:else if field.type === 'color'}
		<div class="flex items-center gap-2">
			<input
				type="color"
				bind:value={textValue}
				aria-label={field.label}
				class="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
			/>
			<Input {name} bind:value={textValue} class="font-mono" placeholder="#075985" required={field.required} />
		</div>
	{:else if field.type === 'media'}
		<div class="flex gap-2">
			<Input id={name} {name} bind:value={textValue} placeholder="https://…" />
			<Button type="button" variant="outline" onclick={() => (mediaPickerOpen = true)}>
				<ImagePlus /> Pilih
			</Button>
		</div>
		<MediaPicker {siteId} bind:open={mediaPickerOpen} onSelect={(media: Media) => (textValue = media.url)} />
	{:else if field.type === 'richtext'}
		<Textarea id={name} {name} bind:value={textValue} rows={6} required={field.required} />
	{:else if field.type === 'array' || field.type === 'object'}
		<Textarea id={name} {name} bind:value={jsonText} rows={6} class="font-mono text-xs" />
		{#if jsonError}
			<p class="text-xs text-destructive">{jsonError}</p>
		{:else}
			<p class="text-xs text-muted-foreground">
				Berupa JSON ({field.type === 'array' ? 'daftar' : 'objek'}).
			</p>
		{/if}
	{/if}
</div>

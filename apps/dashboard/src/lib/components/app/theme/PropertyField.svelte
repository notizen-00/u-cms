<script lang="ts">
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
		siteId
	}: { name: string; field: PropertyFieldSchema; initialValue: unknown; siteId: string } = $props();

	// Only fields whose control needs to stay in sync with a second control
	// (color swatch + hex text, media URL + picker) or needs live validation
	// feedback (JSON) hold their own state — everything else is an
	// uncontrolled native input read straight from FormData on submit, same
	// convention as sites/[siteId]/edit/+page.svelte.
	let colorValue = $state(String(initialValue ?? (field as { default?: string }).default ?? '#000000'));
	let mediaValue = $state(String(initialValue ?? ''));
	let mediaPickerOpen = $state(false);
	let jsonText = $state(JSON.stringify(initialValue ?? (field.type === 'array' ? [] : {}), null, 2));
	const jsonError = $derived.by(() => {
		try {
			JSON.parse(jsonText);
			return '';
		} catch {
			return 'JSON tidak valid.';
		}
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
			value={String(initialValue ?? field.default ?? '')}
			placeholder={field.placeholder}
			required={field.required}
		/>
	{:else if field.type === 'number'}
		<Input
			id={name}
			{name}
			type="number"
			value={String(initialValue ?? field.default ?? '')}
			min={field.min}
			max={field.max}
			step={field.step ?? 'any'}
			required={field.required}
		/>
	{:else if field.type === 'boolean'}
		<label class="flex items-center gap-2 text-sm font-medium" for={name}>
			<Checkbox id={name} {name} checked={Boolean(initialValue ?? field.default)} />
			{field.label}{#if field.required}<span aria-hidden="true"> *</span>{/if}
		</label>
	{:else if field.type === 'select'}
		<Select id={name} {name} value={String(initialValue ?? field.default ?? '')} required={field.required}>
			{#each field.options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</Select>
	{:else if field.type === 'color'}
		<div class="flex items-center gap-2">
			<input
				type="color"
				bind:value={colorValue}
				aria-label={field.label}
				class="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
			/>
			<Input {name} bind:value={colorValue} class="font-mono" placeholder="#075985" required={field.required} />
		</div>
	{:else if field.type === 'media'}
		<div class="flex gap-2">
			<Input id={name} {name} bind:value={mediaValue} placeholder="https://…" />
			<Button type="button" variant="outline" onclick={() => (mediaPickerOpen = true)}>
				<ImagePlus /> Pilih
			</Button>
		</div>
		<MediaPicker {siteId} bind:open={mediaPickerOpen} onSelect={(media: Media) => (mediaValue = media.url)} />
	{:else if field.type === 'richtext'}
		<Textarea
			id={name}
			{name}
			value={String(initialValue ?? field.default ?? '')}
			rows={6}
			required={field.required}
		/>
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

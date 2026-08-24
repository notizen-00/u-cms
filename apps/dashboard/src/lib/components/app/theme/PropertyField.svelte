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
	import ImageResizer from '$lib/components/app/media/ImageResizer.svelte';
	// Self-import: `array`/`object` fields render one nested PropertyField per
	// sub-field, so this component recurses into itself — Svelte supports a
	// component importing its own file for exactly this.
	import PropertyField from './PropertyField.svelte';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Crop from '@lucide/svelte/icons/crop';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Media, PropertySchema, PropertyFieldSchema } from '$lib/types';

	/** `.svg` is deliberately excluded — cropping it would rasterize a vector logo into a fixed-size PNG. */
	const RASTER_IMAGE_URL = /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i;

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

	let mediaPickerOpen = $state(false);
	let resizerOpen = $state(false);

	/** Default value for one field of a nested schema — same rules as this component's own `seed()`, generalised for array items / object properties. */
	function seedField(subField: PropertyFieldSchema): unknown {
		if ('default' in subField && subField.default !== undefined) return subField.default;
		if (subField.type === 'boolean') return false;
		if (subField.type === 'array') return [];
		if (subField.type === 'object') return {};
		if (subField.type === 'color') return '#000000';
		return '';
	}

	function seedFromSchema(schema: PropertySchema): Record<string, unknown> {
		const result: Record<string, unknown> = {};
		for (const [key, subField] of Object.entries(schema)) result[key] = seedField(subField);
		return result;
	}

	interface ArrayEntry {
		key: string;
		data: Record<string, unknown>;
	}

	// Each row keeps a stable synthetic `key` alongside its data (rather than a
	// parallel keys array, or the row's own index) so reordering/removing a
	// row can never leave a nested PropertyField showing another row's
	// leftover state — Svelte only reuses a component instance when its
	// `{#each ... (key)}` key matches, and this key never changes for a row
	// even as its position or content does.
	let arrayEntries = $state<ArrayEntry[]>(
		field.type === 'array' && Array.isArray(value)
			? (value as Record<string, unknown>[]).map((item) => ({
					key: crypto.randomUUID(),
					data: { ...item }
				}))
			: []
	);

	let objectValue = $state<Record<string, unknown>>(
		field.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)
			? { ...(value as Record<string, unknown>) }
			: {}
	);

	function addArrayItem() {
		if (field.type !== 'array') return;
		arrayEntries = [...arrayEntries, { key: crypto.randomUUID(), data: seedFromSchema(field.items) }];
	}

	function removeArrayItem(index: number) {
		arrayEntries = arrayEntries.filter((_, i) => i !== index);
	}

	function moveArrayItem(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= arrayEntries.length) return;
		const next = [...arrayEntries];
		[next[index], next[target]] = [next[target], next[index]];
		arrayEntries = next;
	}

	// Each control owns one of the typed mirrors above; whichever one this
	// field actually renders is the one that writes back to `value`.
	$effect(() => {
		if (field.type === 'number') value = numberValue;
		else if (field.type === 'boolean') value = boolValue;
		else if (field.type === 'array') value = arrayEntries.map((entry) => $state.snapshot(entry.data));
		else if (field.type === 'object') value = $state.snapshot(objectValue);
		else value = textValue;
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
		{#if textValue}
			<img
				src={textValue}
				alt=""
				class="h-20 w-20 rounded-md border border-border bg-muted object-cover"
			/>
		{/if}
		<div class="flex gap-2">
			<Input id={name} {name} bind:value={textValue} placeholder="https://…" />
			<Button type="button" variant="outline" onclick={() => (mediaPickerOpen = true)}>
				<ImagePlus /> Pilih
			</Button>
			{#if textValue && RASTER_IMAGE_URL.test(textValue)}
				<Button type="button" variant="outline" onclick={() => (resizerOpen = true)} title="Pangkas/ubah ukuran">
					<Crop />
				</Button>
			{/if}
		</div>
		<MediaPicker {siteId} bind:open={mediaPickerOpen} onSelect={(media: Media) => (textValue = media.url)} />
		{#if textValue}
			<ImageResizer
				{siteId}
				bind:open={resizerOpen}
				imageUrl={textValue}
				onApply={(media: Media) => (textValue = media.url)}
			/>
		{/if}
	{:else if field.type === 'richtext'}
		<Textarea id={name} {name} bind:value={textValue} rows={6} required={field.required} />
	{:else if field.type === 'array'}
		<div class="space-y-2">
			{#each arrayEntries as entry, index (entry.key)}
				<div class="space-y-3 rounded-md border border-border bg-muted/20 p-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-muted-foreground">Item {index + 1}</span>
						<div class="flex items-center gap-0.5">
							<button
								type="button"
								class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
								disabled={index === 0}
								onclick={() => moveArrayItem(index, -1)}
								title="Pindah ke atas"
								aria-label="Pindah ke atas"
							>
								<ArrowUp class="size-3.5" />
							</button>
							<button
								type="button"
								class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
								disabled={index === arrayEntries.length - 1}
								onclick={() => moveArrayItem(index, 1)}
								title="Pindah ke bawah"
								aria-label="Pindah ke bawah"
							>
								<ArrowDown class="size-3.5" />
							</button>
							<button
								type="button"
								class="rounded p-1 text-destructive hover:bg-destructive/10"
								onclick={() => removeArrayItem(index)}
								title="Hapus item"
								aria-label="Hapus item"
							>
								<Trash2 class="size-3.5" />
							</button>
						</div>
					</div>
					{#each Object.entries(field.items) as [subKey, subField] (subKey)}
						<PropertyField
							name={`${name}.${index}.${subKey}`}
							field={subField}
							{siteId}
							initialValue={entry.data[subKey]}
							bind:value={entry.data[subKey]}
						/>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">Belum ada item.</p>
			{/each}
			<Button type="button" variant="outline" size="sm" onclick={addArrayItem}>
				<Plus class="size-3.5" /> Tambah {field.label}
			</Button>
		</div>
	{:else if field.type === 'object'}
		<div class="space-y-3 rounded-md border border-border bg-muted/20 p-3">
			{#each Object.entries(field.properties) as [subKey, subField] (subKey)}
				<PropertyField
					name={`${name}.${subKey}`}
					field={subField}
					{siteId}
					initialValue={objectValue[subKey]}
					bind:value={objectValue[subKey]}
				/>
			{/each}
		</div>
	{/if}
</div>

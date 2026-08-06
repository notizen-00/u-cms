<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select } from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { FORM_FIELD_TYPES, type FormField } from '$lib/types';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { fields = $bindable() }: { fields: FormField[] } = $props();

	function addField() {
		fields = [...fields, { key: '', label: '', type: 'text', required: false }];
	}

	function removeField(index: number) {
		fields = fields.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-3">
	{#each fields as field, i (i)}
		<div class="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-6">
			<div class="space-y-1 sm:col-span-2">
				<Label>Key (nama field)</Label>
				<Input bind:value={field.key} placeholder="mis. nama_lengkap" />
			</div>
			<div class="space-y-1 sm:col-span-2">
				<Label>Label</Label>
				<Input bind:value={field.label} placeholder="mis. Nama Lengkap" />
			</div>
			<div class="space-y-1">
				<Label>Tipe</Label>
				<Select bind:value={field.type}>
					{#each FORM_FIELD_TYPES as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</Select>
			</div>
			<div class="flex items-end justify-between gap-2">
				<label class="flex items-center gap-1.5 text-sm">
					<input type="checkbox" bind:checked={field.required} class="size-4 rounded border-input" />
					Wajib
				</label>
				<Button type="button" variant="ghost" size="icon" onclick={() => removeField(i)} aria-label="Hapus field">
					<Trash2 class="size-4 text-destructive" />
				</Button>
			</div>
			{#if field.type === 'select'}
				<div class="space-y-1 sm:col-span-6">
					<Label>Pilihan (pisahkan dengan koma)</Label>
					<Input bind:value={field.options} placeholder="Umum, Akademik, Lainnya" />
				</div>
			{:else if field.type !== 'checkbox'}
				<div class="space-y-1 sm:col-span-6">
					<Label>Placeholder (opsional)</Label>
					<Input bind:value={field.placeholder} />
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">Belum ada field. Tambahkan minimal satu.</p>
	{/each}

	<Button type="button" variant="outline" size="sm" onclick={addField}>
		<Plus class="size-4" /> Tambah Field
	</Button>
</div>

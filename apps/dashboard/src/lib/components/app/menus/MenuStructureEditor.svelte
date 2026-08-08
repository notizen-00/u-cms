<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Select } from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Indent from '@lucide/svelte/icons/indent';
	import Outdent from '@lucide/svelte/icons/outdent';
	import X from '@lucide/svelte/icons/x';
	import FileText from '@lucide/svelte/icons/file-text';
	import Link from '@lucide/svelte/icons/link';
	import type { PageItem } from '$lib/types';
	import {
		depthOf,
		descendantIds,
		indentItem,
		moveSibling,
		outdentItem,
		removeItem,
		reorderWithinParent,
		setParent,
		type EditableMenuItem
	} from './menu-tree';

	let { items = $bindable(), pages }: { items: EditableMenuItem[]; pages: PageItem[] } = $props();

	function pageLabel(pageId: string | null) {
		if (!pageId) return '(halaman terhapus)';
		return pages.find((p) => p.id === pageId)?.title ?? '(halaman terhapus)';
	}

	/* ---------------- drag to reorder (siblings only — see reorderWithinParent) ---------------- */

	let dragTempId = $state<string | null>(null);
	let dragOverTempId = $state<string | null>(null);
	let handleArmedId = $state<string | null>(null);

	function endDrag() {
		dragTempId = null;
		dragOverTempId = null;
		handleArmedId = null;
	}
</script>

{#if items.length === 0}
	<p class="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
		Belum ada item. Tambahkan halaman atau tautan kustom dari panel di samping.
	</p>
{:else}
	<ul class="space-y-1.5">
		{#each items as item (item.tempId)}
			{@const depth = depthOf(items, item.tempId)}
			{@const siblingCount = items.filter((i) => i.parentTempId === item.parentTempId).length}
			{@const siblingIndex = items
				.filter((i) => i.parentTempId === item.parentTempId)
				.findIndex((i) => i.tempId === item.tempId)}
			{@const excluded = descendantIds(items, item.tempId)}
			<li style={`margin-left: ${depth * 28}px`}>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					role="group"
					draggable={handleArmedId === item.tempId}
					ondragstart={() => (dragTempId = item.tempId)}
					ondragover={(e) => {
						e.preventDefault();
						dragOverTempId = item.tempId;
					}}
					ondragleave={() => (dragOverTempId = null)}
					ondrop={(e) => {
						e.preventDefault();
						if (dragTempId && dragTempId !== item.tempId) {
							items = reorderWithinParent(items, dragTempId, item.tempId);
						}
						endDrag();
					}}
					ondragend={endDrag}
					class={cn(
						'flex items-start gap-2 rounded-md border bg-background p-2.5 transition-colors',
						dragOverTempId === item.tempId && dragTempId !== item.tempId && 'border-primary border-dashed',
						dragTempId === item.tempId && 'opacity-40'
					)}
				>
					<button
						type="button"
						class="mt-1 shrink-0 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted"
						onmousedown={() => (handleArmedId = item.tempId)}
						onmouseup={() => (handleArmedId = null)}
						title="Seret untuk memindahkan"
						aria-label="Seret untuk memindahkan"
					>
						<GripVertical class="size-4" />
					</button>

					<div class="mt-1 shrink-0 text-muted-foreground">
						{#if item.type === 'page'}<FileText class="size-4" />{:else}<Link class="size-4" />{/if}
					</div>

					<div class="min-w-0 flex-1 space-y-1.5">
						<Input bind:value={item.label} placeholder="Label navigasi" class="h-8" />
						{#if item.type === 'page'}
							<p class="text-xs text-muted-foreground">Halaman: {pageLabel(item.pageId)}</p>
						{:else}
							<Input
								value={item.url ?? ''}
								oninput={(e) => (item.url = (e.target as HTMLInputElement).value)}
								placeholder="https://... atau /path"
								class="h-8 font-mono text-xs"
							/>
						{/if}
						<div class="flex items-center gap-3">
							<label class="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
								<Checkbox bind:checked={item.newTab} />
								Tab baru
							</label>
							<Select
								value={item.parentTempId ?? ''}
								onchange={(e) => {
									const value = (e.target as HTMLSelectElement).value;
									items = setParent(items, item.tempId, value || null);
								}}
								class="h-7 flex-1 text-xs"
								aria-label="Induk"
							>
								<option value="">— Induk: level atas —</option>
								{#each items.filter((i) => !excluded.has(i.tempId)) as option (option.tempId)}
									<option value={option.tempId}
										>{'—'.repeat(depthOf(items, option.tempId))} {option.label || '(tanpa label)'}</option
									>
								{/each}
							</Select>
						</div>
					</div>

					<div class="flex shrink-0 flex-col gap-0.5">
						<div class="flex gap-0.5">
							<Button
								type="button"
								variant="outline"
								size="icon"
								class="size-7"
								disabled={siblingIndex <= 0}
								title="Pindah ke atas"
								onclick={() => (items = moveSibling(items, item.tempId, -1))}
							>
								<ChevronUp class="size-3.5" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="icon"
								class="size-7"
								disabled={siblingIndex >= siblingCount - 1}
								title="Pindah ke bawah"
								onclick={() => (items = moveSibling(items, item.tempId, 1))}
							>
								<ChevronDown class="size-3.5" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="icon"
								class="size-7"
								disabled={siblingIndex <= 0}
								title="Jadikan sub-menu"
								onclick={() => (items = indentItem(items, item.tempId))}
							>
								<Indent class="size-3.5" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="icon"
								class="size-7"
								disabled={depth === 0}
								title="Naikkan level"
								onclick={() => (items = outdentItem(items, item.tempId))}
							>
								<Outdent class="size-3.5" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="icon"
								class="size-7 text-destructive hover:text-destructive"
								title="Hapus"
								onclick={() => (items = removeItem(items, item.tempId))}
							>
								<X class="size-3.5" />
							</Button>
						</div>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{/if}

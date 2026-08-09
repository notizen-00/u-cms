<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MediaPicker from '$lib/components/app/media/MediaPicker.svelte';
	import BlockFields from './BlockFields.svelte';
	import {
		BLOCK_CATEGORIES,
		BLOCK_TYPE_LABELS,
		OVERLAY_EDITED_TYPES,
		PAGE_BUILDER_PATTERNS,
		PAGE_BUILDER_RICH_TYPES,
		blocksToMarkdown,
		createBlock,
		createPatternBlocks,
		duplicateBlock,
		markdownToBlocks,
		type Block,
		type BlockType,
		type PageBuilderPatternId
	} from '$lib/editor/blocks';
	import { renderMarkdown } from '$lib/editor/render';
	import type { CmsForm, Media } from '$lib/types';
	import { cn } from '$lib/utils';

	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Copy from '@lucide/svelte/icons/copy';
	import Pencil from '@lucide/svelte/icons/pencil';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Columns2 from '@lucide/svelte/icons/columns-2';
	import Search from '@lucide/svelte/icons/search';

	import Heading2 from '@lucide/svelte/icons/heading-2';
	import Pilcrow from '@lucide/svelte/icons/pilcrow';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Quote from '@lucide/svelte/icons/quote';
	import ListIcon from '@lucide/svelte/icons/list';
	import Code from '@lucide/svelte/icons/code';
	import Minus from '@lucide/svelte/icons/minus';
	import TableIcon from '@lucide/svelte/icons/table';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
	import Video from '@lucide/svelte/icons/video';
	import FileCode from '@lucide/svelte/icons/file-code';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Images from '@lucide/svelte/icons/images';
	import Chart from '@lucide/svelte/icons/chart-no-axes-column-increasing';
	import CircleQuestion from '@lucide/svelte/icons/circle-question-mark';
	import MoveVertical from '@lucide/svelte/icons/move-vertical';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Tablet from '@lucide/svelte/icons/tablet';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import LayoutTemplate from '@lucide/svelte/icons/layout-template';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Redo2 from '@lucide/svelte/icons/redo-2';

	let {
		value = $bindable(''),
		name,
		siteId,
		forms = [],
		enabled = false,
		formBuilderEnabled = false
	}: {
		value?: string;
		name: string;
		siteId: string;
		forms?: CmsForm[];
		enabled?: boolean;
		formBuilderEnabled?: boolean;
	} = $props();

	type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
	const PREVIEW_DEVICES: { id: PreviewDevice; label: string; icon: typeof Monitor }[] = [
		{ id: 'desktop', label: 'Desktop', icon: Monitor },
		{ id: 'tablet', label: 'Tablet', icon: Tablet },
		{ id: 'mobile', label: 'Mobile', icon: Smartphone }
	];

	const BLOCK_ICONS: Record<BlockType, typeof Heading2> = {
		heading: Heading2,
		paragraph: Pilcrow,
		image: ImageIcon,
		quote: Quote,
		list: ListIcon,
		code: Code,
		divider: Minus,
		table: TableIcon,
		columns: Columns2,
		button: MousePointerClick,
		embed: Video,
		calendar: CalendarIcon,
		html: FileCode,
		form: ClipboardList,
		hero: Sparkles,
		callout: Megaphone,
		cards: LayoutGrid,
		gallery: Images,
		stats: Chart,
		faq: CircleQuestion,
		spacer: MoveVertical
	};

	let mode = $state<'visual' | 'preview' | 'code'>('visual');
	let splitPreview = $state(false);
	let listViewOpen = $state(false);
	let previewDevice = $state<PreviewDevice>('desktop');
	const initialBlocks = value ? markdownToBlocks(value) : [createBlock('paragraph')];
	let blocks = $state<Block[]>(initialBlocks);
	let selectedId = $state<string | null>(null);
	const pageBuilderTypes = new Set<BlockType>(PAGE_BUILDER_RICH_TYPES);
	let history = $state<string[]>([JSON.stringify(initialBlocks)]);
	let historyIndex = $state(0);
	let historyTimer: ReturnType<typeof setTimeout> | undefined;

	const markdown = $derived(mode === 'visual' ? blocksToMarkdown(blocks) : value);
	const wordCount = $derived.by(() => {
		const plain = markdown
			.replace(/<!--[\s\S]*?-->/g, ' ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/[#>*_`|\[\]()-]/g, ' ')
			.trim();
		return plain ? plain.split(/\s+/).length : 0;
	});
	const previewWidth = $derived(
		previewDevice === 'mobile' ? 'max-w-[375px]' : previewDevice === 'tablet' ? 'max-w-[768px]' : 'max-w-none'
	);

	// Keep the submitted value in sync while editing on the canvas.
	$effect(() => {
		if (mode === 'visual') value = blocksToMarkdown(blocks);
	});

	// Debounced snapshots keep typing fluid while still making structural and
	// inspector edits undoable. Restores reuse the saved block JSON, including ids.
	$effect(() => {
		if (mode !== 'visual') return;
		const snapshot = JSON.stringify(blocks);
		if (historyIndex >= 0 && history[historyIndex] === snapshot) return;
		clearTimeout(historyTimer);
		historyTimer = setTimeout(() => {
			const next = [...history.slice(0, historyIndex + 1), snapshot].slice(-50);
			history = next;
			historyIndex = next.length - 1;
		}, historyIndex < 0 ? 0 : 300);
		return () => clearTimeout(historyTimer);
	});

	function restoreHistory(index: number) {
		if (index < 0 || index >= history.length) return;
		blocks = JSON.parse(history[index]) as Block[];
		historyIndex = index;
		selectedId = blocks.some((block) => block.id === selectedId) ? selectedId : blocks[0]?.id ?? null;
	}

	function onEditorKeydown(event: KeyboardEvent) {
		if (mode !== 'visual' || (!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'z') return;
		const target = event.target as HTMLElement | null;
		if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
		event.preventDefault();
		restoreHistory(historyIndex + (event.shiftKey ? 1 : -1));
	}

	function preventPreviewNavigation(event: MouseEvent) {
		const target = event.target;
		if (target instanceof Element && target.closest('a')) event.preventDefault();
	}

	function onCanvasBlockClick(event: MouseEvent, blockId: string) {
		selectedId = blockId;
		preventPreviewNavigation(event);
	}

	function switchToVisual() {
		blocks = value ? markdownToBlocks(value) : [createBlock('paragraph')];
		mode = 'visual';
	}

	/* ---------------- block operations ---------------- */

	function insertBlock(type: BlockType, index: number | null = null, openAfterMs = 0) {
		const block = createBlock(type);
		const at = index ?? blocks.length;
		blocks = [...blocks.slice(0, at), block, ...blocks.slice(at)];
		selectedId = block.id;
		if (!OVERLAY_EDITED_TYPES.includes(type)) return;

		// Blocks that need configuring open straight into the overlay. When this came from
		// the inserter we wait for its close animation first — two dialogs open at once
		// would stack their overlays and darken the screen twice over.
		if (openAfterMs > 0) {
			setTimeout(() => openOverlay(block.id), openAfterMs);
		} else {
			openOverlay(block.id);
		}
	}

	function removeBlock(id: string) {
		blocks = blocks.length > 1 ? blocks.filter((b) => b.id !== id) : [createBlock('paragraph')];
	}

	function duplicate(index: number) {
		const copy = duplicateBlock(blocks[index]);
		blocks = [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
	}

	function moveBlock(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= blocks.length) return;
		const copy = [...blocks];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		blocks = copy;
	}

	/* ---------------- drag to reorder ---------------- */

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let handleArmedId = $state<string | null>(null);

	function onDrop(index: number) {
		if (dragIndex === null || dragIndex === index) return;
		const copy = [...blocks];
		const [moved] = copy.splice(dragIndex, 1);
		copy.splice(index, 0, moved);
		blocks = copy;
		dragIndex = null;
		dragOverIndex = null;
	}

	/* ---------------- overlay editor ---------------- */

	let overlayOpen = $state(false);
	let overlayBlockId = $state<string | null>(null);
	const overlayBlock = $derived(blocks.find((b) => b.id === overlayBlockId) ?? null);

	function openOverlay(id: string) {
		overlayBlockId = id;
		overlayOpen = true;
	}

	/* ---------------- media picker ---------------- */

	let pickerOpen = $state(false);
	let pickerBlockId = $state<string | null>(null);
	let pickerTarget = $state('block');
	let reopenOverlayAfterPick = $state(false);

	function onPickImage(blockId: string, target = 'block') {
		pickerBlockId = blockId;
		pickerTarget = target;
		// Close the overlay first — opening the picker on top of it would stack two
		// dialog overlays and darken the screen twice over.
		if (overlayOpen) {
			overlayOpen = false;
			reopenOverlayAfterPick = true;
		}
		pickerOpen = true;
	}

	$effect(() => {
		if (!pickerOpen && reopenOverlayAfterPick) {
			reopenOverlayAfterPick = false;
			overlayOpen = true;
		}
	});

	function onImageSelected(media: Media) {
		blocks = blocks.map((block) => {
			if (block.id !== pickerBlockId) return block;
			if (pickerTarget === 'hero') {
				return { ...block, imageUrl: media.url, imageAlt: media.altText ?? block.imageAlt };
			}
			if (pickerTarget.startsWith('card:')) {
				const itemId = pickerTarget.slice('card:'.length);
				return {
					...block,
					cards: block.cards.map((item) => item.id === itemId
						? { ...item, imageUrl: media.url, imageAlt: media.altText ?? item.imageAlt }
						: item)
				};
			}
			if (pickerTarget.startsWith('gallery:')) {
				const itemId = pickerTarget.slice('gallery:'.length);
				return {
					...block,
					gallery: block.gallery.map((item) => item.id === itemId
						? { ...item, url: media.url, alt: media.altText ?? item.alt }
						: item)
				};
			}
			return { ...block, url: media.url, alt: media.altText ?? block.alt };
		});
	}

	/* ---------------- inserter ---------------- */

	let inserterOpen = $state(false);
	let inserterIndex = $state<number | null>(null);
	let inserterQuery = $state('');

	function openInserter(index: number | null) {
		inserterIndex = index;
		inserterQuery = '';
		inserterOpen = true;
	}

	function chooseBlock(type: BlockType) {
		if ((!enabled && pageBuilderTypes.has(type)) || (!formBuilderEnabled && type === 'form')) return;
		inserterOpen = false;
		insertBlock(type, inserterIndex, 200);
	}

	function choosePattern(patternId: PageBuilderPatternId) {
		if (!enabled) return;
		const patternBlocks = createPatternBlocks(patternId);
		const at = inserterIndex ?? blocks.length;
		blocks = [...blocks.slice(0, at), ...patternBlocks, ...blocks.slice(at)];
		selectedId = patternBlocks[0]?.id ?? null;
		inserterOpen = false;
	}

	const filteredCategories = $derived(
		BLOCK_CATEGORIES.map((category) => ({
			label: category.label,
			types: category.types.filter((type) => {
				if (!enabled && pageBuilderTypes.has(type)) return false;
				if (!formBuilderEnabled && type === 'form') return false;
				return BLOCK_TYPE_LABELS[type].toLowerCase().includes(inserterQuery.trim().toLowerCase());
			})
		})).filter((category) => category.types.length > 0)
	);
	const filteredPatterns = $derived(
		enabled ? PAGE_BUILDER_PATTERNS.filter((pattern) => {
			const query = inserterQuery.trim().toLowerCase();
			return !query || `${pattern.name} ${pattern.description}`.toLowerCase().includes(query);
		}) : []
	);

	/* ---------------- canvas helpers ---------------- */

	/** Renders one block through the same markdown pipeline the published site uses. */
	function blockPreviewHtml(block: Block): string {
		return renderMarkdown(blocksToMarkdown([block]));
	}

	function autoresize(node: HTMLTextAreaElement) {
		const resize = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		};
		resize();
		node.addEventListener('input', resize);
		return {
			destroy: () => node.removeEventListener('input', resize)
		};
	}
</script>

<svelte:window onkeydown={onEditorKeydown} />

<div class="space-y-3">
	{#if !enabled}
		<div class="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
			<p class="font-semibold text-foreground">Page Builder belum aktif</p>
			<p class="mt-1 text-muted-foreground">
				Editor blok inti tetap tersedia. Aktifkan plugin Page Builder untuk membuka Hero, Cards,
				Gallery, Statistik, FAQ, Spacer, dan pola halaman siap pakai.
			</p>
			<a href="/sites/{siteId}/plugins" class="mt-2 inline-flex font-medium text-primary hover:underline">Kelola plugin</a>
		</div>
	{/if}
	<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border">
		<div class="flex gap-1">
			<button
				type="button"
				class={cn(
					'border-b-2 px-3 py-2 text-sm font-medium',
					mode === 'visual' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
				)}
				onclick={switchToVisual}
			>
				Visual
			</button>
			<button
				type="button"
				class={cn(
					'border-b-2 px-3 py-2 text-sm font-medium',
					mode === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
				)}
				onclick={() => (mode = 'preview')}
			>
				Pratinjau
			</button>
			<button
				type="button"
				class={cn(
					'border-b-2 px-3 py-2 text-sm font-medium',
					mode === 'code' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
				)}
				onclick={() => (mode = 'code')}
			>
				Kode
			</button>
		</div>

		<div class="mb-1 flex flex-wrap items-center justify-end gap-1.5">
			{#if mode === 'visual'}
				<div class="flex rounded-md border border-border bg-background p-0.5">
					<button type="button" class="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" disabled={historyIndex <= 0} onclick={() => restoreHistory(historyIndex - 1)} title="Urungkan (Ctrl/Cmd+Z)" aria-label="Urungkan">
						<Undo2 class="size-3.5" />
					</button>
					<button type="button" class="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" disabled={historyIndex < 0 || historyIndex >= history.length - 1} onclick={() => restoreHistory(historyIndex + 1)} title="Ulangi (Ctrl/Cmd+Shift+Z)" aria-label="Ulangi">
						<Redo2 class="size-3.5" />
					</button>
				</div>
			{/if}
			<span class="mr-1 text-xs text-muted-foreground">{blocks.length} blok · {wordCount} kata</span>
			{#if mode === 'visual'}
				<button
					type="button"
					class={cn(
						'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
						listViewOpen ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
					)}
					onclick={() => (listViewOpen = !listViewOpen)}
					title="Tampilkan struktur blok"
				>
					<PanelLeft class="size-3.5" /> Struktur
				</button>
				<button
					type="button"
					class={cn(
						'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
						splitPreview ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
					)}
					onclick={() => (splitPreview = !splitPreview)}
					title="Tampilkan pratinjau langsung berdampingan"
				>
					<Columns2 class="size-3.5" /> Pratinjau langsung
				</button>
			{/if}
			{#if mode === 'preview' || splitPreview}
				<div class="flex rounded-md border border-border bg-background p-0.5" aria-label="Ukuran pratinjau">
					{#each PREVIEW_DEVICES as device (device.id)}
						{@const DeviceIcon = device.icon}
						<button
							type="button"
							class={cn('rounded p-1.5 text-muted-foreground hover:bg-muted', previewDevice === device.id && 'bg-muted text-primary')}
							onclick={() => (previewDevice = device.id)}
							title={device.label}
							aria-label={device.label}
						>
							<DeviceIcon class="size-3.5" />
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- What actually submits with the form, whichever tab is active. -->
	<textarea {name} value={markdown} class="hidden" readonly tabindex="-1"></textarea>

	{#if mode === 'code'}
		<Textarea bind:value rows={20} class="font-mono text-sm" placeholder="Tulis konten dalam Markdown..." />
	{:else if mode === 'preview'}
		<div class="min-h-96 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 sm:p-6">
			<!-- Links are visual-only inside the editor so an accidental click cannot
			     navigate away with unsaved changes. -->
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
			<div
				class={cn('markdown-preview mx-auto min-h-80 bg-background p-6 shadow-sm transition-[max-width]', previewWidth)}
				onclick={preventPreviewNavigation}
			>
				{@html renderMarkdown(markdown) || '<p class="text-sm">Belum ada konten.</p>'}
			</div>
		</div>
	{:else}
		<div class={cn(
			'grid gap-4',
			listViewOpen && splitPreview && 'lg:grid-cols-[220px_minmax(0,1fr)_minmax(280px,0.8fr)]',
			listViewOpen && !splitPreview && 'lg:grid-cols-[220px_minmax(0,1fr)]',
			!listViewOpen && splitPreview && 'lg:grid-cols-2'
		)}>
			{#if listViewOpen}
				<aside class="rounded-lg border border-border bg-muted/20 p-2 lg:sticky lg:top-4 lg:max-h-[70vh] lg:self-start lg:overflow-y-auto">
					<div class="mb-2 flex items-center justify-between px-2 py-1">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Struktur</p>
						<span class="text-[11px] text-muted-foreground">{blocks.length}</span>
					</div>
					<div class="space-y-1">
						{#each blocks as outlineBlock, outlineIndex (outlineBlock.id)}
							{@const OutlineIcon = BLOCK_ICONS[outlineBlock.type]}
							<button
								type="button"
								class={cn(
									'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted',
									selectedId === outlineBlock.id && 'bg-primary/10 text-primary'
								)}
								onclick={() => (selectedId = outlineBlock.id)}
							>
								<OutlineIcon class="size-3.5 shrink-0" />
								<span class="min-w-0 flex-1 truncate">{outlineBlock.text || outlineBlock.formTitle || BLOCK_TYPE_LABELS[outlineBlock.type]}</span>
								<span class="text-[10px] text-muted-foreground">{outlineIndex + 1}</span>
							</button>
						{/each}
					</div>
				</aside>
			{/if}
			<div class="space-y-1">
				{#each blocks as block, index (block.id)}
					{@const Icon = BLOCK_ICONS[block.type]}
					{@const isOverlayType = OVERLAY_EDITED_TYPES.includes(block.type)}

					<!-- Insert-between affordance, like Gutenberg's hover inserter. -->
					<div class="group/gap relative h-2">
						<button
							type="button"
							class="absolute left-1/2 top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-hover/gap:opacity-100"
							onclick={() => openInserter(index)}
							title="Sisipkan blok di sini"
						>
							<Plus class="size-3" />
						</button>
					</div>

					<!-- Click-to-select and double-click-to-edit are mouse shortcuts, mirroring
					     Gutenberg. Keyboard and screen-reader users get the same actions from the
					     explicit toolbar buttons above, so the div stays non-interactive for AT. -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
					<div
						role="group"
						draggable={handleArmedId === block.id}
						ondragstart={() => (dragIndex = index)}
						ondragover={(event: DragEvent) => {
							event.preventDefault();
							dragOverIndex = index;
						}}
						ondragleave={() => (dragOverIndex = null)}
						ondrop={(event: DragEvent) => {
							event.preventDefault();
							onDrop(index);
						}}
						ondragend={() => {
							dragIndex = null;
							dragOverIndex = null;
							handleArmedId = null;
						}}
						onclick={(event) => onCanvasBlockClick(event, block.id)}
						ondblclick={() => openOverlay(block.id)}
						class={cn(
							'relative rounded-md border bg-background p-3 transition-colors',
							selectedId === block.id ? 'border-primary ring-1 ring-primary/30' : 'border-transparent hover:border-border',
							dragOverIndex === index && dragIndex !== index && 'border-primary border-dashed',
							dragIndex === index && 'opacity-40'
						)}
					>
						<div class="mb-1.5 flex items-center gap-1.5">
							<button
								type="button"
								class="cursor-grab rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
								onmousedown={() => (handleArmedId = block.id)}
								onmouseup={() => (handleArmedId = null)}
								title="Seret untuk memindahkan"
								aria-label="Seret untuk memindahkan"
							>
								<GripVertical class="size-3.5" />
							</button>
							<Icon class="size-3.5 text-muted-foreground" />
							<span class="text-xs font-medium text-muted-foreground">{BLOCK_TYPE_LABELS[block.type]}</span>

							<div class="ml-auto flex items-center gap-0.5">
								<button
									type="button"
									class="rounded p-1 text-muted-foreground hover:bg-muted"
									onclick={() => openOverlay(block.id)}
									title="Edit di jendela (atau klik dua kali blok)"
								>
									<Pencil class="size-3.5" />
								</button>
								<button
									type="button"
									class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
									disabled={index === 0}
									onclick={() => moveBlock(index, -1)}
									title="Pindah ke atas"
								>
									<ArrowUp class="size-3.5" />
								</button>
								<button
									type="button"
									class="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
									disabled={index === blocks.length - 1}
									onclick={() => moveBlock(index, 1)}
									title="Pindah ke bawah"
								>
									<ArrowDown class="size-3.5" />
								</button>
								<button
									type="button"
									class="rounded p-1 text-muted-foreground hover:bg-muted"
									onclick={() => duplicate(index)}
									title="Duplikat blok"
								>
									<Copy class="size-3.5" />
								</button>
								<button
									type="button"
									class="rounded p-1 text-destructive hover:bg-destructive/10"
									onclick={() => removeBlock(block.id)}
									title="Hapus blok"
								>
									<Trash2 class="size-3.5" />
								</button>
							</div>
						</div>

						{#if block.type === 'heading'}
							<input
								bind:value={block.text}
								placeholder="Judul bagian..."
								class={cn(
									'w-full border-none bg-transparent font-bold outline-none placeholder:text-muted-foreground/60',
									block.level === 2 ? 'text-2xl' : block.level === 3 ? 'text-xl' : 'text-lg'
								)}
							/>
						{:else if block.type === 'paragraph'}
							<textarea
								bind:value={block.text}
								use:autoresize
								rows={2}
								placeholder="Tulis paragraf, atau klik dua kali untuk jendela editor..."
								class="w-full resize-none border-none bg-transparent leading-relaxed outline-none placeholder:text-muted-foreground/60"
							></textarea>
						{:else if block.type === 'quote'}
							<textarea
								bind:value={block.text}
								use:autoresize
								rows={2}
								placeholder="Tulis kutipan..."
								class="w-full resize-none border-l-4 border-border bg-transparent pl-3 italic outline-none placeholder:text-muted-foreground/60"
							></textarea>
						{:else if block.type === 'code'}
							<textarea
								bind:value={block.text}
								use:autoresize
								rows={3}
								placeholder="Tulis kode..."
								class="w-full resize-none rounded bg-muted/50 p-2 font-mono text-sm outline-none"
							></textarea>
						{:else if block.type === 'list'}
							<div class="space-y-1">
								{#each block.items as _, itemIndex (itemIndex)}
									<div class="flex items-center gap-2">
										<span class="w-5 text-right text-sm text-muted-foreground">
											{block.ordered ? `${itemIndex + 1}.` : '•'}
										</span>
										<input
											bind:value={block.items[itemIndex]}
											placeholder="Item daftar..."
											class="w-full border-none bg-transparent outline-none placeholder:text-muted-foreground/60"
										/>
									</div>
								{/each}
								<button
									type="button"
									class="ml-7 text-xs text-primary hover:underline"
									onclick={() => (block.items = [...block.items, ''])}
								>
									+ Tambah item
								</button>
							</div>
						{:else if block.type === 'divider'}
							<hr class="border-border" />
						{:else if isOverlayType}
							<!-- Rendered through the real markdown pipeline, so the canvas shows
							     what the published page will show. Double-click to edit. -->
							{@const html = blockPreviewHtml(block)}
							{#if html}
								<div class="markdown-preview cursor-pointer">{@html html}</div>
							{:else}
								<button
									type="button"
									class="flex w-full flex-col items-center gap-1.5 rounded-md border-2 border-dashed border-border py-6 text-muted-foreground hover:border-primary hover:text-primary"
									onclick={() => openOverlay(block.id)}
								>
									<Icon class="size-6" />
									<span class="text-xs">Atur {BLOCK_TYPE_LABELS[block.type]}</span>
								</button>
							{/if}
						{/if}
					</div>
				{/each}

				<div class="pt-2">
					<Button type="button" variant="outline" onclick={() => openInserter(null)}>
						<Plus /> Tambah Blok
					</Button>
				</div>
			</div>

			{#if splitPreview}
				<div class="lg:sticky lg:top-4 lg:self-start">
					<p class="mb-1.5 text-xs font-medium text-muted-foreground">Pratinjau langsung</p>
					<div class="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/40 p-2">
						<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
						<div
							class={cn('markdown-preview mx-auto bg-background p-5 transition-[max-width]', previewWidth)}
							onclick={preventPreviewNavigation}
						>
							{@html renderMarkdown(markdown) || '<p class="text-sm">Belum ada konten.</p>'}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Block inserter -->
<Dialog.Root bind:open={inserterOpen}>
	<Dialog.Content class="max-h-[85vh] max-w-2xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Tambah Blok</Dialog.Title>
		</Dialog.Header>

		<div class="relative">
			<Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={inserterQuery} placeholder="Cari blok..." class="pl-8" />
		</div>

		<div class="space-y-4">
			{#if filteredPatterns.length > 0}
				<div class="space-y-2">
					<p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						<LayoutTemplate class="size-3.5" /> Pola siap pakai
					</p>
					<div class="grid gap-2 sm:grid-cols-3">
						{#each filteredPatterns as pattern (pattern.id)}
							<button
								type="button"
								class="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
								onclick={() => choosePattern(pattern.id)}
							>
								<span class="text-sm font-semibold">{pattern.name}</span>
								<span class="mt-1 block text-xs leading-relaxed text-muted-foreground">{pattern.description}</span>
								<span class="mt-2 block text-[11px] font-medium text-primary">{pattern.blockCount} blok</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
			{#if filteredCategories.length > 0}
				{#each filteredCategories as category (category.label)}
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category.label}</p>
						<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
							{#each category.types as type (type)}
								{@const OptionIcon = BLOCK_ICONS[type]}
								<button
									type="button"
									class="flex flex-col items-center gap-1.5 rounded-md border border-border p-3 text-center transition-colors hover:border-primary hover:bg-primary/5"
									onclick={() => chooseBlock(type)}
								>
									<OptionIcon class="size-5 text-muted-foreground" />
									<span class="text-xs font-medium">{BLOCK_TYPE_LABELS[type]}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{:else if filteredPatterns.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">Tidak ada blok yang cocok.</p>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Per-block overlay editor (double-click a block) -->
<Dialog.Root bind:open={overlayOpen}>
	{#if overlayBlock}
		<Dialog.Content class="max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>Edit {BLOCK_TYPE_LABELS[overlayBlock.type]}</Dialog.Title>
			</Dialog.Header>

			<div class="space-y-4">
				<BlockFields block={overlayBlock} {onPickImage} {forms} />
			</div>

			<div class="flex justify-end gap-2 border-t border-border pt-3">
				<Button type="button" variant="outline" onclick={() => (overlayOpen = false)}>Tutup</Button>
			</div>
		</Dialog.Content>
	{/if}
</Dialog.Root>

<MediaPicker {siteId} bind:open={pickerOpen} onSelect={onImageSelected} />

<style>
	.markdown-preview {
		container-type: inline-size;
	}

	.markdown-preview :global(h1),
	.markdown-preview :global(h2),
	.markdown-preview :global(h3) {
		font-weight: 600;
		margin-top: 0.75em;
		margin-bottom: 0.35em;
		line-height: 1.25;
	}
	.markdown-preview :global(h1) {
		font-size: 1.75em;
	}
	.markdown-preview :global(h2) {
		font-size: 1.4em;
	}
	.markdown-preview :global(h3) {
		font-size: 1.15em;
	}
	.markdown-preview :global(p) {
		margin-bottom: 0.6em;
		line-height: 1.65;
	}
	.markdown-preview :global(ul),
	.markdown-preview :global(ol) {
		margin-bottom: 0.6em;
		padding-left: 1.4em;
	}
	.markdown-preview :global(ul) {
		list-style: disc;
	}
	.markdown-preview :global(ol) {
		list-style: decimal;
	}
	.markdown-preview :global(a) {
		color: var(--primary);
		text-decoration: underline;
	}
	.markdown-preview :global(code) {
		background: var(--muted);
		border-radius: 0.25rem;
		padding: 0.1em 0.35em;
		font-size: 0.85em;
	}
	.markdown-preview :global(pre) {
		background: var(--muted);
		border-radius: 0.375rem;
		padding: 0.75rem;
		overflow-x: auto;
		margin-bottom: 0.6em;
	}
	.markdown-preview :global(blockquote) {
		border-left: 3px solid var(--border);
		padding-left: 0.75em;
		color: var(--muted-foreground);
		font-style: italic;
		margin-bottom: 0.6em;
	}
	.markdown-preview :global(img) {
		max-width: 100%;
		border-radius: 0.375rem;
	}
	.markdown-preview :global(hr) {
		border-color: var(--border);
		margin: 1em 0;
	}

	/* Tables — both authored table blocks and the calendar widget. */
	.markdown-preview :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 0.75em;
		font-size: 0.9em;
	}
	.markdown-preview :global(th),
	.markdown-preview :global(td) {
		border: 1px solid var(--border);
		padding: 0.4em 0.6em;
		text-align: left;
	}
	.markdown-preview :global(th) {
		background: var(--muted);
		font-weight: 600;
	}
	.markdown-preview :global(caption) {
		caption-side: top;
		font-weight: 600;
		padding-bottom: 0.4em;
		text-align: left;
	}
	.markdown-preview :global(.cms-calendar td) {
		text-align: center;
	}

	.markdown-preview :global(.cms-button) {
		display: inline-block;
		background: var(--primary);
		color: var(--primary-foreground);
		padding: 0.5em 1.1em;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 500;
	}

	.markdown-preview :global(.cms-columns) {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		margin-bottom: 0.75em;
	}

	.markdown-preview :global(.cms-embed) {
		position: relative;
		padding-bottom: 56.25%;
		height: 0;
		margin-bottom: 0.75em;
	}
	.markdown-preview :global(.cms-embed iframe) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		border-radius: 0.375rem;
	}

	/* Placeholder only — the published site expands this into a real <form>
	   at build time (backend EtaSiteRenderer), using the form's live field
	   config, which this editor doesn't have. */
	.markdown-preview :global(.cms-form) {
		border: 2px dashed var(--border);
		border-radius: 0.5rem;
		padding: 1.25rem;
		text-align: center;
		color: var(--muted-foreground);
		font-size: 0.875rem;
		font-weight: 500;
	}

	/* Page Builder plugin preview. The published equivalent ships from the plugin asset. */
	.markdown-preview :global(.cms-pb-hero),
	.markdown-preview :global(.cms-pb-callout),
	.markdown-preview :global(.cms-pb-card-grid),
	.markdown-preview :global(.cms-pb-gallery),
	.markdown-preview :global(.cms-pb-faq),
	.markdown-preview :global(.cms-pb-stats) {
		margin: 1rem 0;
		border-radius: 0.75rem;
	}
	.markdown-preview :global(.cms-pb-hero) {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(180px, 0.8fr);
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
	}
	.markdown-preview :global(.cms-pb-hero__eyebrow) {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.markdown-preview :global(.cms-pb-hero.cms-pb-hero--no-media) {
		grid-template-columns: 1fr;
		min-height: 18rem;
	}
	.markdown-preview :global(.cms-pb-hero__title) {
		font-size: clamp(1.75rem, 4vw, 2.75rem);
		margin-top: 0;
	}
	.markdown-preview :global(.cms-pb-hero__media img) {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}
	.markdown-preview :global(.cms-pb-callout) {
		padding: 1.5rem;
	}
	.markdown-preview :global(.cms-pb-align-center) {
		text-align: center;
	}
	.markdown-preview :global(.cms-pb-tone-default) {
		border: 1px solid var(--border);
		background: var(--background);
	}
	.markdown-preview :global(.cms-pb-tone-primary) {
		background: var(--primary);
		color: var(--primary-foreground);
	}
	.markdown-preview :global(.cms-pb-tone-dark) {
		background: #0f172a;
		color: #f8fafc;
	}
	.markdown-preview :global(.cms-pb-tone-soft) {
		background: var(--muted);
	}
	.markdown-preview :global(.cms-pb-tone-info) {
		background: #e0f2fe;
		color: #075985;
	}
	.markdown-preview :global(.cms-pb-tone-success) {
		background: #dcfce7;
		color: #166534;
	}
	.markdown-preview :global(.cms-pb-tone-warning) {
		background: #fef3c7;
		color: #92400e;
	}
	.markdown-preview :global(.cms-pb-card-grid),
	.markdown-preview :global(.cms-pb-gallery) {
		display: grid;
		grid-template-columns: repeat(var(--cms-pb-columns, 3), minmax(0, 1fr));
		gap: 1rem;
		padding: 1.25rem;
	}
	.markdown-preview :global(.cms-pb-cols-2) {
		--cms-pb-columns: 2;
	}
	.markdown-preview :global(.cms-pb-cols-3) {
		--cms-pb-columns: 3;
	}
	.markdown-preview :global(.cms-pb-cols-4) {
		--cms-pb-columns: 4;
	}
	.markdown-preview :global(.cms-pb-card-grid__title),
	.markdown-preview :global(.cms-pb-card-grid__text),
	.markdown-preview :global(.cms-pb-gallery__title) {
		grid-column: 1 / -1;
	}
	.markdown-preview :global(.cms-pb-card) {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 0.625rem;
		background: var(--background);
		color: var(--foreground);
	}
	.markdown-preview :global(.cms-pb-card__media img),
	.markdown-preview :global(.cms-pb-gallery__image) {
		width: 100%;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		border-radius: 0;
	}
	.markdown-preview :global(.cms-pb-card__body) {
		padding: 1rem;
	}
	.markdown-preview :global(.cms-pb-gallery__item) {
		overflow: hidden;
		border-radius: 0.5rem;
		background: var(--muted);
	}
	.markdown-preview :global(.cms-pb-gallery__caption) {
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
	}
	.markdown-preview :global(.cms-pb-stat) {
		padding: 1rem;
		text-align: center;
		background: var(--background);
		color: var(--foreground);
	}
	.markdown-preview :global(.cms-pb-stats) {
		padding: 1.25rem;
	}
	.markdown-preview :global(.cms-pb-stats__list) {
		display: grid;
		grid-template-columns: repeat(var(--cms-pb-columns, 3), minmax(0, 1fr));
		gap: 1px;
		margin: 0;
	}
	.markdown-preview :global(.cms-pb-stat__value) {
		font-size: 1.75rem;
		font-weight: 800;
	}
	.markdown-preview :global(.cms-pb-faq) {
		padding: 1.25rem;
	}
	.markdown-preview :global(.cms-pb-faq__item) {
		border-bottom: 1px solid var(--border);
		padding: 0.8rem 0;
	}
	.markdown-preview :global(.cms-pb-faq__question) {
		cursor: pointer;
		font-weight: 650;
	}
	.markdown-preview :global(.cms-pb-faq__answer) {
		padding-top: 0.6rem;
		color: var(--muted-foreground);
	}
	.markdown-preview :global(.cms-pb-spacer.cms-pb-space-sm) { height: 1rem; }
	.markdown-preview :global(.cms-pb-spacer.cms-pb-space-md) { height: 2.5rem; }
	.markdown-preview :global(.cms-pb-spacer.cms-pb-space-lg) { height: 5rem; }

	/* Keep editor device frames in lockstep with the plugin's public CSS. */
	@container (max-width: 60rem) {
		.markdown-preview :global(.cms-pb-hero) {
			grid-template-columns: 1fr;
		}
		.markdown-preview :global(.cms-pb-hero__media) {
			max-height: 24rem;
			order: -1;
		}
		.markdown-preview :global(.cms-pb-cols-4) { --cms-pb-columns: 2; }
	}

	@container (max-width: 42rem) {
		.markdown-preview :global(.cms-pb-hero) { min-height: 0; }
		.markdown-preview :global(.cms-pb-hero__content) { padding: 1.5rem; }
		.markdown-preview :global(.cms-pb-card-grid),
		.markdown-preview :global(.cms-pb-gallery) {
			--cms-pb-columns: 1;
		}
		.markdown-preview :global(.cms-pb-stats) { --cms-pb-columns: 2; }
		.markdown-preview :global(.cms-pb-spacer.cms-pb-space-lg) { height: 3rem; }
	}

	@container (max-width: 28rem) {
		.markdown-preview :global(.cms-pb-stats) { --cms-pb-columns: 1; }
	}
</style>

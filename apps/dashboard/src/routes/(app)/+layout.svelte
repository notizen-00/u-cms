<script lang="ts">
	import type { Snippet } from 'svelte';
	import Header from '$lib/components/app/Header.svelte';
	import Sidebar from '$lib/components/app/Sidebar.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let sidebarOpen = $state(false);

	const activeSite = $derived(
		data.sites.find((site) => site.id === data.activeSiteId) ?? null
	);

	function openSidebar() {
		sidebarOpen = true;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<div class="flex min-h-screen w-full overflow-hidden bg-[#f8f7ff]">
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
			aria-label="Tutup navigasi"
			onclick={closeSidebar}
		></button>
	{/if}

	<Sidebar
		user={data.user}
		{activeSite}
		mobileOpen={sidebarOpen}
		onClose={closeSidebar}
	/>

	<div class="flex min-w-0 flex-1 flex-col">
		<Header
			user={data.user}
			sites={data.sites}
			{activeSite}
			activeTheme={data.activeTheme}
			homepagePageId={data.homepagePageId}
			onMenuToggle={openSidebar}
		/>

		<main
			class="min-h-0 flex-1 overflow-y-auto bg-[#f8f7ff] px-4 py-5 sm:px-6 sm:py-6 xl:px-8"
		>
			<div class="mx-auto w-full max-w-375">
				{@render children()}
			</div>
		</main>
	</div>
</div>
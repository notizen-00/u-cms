<script lang="ts">
	/**
	 * Chrome-free shell for the full-screen Builder (docs/theme_aware_prd.md
	 * §10, §24). Deliberately its own route group rather than a conditional
	 * inside `(app)/+layout.svelte`: `hooks.server.ts` already enforces auth
	 * for every route unconditionally, and the only reason `(app)/+layout.
	 * server.ts` exists is to feed Header/Sidebar/SiteSwitcher — none of which
	 * render here, so this group intentionally has no `+layout.server.ts` of
	 * its own. The Builder route fetches everything it needs itself.
	 */
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="h-screen w-screen overflow-hidden bg-white">
	{@render children()}
</div>

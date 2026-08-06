<script lang="ts">
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import type { ContentStatus } from '$lib/types';

	let { status }: { status: ContentStatus } = $props();

	const config: Record<ContentStatus, { label: string; variant: BadgeVariant }> = {
		draft: { label: 'Draft', variant: 'secondary' },
		in_review: { label: 'Ditinjau', variant: 'warning' },
		approved: { label: 'Disetujui', variant: 'outline' },
		scheduled: { label: 'Terjadwal', variant: 'warning' },
		published: { label: 'Terbit', variant: 'success' },
		archived: { label: 'Diarsipkan', variant: 'secondary' },
		trashed: { label: 'Sampah', variant: 'destructive' }
	};
</script>

<Badge variant={config[status].variant}>{config[status].label}</Badge>

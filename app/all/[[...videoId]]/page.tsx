import { FeedPageClient } from '@/app/components/FeedPageClient';
import { Navigation } from '@/app/components/Navigation';
import { getInitialVideos } from '@/app/lib/feed.server';

export default async function AllPage({ params }: { params: { videoId?: string[] } }) {
  const initialVideoId = params.videoId?.[0] ?? null;
  const initial = await getInitialVideos({
    type: 'all',
    limit: initialVideoId ? 200 : 5,
  });

  return (
    <main className="relative min-h-screen bg-black">
      <Navigation currentType="all" />
      <FeedPageClient
        type="all"
        basePath="/all"
        initialVideoId={initialVideoId}
        initial={initial}
      />
    </main>
  );
}

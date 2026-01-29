import { FeedPageClient } from '@/app/components/FeedPageClient';
import { ImportingScreen } from '@/app/components/ImportingScreen';
import { Navigation } from '@/app/components/Navigation';
import { getImportStatus, getInitialVideos } from '@/app/lib/feed.server';

export default async function LikedPage({ params }: { params: { videoId?: string[] } }) {
  const importing = await getImportStatus();
  if (importing) {
    return <ImportingScreen />;
  }

  const { videoId } = await params;
  const initialVideoId = videoId?.[0] ?? null;
  const initial = await getInitialVideos({
    type: 'liked',
    limit: initialVideoId ? 200 : 5,
  });

  return (
    <main className="relative min-h-screen bg-black">
      <Navigation currentType="liked" />
      <FeedPageClient
        type="liked"
        basePath="/liked"
        initialVideoId={initialVideoId}
        initial={initial}
      />
    </main>
  );
}

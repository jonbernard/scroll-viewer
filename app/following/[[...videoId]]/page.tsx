import { FeedPageClient } from '@/app/components/FeedPageClient';
import { Navigation } from '@/app/components/Navigation';
import { getAuthorSummaryById, getFollowingAuthors, getInitialVideos } from '@/app/lib/feed.server';

export default async function FollowingPage({
  params,
  searchParams,
}: {
  params: { videoId?: string[] };
  searchParams?: { authorId?: string };
}) {
  const initialVideoId = params.videoId?.[0] ?? null;
  const authorId = searchParams?.authorId ?? null;

  const [initial, followingAuthors, selectedAuthor] = await Promise.all([
    getInitialVideos({
      type: 'following',
      authorId,
      limit: initialVideoId ? 200 : 5,
    }),
    getFollowingAuthors(),
    authorId ? getAuthorSummaryById(authorId) : Promise.resolve(null),
  ]);

  return (
    <main className="relative min-h-screen bg-black">
      <Navigation
        currentType="following"
        followingAuthors={followingAuthors}
        selectedAuthor={selectedAuthor}
      />
      <FeedPageClient
        type="following"
        authorId={authorId}
        basePath="/following"
        initialVideoId={initialVideoId}
        initial={initial}
      />
    </main>
  );
}

'use client';

import type { FeedType, VideosResponse } from '@/app/lib/types';

import { VideoFeed } from '@/app/components/VideoFeed';
import { useVideoFeed } from '@/app/hooks/useVideoFeed';

export function FeedPageClient({
  type,
  authorId,
  basePath,
  initialVideoId,
  initial,
}: {
  type: FeedType;
  authorId?: string | null;
  basePath: string;
  initialVideoId?: string | null;
  initial: VideosResponse;
}) {
  const { videos, isLoading, isLoadingMore, hasMore, loadMore } = useVideoFeed({
    type,
    authorId,
    limit: 5,
    initial,
  });

  return (
    <VideoFeed
      videos={videos}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      basePath={basePath}
      initialVideoId={initialVideoId ?? undefined}
      pageSize={5}
    />
  );
}

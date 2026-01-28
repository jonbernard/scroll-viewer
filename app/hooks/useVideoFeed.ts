'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { FeedType, Video, VideosResponse } from '@/app/lib/types';

interface UseVideoFeedOptions {
  type: FeedType;
  authorId?: string | null;
  limit?: number;
  initial?: VideosResponse;
}

export function useVideoFeed({ type, authorId, limit = 20, initial }: UseVideoFeedOptions) {
  const key = `${type}:${authorId ?? ''}:${limit}`;
  const lastInitialKeyRef = useRef<string | null>(null);

  const [videos, setVideos] = useState<Video[]>(initial?.videos ?? []);
  const [isLoading, setIsLoading] = useState(!initial);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initial ? initial.nextCursor !== null : true);
  const cursorRef = useRef<string | null>(initial?.nextCursor ?? null);

  const fetchVideos = useCallback(
    async (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set('type', type);
      params.set('limit', limit.toString());
      if (authorId) params.set('authorId', authorId);
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`/api/videos?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      return response.json() as Promise<VideosResponse>;
    },
    [type, authorId, limit],
  );

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    cursorRef.current = null;

    try {
      const data = await fetchVideos();
      setVideos(data.videos);
      cursorRef.current = data.nextCursor;
      setHasMore(data.nextCursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, [fetchVideos]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const data = await fetchVideos(cursorRef.current);
      setVideos((prev) => [...prev, ...data.videos]);
      cursorRef.current = data.nextCursor;
      setHasMore(data.nextCursor !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more videos');
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchVideos, hasMore, isLoadingMore]);

  // Reset and reload when type or authorId changes
  useEffect(() => {
    if (initial && lastInitialKeyRef.current !== key) {
      lastInitialKeyRef.current = key;
      setVideos(initial.videos);
      cursorRef.current = initial.nextCursor;
      setHasMore(initial.nextCursor !== null);
      setIsLoading(false);
      setError(null);
      return;
    }

    loadInitial();
  }, [initial, key, loadInitial]);

  return {
    videos,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh: loadInitial,
  };
}

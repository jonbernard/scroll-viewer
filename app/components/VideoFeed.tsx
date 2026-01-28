'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Video } from '@/app/lib/types';

import { VideoPlayer } from '@/app/components/VideoPlayer';
import { useInfiniteScroll } from '@/app/hooks/useIntersectionObserver';
import { debugLog } from '@/app/lib/debug';

interface VideoFeedProps {
  videos: Video[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function VideoFeed({
  videos,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: VideoFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityRef = useRef<Record<number, number>>({});
  const loadMoreRef = useInfiniteScroll(onLoadMore, hasMore, isLoadingMore);

  useEffect(() => {
    debugLog('feed', 'videos length', { length: videos.length });
  }, [videos.length]);

  useEffect(() => {
    debugLog('feed', 'activeIndex changed', {
      activeIndex,
      activeVideoId: videos[activeIndex]?.id,
    });
  }, [activeIndex, videos]);

  const setItemRef = useCallback((index: number) => {
    return (el: HTMLDivElement | null) => {
      const prev = itemRefs.current[index];
      if (prev && observerRef.current) {
        observerRef.current.unobserve(prev);
      }

      itemRefs.current[index] = el;

      if (el && observerRef.current) {
        observerRef.current.observe(el);
      }
    };
  }, []);

  // Disconnect observer on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  // Robust active-video tracking (prevents multiple videos playing)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const listLength = videos.length;
    debugLog('feed', 'observer sync', { length: listLength });
    if (listLength === 0) return;

    // Reset visibility map when list size changes (filters / initial load / load more)
    visibilityRef.current = {};

    if (!observerRef.current) {
      debugLog('feed', 'IntersectionObserver init', {
        hasContainer: true,
        threshold: [0, 0.25, 0.5, 0.75, 0.9, 1],
      });

      const thresholds = [0, 0.25, 0.5, 0.75, 0.9, 1];

      observerRef.current = new IntersectionObserver(
        (entries) => {
          // Update per-item visibility; IntersectionObserver only reports deltas.
          for (const entry of entries) {
            const target = entry.target as HTMLDivElement;
            const idx = Number(target.dataset.index);
            if (!Number.isFinite(idx)) continue;
            visibilityRef.current[idx] = entry.isIntersecting ? entry.intersectionRatio : 0;
          }

          let bestIndex: number | null = null;
          let bestRatio = 0;

          for (const [idxStr, ratio] of Object.entries(visibilityRef.current)) {
            const idx = Number(idxStr);
            if (!Number.isFinite(idx)) continue;
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestIndex = idx;
            }
          }

          debugLog('feed', 'IO tick', {
            entries: entries.map((e) => ({
              idx: Number((e.target as HTMLDivElement).dataset.index),
              is: e.isIntersecting,
              ratio: e.intersectionRatio,
            })),
            bestIndex,
            bestRatio,
          });

          // Only switch once a page is clearly dominant (avoids flicker)
          if (bestIndex != null && bestRatio >= 0.6) {
            setActiveIndex(bestIndex);
          }
        },
        { root: container, threshold: thresholds },
      );
    }

    // Observe any mounted items (covers "initially empty then load" and pagination)
    for (const el of itemRefs.current) {
      if (el) observerRef.current.observe(el);
    }
  }, [videos.length]);

  // Clamp active index when the list changes (e.g. filter changed)
  useEffect(() => {
    if (videos.length === 0) return;
    if (activeIndex > videos.length - 1) {
      setActiveIndex(videos.length - 1);
    }
  }, [activeIndex, videos.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = Math.min(activeIndex + 1, videos.length - 1);
        const target = itemRefs.current[nextIndex];
        debugLog('feed', 'keydown next', {
          key: e.key,
          activeIndex,
          nextIndex,
        });
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = Math.max(activeIndex - 1, 0);
        const target = itemRefs.current[prevIndex];
        debugLog('feed', 'keydown prev', {
          key: e.key,
          activeIndex,
          prevIndex,
        });
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (e.key === 'm') {
        debugLog('feed', 'keydown mute toggle', { key: e.key });
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, videos.length]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-white">
        <svg
          className="mb-4 h-16 w-16 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium">No videos found</p>
        <p className="mt-1 text-sm text-gray-400">Try changing the filter or import some videos</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen snap-y snap-mandatory overflow-y-scroll bg-black hide-scrollbar overscroll-y-contain"
      style={{ scrollSnapType: 'y mandatory' }}>
      {videos.map((video, index) => (
        <div
          key={video.id}
          ref={setItemRef(index)}
          data-index={index}
          className="h-screen w-full snap-start snap-always">
          <VideoPlayer
            video={video}
            isActive={index === activeIndex}
            isFirst={index === 0}
            isMuted={isMuted}
            onMuteToggle={handleMuteToggle}
          />
        </div>
      ))}

      {/* Load more trigger */}
      <div
        ref={loadMoreRef}
        className="flex h-20 items-center justify-center">
        {isLoadingMore && (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
      </div>
    </div>
  );
}

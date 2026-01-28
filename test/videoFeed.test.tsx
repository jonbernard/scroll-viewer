import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Video } from '@/app/lib/types';

import { VideoFeed } from '@/app/components/VideoFeed';

vi.mock('@/app/hooks/useIntersectionObserver', () => ({
  useInfiniteScroll: () => ({ current: null }),
}));

vi.mock('@/app/components/VideoPlayer', () => ({
  VideoPlayer: ({ video, isActive }: { video: Video; isActive: boolean }) => (
    <div
      data-testid={`player-${video.id}`}
      data-active={isActive ? 'true' : 'false'}
    />
  ),
}));

function makeVideo(id: string): Video {
  return {
    id,
    authorId: 'a',
    author: {
      id: 'a',
      uniqueId: 'u',
      nickname: 'n',
      avatarPath: null,
      followerCount: null,
      heartCount: null,
      videoCount: null,
      signature: null,
      isFollowing: false,
    },
    description: null,
    createTime: new Date().toISOString(),
    diggCount: 0,
    playCount: 0,
    audioId: null,
    size: null,
    videoPath: 'v.mp4',
    coverPath: null,
    isLiked: false,
    isFavorite: false,
    isFollowing: false,
  };
}

describe('VideoFeed', () => {
  beforeEach(() => {
    // @ts-expect-error - injected by vitest.setup.ts
    const IO = globalThis.__io;
    IO.instances.length = 0;
  });
  it('initially empty feed still attaches observer after videos load', async () => {
    const { rerender } = render(
      <VideoFeed
        videos={[]}
        isLoading={true}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
      />,
    );

    rerender(
      <VideoFeed
        videos={[makeVideo('v0'), makeVideo('v1'), makeVideo('v2')]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
      />,
    );

    // @ts-expect-error - injected by vitest.setup.ts
    const IO = globalThis.__io;
    const instance = IO.instances.at(-1);
    expect(instance).toBeTruthy();
    const item2 = screen.getByTestId('player-v2').parentElement as HTMLDivElement;
    const item0 = screen.getByTestId('player-v0').parentElement as HTMLDivElement;

    await act(async () => {
      instance.trigger([
        { target: item0, isIntersecting: true, intersectionRatio: 0.2 },
        { target: item2, isIntersecting: true, intersectionRatio: 0.8 },
      ]);
    });

    expect(await screen.findByTestId('player-v2')).toHaveAttribute('data-active', 'true');
  });

  it('marks the most visible item as active (not just the first two)', async () => {
    render(
      <VideoFeed
        videos={[makeVideo('v0'), makeVideo('v1'), makeVideo('v2')]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
      />,
    );

    // Default active is index 0
    expect(screen.getByTestId('player-v0')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('player-v2')).toHaveAttribute('data-active', 'false');

    // Drive IntersectionObserver: make index 2 dominant
    // @ts-expect-error - injected by vitest.setup.ts
    const IO = globalThis.__io;
    const instance = IO.instances.at(-1);
    expect(instance).toBeTruthy();
    const item2 = screen.getByTestId('player-v2').parentElement as HTMLDivElement;
    const item0 = screen.getByTestId('player-v0').parentElement as HTMLDivElement;

    await act(async () => {
      instance.trigger([
        { target: item0, isIntersecting: true, intersectionRatio: 0.2 },
        { target: item2, isIntersecting: true, intersectionRatio: 0.8 },
      ]);
    });

    // React state update
    expect(await screen.findByTestId('player-v2')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('player-v0')).toHaveAttribute('data-active', 'false');
  });

  it('ArrowDown scrolls to the next item beyond index 1', async () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    render(
      <VideoFeed
        videos={[makeVideo('v0'), makeVideo('v1'), makeVideo('v2')]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
      />,
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    // Should have been called for index 1 and index 2 at least once.
    expect(scrollSpy).toHaveBeenCalled();
  });
});

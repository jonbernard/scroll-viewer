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
        basePath="/test"
      />,
    );

    rerender(
      <VideoFeed
        videos={[makeVideo('v0'), makeVideo('v1'), makeVideo('v2')]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
        basePath="/test"
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
        basePath="/test"
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
        basePath="/test"
      />,
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    // Should have been called for index 1 and index 2 at least once.
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('prefetches the next page when reaching the 4th item (index 3) of a 5-pack', async () => {
    const onLoadMore = vi.fn();

    render(
      <VideoFeed
        videos={[
          makeVideo('v0'),
          makeVideo('v1'),
          makeVideo('v2'),
          makeVideo('v3'),
          makeVideo('v4'),
        ]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={true}
        onLoadMore={onLoadMore}
        basePath="/test"
        pageSize={5}
      />,
    );

    // @ts-expect-error - injected by vitest.setup.ts
    const IO = globalThis.__io;
    const instance = IO.instances.at(-1);
    expect(instance).toBeTruthy();

    const item3 = screen.getByTestId('player-v3').parentElement as HTMLDivElement;

    await act(async () => {
      instance.trigger([{ target: item3, isIntersecting: true, intersectionRatio: 0.8 }]);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not prefetch twice for the same page chunk', async () => {
    const onLoadMore = vi.fn();

    render(
      <VideoFeed
        videos={[
          makeVideo('v0'),
          makeVideo('v1'),
          makeVideo('v2'),
          makeVideo('v3'),
          makeVideo('v4'),
        ]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={true}
        onLoadMore={onLoadMore}
        basePath="/test"
        pageSize={5}
      />,
    );

    // @ts-expect-error - injected by vitest.setup.ts
    const IO = globalThis.__io;
    const instance = IO.instances.at(-1);
    expect(instance).toBeTruthy();

    const item3 = screen.getByTestId('player-v3').parentElement as HTMLDivElement;

    await act(async () => {
      instance.trigger([{ target: item3, isIntersecting: true, intersectionRatio: 0.8 }]);
      instance.trigger([{ target: item3, isIntersecting: true, intersectionRatio: 0.9 }]);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('keeps the URL synced to the active video id without navigation', async () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    // Start on a base route with query params, like the real app.
    window.history.replaceState(null, '', '/test?authorId=a');

    render(
      <VideoFeed
        videos={[makeVideo('v0'), makeVideo('v1'), makeVideo('v2')]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
        basePath="/test"
        pageSize={5}
      />,
    );

    expect(replaceSpy).toHaveBeenCalled();
    const lastCall = replaceSpy.mock.calls.at(-1);
    expect(lastCall?.[2]).toBe('/test/v0?authorId=a');

    // Drive IO to make v2 dominant.
    // @ts-expect-error - injected by vitest.setup.ts
    const IO = globalThis.__io;
    const instance = IO.instances.at(-1);
    expect(instance).toBeTruthy();
    const item2 = screen.getByTestId('player-v2').parentElement as HTMLDivElement;

    await act(async () => {
      instance.trigger([{ target: item2, isIntersecting: true, intersectionRatio: 0.8 }]);
    });

    const lastCall2 = replaceSpy.mock.calls.at(-1);
    expect(lastCall2?.[2]).toBe('/test/v2?authorId=a');
  });

  it('deep-links by scrolling to the requested initialVideoId when present', async () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    render(
      <VideoFeed
        videos={[makeVideo('v0'), makeVideo('v1'), makeVideo('v2')]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
        basePath="/test"
        initialVideoId="v2"
        pageSize={5}
      />,
    );

    expect(await screen.findByTestId('player-v2')).toHaveAttribute('data-active', 'true');
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('shows a "No more videos" message when exhausted', () => {
    render(
      <VideoFeed
        videos={[makeVideo('v0')]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        onLoadMore={() => undefined}
        basePath="/test"
        pageSize={5}
      />,
    );

    expect(screen.getByText('No more videos')).toBeInTheDocument();
  });
});

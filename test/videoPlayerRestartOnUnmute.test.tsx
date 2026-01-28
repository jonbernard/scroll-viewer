import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Video } from '@/app/lib/types';

import { VideoPlayer } from '@/app/components/VideoPlayer';

function makeVideo(id = 'v'): Video {
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

describe('VideoPlayer restart-on-first-unmute', () => {
  it('restarts only once per page load (not again after feed/tab switches)', async () => {
    // Clear global flag to simulate fresh page load.
    type WindowWithFirstUnmuteRestart = Window & {
      __svRestartedFirstUnmute?: boolean;
    };
    delete (window as unknown as WindowWithFirstUnmuteRestart).__svRestartedFirstUnmute;

    const playMock = vi.fn().mockResolvedValue(undefined);

    const { container, unmount } = render(
      <VideoPlayer
        video={makeVideo('v0')}
        isActive={true}
        isFirst={true}
        isMuted={true}
        onMuteToggle={() => undefined}
      />,
    );

    const videoEl = container.querySelector('video') as HTMLVideoElement;
    expect(videoEl).toBeTruthy();
    Object.defineProperty(videoEl, 'play', {
      configurable: true,
      value: playMock,
    });
    videoEl.currentTime = 5;

    const unmuteButton = container.querySelector(
      'button[aria-label="Unmute"]',
    ) as HTMLButtonElement;
    expect(unmuteButton).toBeTruthy();

    await act(async () => {
      unmuteButton.click();
      await Promise.resolve();
    });
    expect(videoEl.currentTime).toBe(0);

    // Simulate switching feeds: component unmounts and remounts with a new first item.
    unmount();

    const next = render(
      <VideoPlayer
        video={makeVideo('vNew')}
        isActive={true}
        isFirst={true}
        isMuted={true}
        onMuteToggle={() => undefined}
      />,
    );

    const videoEl2 = next.container.querySelector('video') as HTMLVideoElement;
    expect(videoEl2).toBeTruthy();
    Object.defineProperty(videoEl2, 'play', {
      configurable: true,
      value: playMock,
    });
    videoEl2.currentTime = 7;

    const unmuteButton2 = next.container.querySelector(
      'button[aria-label="Unmute"]',
    ) as HTMLButtonElement;
    expect(unmuteButton2).toBeTruthy();

    await act(async () => {
      unmuteButton2.click();
      await Promise.resolve();
    });

    // Should NOT restart again on the same page load.
    expect(videoEl2.currentTime).toBe(7);
  });
});

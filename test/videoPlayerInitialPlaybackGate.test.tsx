import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Video } from "@/app/lib/types";

import { VideoPlayer } from "@/app/components/VideoPlayer";

function makeVideo(id = "v"): Video {
  return {
    id,
    authorId: "a",
    author: {
      id: "a",
      uniqueId: "u",
      nickname: "n",
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
    videoPath: "v.mp4",
    coverPath: null,
    isLiked: false,
    isFavorite: false,
    isFollowing: false,
  };
}

describe("VideoPlayer initial playback gate", () => {
  beforeEach(() => {
    type WindowWithPlaybackStarted = Window & { __svPlaybackStarted?: boolean };
    delete (window as unknown as WindowWithPlaybackStarted).__svPlaybackStarted;
  });

  it("does not autoplay the first video before user interaction", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");

    render(
      <VideoPlayer
        video={makeVideo("v0")}
        isActive={true}
        isFirst={true}
        isMuted={false}
        onMuteToggle={() => undefined}
      />,
    );

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("starts playback on user click and unlocks autoplay for subsequent videos", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play");

    const { rerender } = render(
      <VideoPlayer
        video={makeVideo("v0")}
        isActive={true}
        isFirst={true}
        isMuted={false}
        onMuteToggle={() => undefined}
      />,
    );

    expect(playSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Play video" }));
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Next active video should autoplay now that the page has a user gesture.
    rerender(
      <VideoPlayer
        video={makeVideo("v1")}
        isActive={true}
        isFirst={false}
        isMuted={false}
        onMuteToggle={() => undefined}
      />,
    );

    expect(playSpy).toHaveBeenCalledTimes(2);
  });
});

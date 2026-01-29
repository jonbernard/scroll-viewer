'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Video } from '@/app/lib/types';

import { debugLog } from '@/app/lib/debug';
import { getAvatarUrl, getCoverUrl, getVideoUrl } from '@/app/lib/utils';

import { VideoOverlay } from './VideoOverlay';

type WindowWithFirstUnmuteRestart = Window & {
  __svRestartedFirstUnmute?: boolean;
};

type WindowWithPlaybackStarted = Window & {
  __svPlaybackStarted?: boolean;
};

function hasRestartedFirstUnmuteThisPage() {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as WindowWithFirstUnmuteRestart).__svRestartedFirstUnmute);
}

function markRestartedFirstUnmuteThisPage() {
  if (typeof window === 'undefined') return;
  (window as unknown as WindowWithFirstUnmuteRestart).__svRestartedFirstUnmute = true;
}

function hasUserStartedPlaybackThisPage() {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as WindowWithPlaybackStarted).__svPlaybackStarted);
}

function markUserStartedPlaybackThisPage() {
  if (typeof window === 'undefined') return;
  (window as unknown as WindowWithPlaybackStarted).__svPlaybackStarted = true;
}

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  isFirst: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  onHide: () => void;
}

export function VideoPlayer({
  video,
  isActive,
  isFirst,
  isMuted,
  onMuteToggle,
  onHide,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoplayFallbackMuted, setAutoplayFallbackMuted] = useState(false);
  const restartedOnFirstUnmuteRef = useRef(false);

  const videoUrl = getVideoUrl(video.videoPath);
  const coverUrl = getCoverUrl(video.coverPath);
  const avatarUrl = getAvatarUrl(video.author.avatarPath);
  const effectiveMuted = isMuted || autoplayFallbackMuted;
  const effectiveMutedRef = useRef(effectiveMuted);

  useEffect(() => {
    effectiveMutedRef.current = effectiveMuted;
  }, [effectiveMuted]);

  // Play/pause based on active state
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    debugLog('player', 'active effect', {
      videoId: video.id,
      isActive,
      isMuted,
      autoplayFallbackMuted,
      effectiveMuted: effectiveMutedRef.current,
      volume: videoEl.volume,
      muted: videoEl.muted,
    });

    if (isActive) {
      // On initial page load, keep the first video paused until the user explicitly starts playback.
      // This avoids autoplay policies and guarantees sound once the user interacts.
      if (isFirst && !hasUserStartedPlaybackThisPage()) {
        debugLog('player', 'initial playback gated', { videoId: video.id });
        videoEl.pause();
        setShowControls(true);
        return;
      }

      const playResult = videoEl.play();
      // In browsers this is a Promise; in some environments it may be void.
      if (playResult && typeof (playResult as Promise<void>).catch === 'function') {
        (playResult as Promise<void>).catch(async (err) => {
          debugLog('player', 'play() rejected', {
            videoId: video.id,
            name: err instanceof Error ? err.name : undefined,
            message: err instanceof Error ? err.message : String(err),
            volume: videoEl.volume,
            muted: videoEl.muted,
            readyState: videoEl.readyState,
            networkState: videoEl.networkState,
          });

          // If autoplay is blocked while unmuted, fall back to muted autoplay (common browser policy).
          if (!effectiveMutedRef.current) {
            setAutoplayFallbackMuted(true);
            try {
              videoEl.muted = true;
              await videoEl.play();
              debugLog('player', 'fallback muted autoplay ok', {
                videoId: video.id,
              });
            } catch {
              debugLog('player', 'fallback muted autoplay failed', {
                videoId: video.id,
              });
              // ignore
            }
          }
        });
      }
    } else {
      debugLog('player', 'pause inactive', { videoId: video.id });
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  }, [autoplayFallbackMuted, isActive, isFirst, isMuted, video.id]);

  // Handle mute state
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = effectiveMuted;
      if (!effectiveMuted && videoEl.volume === 0) {
        videoEl.volume = 1;
      }
      debugLog('player', 'mute applied', {
        videoId: video.id,
        effectiveMuted,
        volume: videoEl.volume,
      });
    }
  }, [effectiveMuted, video.id]);

  // Update progress
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // If metadata already loaded before this effect ran, sync state immediately.
    if (videoEl.readyState >= 1) {
      setDuration(videoEl.duration);
      setIsLoaded(true);
    }

    const handleTimeUpdate = () => {
      setProgress(videoEl.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(videoEl.duration);
      setIsLoaded(true);
      debugLog('player', 'loadedmetadata', {
        videoId: video.id,
        duration: videoEl.duration,
      });
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      debugLog('player', 'media error event', {
        videoId: video.id,
        errorCode: videoEl.error?.code ?? null,
        readyState: videoEl.readyState,
        networkState: videoEl.networkState,
        currentSrc: videoEl.currentSrc,
      });
    };

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('error', handleError);

    return () => {
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl.removeEventListener('play', handlePlay);
      videoEl.removeEventListener('pause', handlePause);
      videoEl.removeEventListener('error', handleError);
    };
  }, [video.id]);

  const handleVideoToggle = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // A click is a user gesture; if we previously fell back to muted autoplay, clear it.
    if (autoplayFallbackMuted) {
      setAutoplayFallbackMuted(false);
      if (!isMuted) {
        videoEl.muted = false;
      }
    }

    if (videoEl.paused) {
      // A user gesture can start playback with sound.
      markUserStartedPlaybackThisPage();
      videoEl.muted = false;
      if (videoEl.volume === 0) {
        videoEl.volume = 1;
      }
      videoEl.play();
    } else {
      videoEl.pause();
    }

    // Show controls briefly
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  }, [autoplayFallbackMuted, isMuted]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const videoEl = videoRef.current;
      if (!videoEl || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      videoEl.currentTime = percentage * duration;
    },
    [duration],
  );

  const handleProgressKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const videoEl = videoRef.current;
      if (!videoEl || !duration) return;

      const step = duration * 0.05; // 5% of duration
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        videoEl.currentTime = Math.min(videoEl.currentTime + step, duration);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        videoEl.currentTime = Math.max(videoEl.currentTime - step, 0);
      }
    },
    [duration],
  );

  const handleMuteClick = useCallback(() => {
    const videoEl = videoRef.current;
    const nextMuted = !isMuted;

    // Apply immediately on the element (some browsers require this in the gesture handler)
    if (videoEl) {
      if (!nextMuted) {
        setAutoplayFallbackMuted(false);

        // If the first video started muted due to autoplay policy, restart it once per page load when sound is enabled.
        if (isFirst && !restartedOnFirstUnmuteRef.current && !hasRestartedFirstUnmuteThisPage()) {
          restartedOnFirstUnmuteRef.current = true;
          markRestartedFirstUnmuteThisPage();
          videoEl.currentTime = 0;
          debugLog('player', 'restart on first unmute', { videoId: video.id });
        }
      }
      videoEl.muted = nextMuted;

      // If we're unmuting, ensure volume is audible and "re-play" in the same gesture to enable audio.
      if (!nextMuted) {
        if (videoEl.volume === 0) {
          videoEl.volume = 1;
        }
        videoEl.play().catch(() => {
          // Ignore; autoplay/audio policies vary by browser
        });
      }
    }

    onMuteToggle();
  }, [isFirst, isMuted, onMuteToggle, video.id]);

  const handleShare = useCallback(async () => {
    // Prefer native share when available; otherwise copy the direct media URL.
    try {
      const shareUrl = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: 'Video',
          url: shareUrl,
        });
        return;
      }
    } catch {
      // ignore
    }

    try {
      await navigator.clipboard.writeText(videoUrl);
    } catch {
      // ignore
    }
  }, [videoUrl]);

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="h-full w-full bg-black">
      {/* Centered "player frame" so desktop overlays don't spread to screen edges */}
      <div className="relative mx-auto h-full w-full max-w-[520px] lg:max-w-[800px] bg-black">
        {/* Cover image (shows before video loads) */}
        {coverUrl && !isLoaded && !isPlaying && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}

        {/* Video - wrapped in button for accessibility */}
        <button
          type="button"
          className="h-full w-full border-0 bg-transparent p-0"
          onClick={handleVideoToggle}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="h-full w-full object-contain"
            loop
            playsInline
            muted={effectiveMuted}
            poster={coverUrl || undefined}
            preload="metadata"
          />
        </button>

        {/* Right action rail (TikTok-style) */}
        <div className="absolute bottom-24 right-3 z-40 flex flex-col items-center gap-3 safe-area-bottom">
          {/* Profile bubble */}
          <button
            type="button"
            className="group relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-white/80 transition active:scale-95"
            aria-label={`@${video.author.uniqueId}`}
            title={`@${video.author.uniqueId}`}>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={video.author.nickname}
                fill
                sizes="48px"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold text-white">
                {video.author.nickname.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
          </button>

          {/* Hide */}
          <button
            type="button"
            onClick={onHide}
            className="flex flex-col items-center gap-1 text-white active:scale-95"
            aria-label="Hide">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-white/90">Hide</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-white/95 active:scale-95"
            aria-label="Share">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true">
                <path
                  d="M14 9l7 3-7 3V9Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 12H9a4 4 0 0 0-4 4v2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-white/90">Share</span>
          </button>

          {/* Mute */}
          <button
            type="button"
            onClick={handleMuteClick}
            className="flex flex-col items-center gap-1 text-white active:scale-95"
            aria-label={isMuted ? 'Unmute' : 'Mute'}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm">
              {isMuted ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
            </div>
            <span className="text-[11px] font-semibold text-white/90">
              {isMuted ? 'Muted' : 'Sound'}
            </span>
          </button>
        </div>

        {/* Play/Pause indicator */}
        {showControls && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-4">
              {isPlaying ? (
                <svg
                  className="h-12 w-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg
                  className="h-12 w-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div
          className="absolute bottom-[env(safe-area-inset-bottom,0px)] left-0 right-0 h-1.5 cursor-pointer bg-white/20 z-10"
          onClick={handleProgressClick}
          onKeyDown={handleProgressKeyDown}
          role="slider"
          tabIndex={0}
          aria-label="Video progress"
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}>
          <div
            className="h-full bg-[#E54D2E] transition-[width] duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Video overlay */}
        <VideoOverlay video={video} />
      </div>
    </div>
  );
}

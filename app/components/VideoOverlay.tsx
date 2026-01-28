'use client';

import Image from 'next/image';
import { useState } from 'react';

import type { Video } from '@/app/lib/types';

import { formatCount, formatRelativeDate, getAvatarUrl } from '@/app/lib/utils';

interface VideoOverlayProps {
  video: Video;
}

export function VideoOverlay({ video }: VideoOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const avatarUrl = getAvatarUrl(video.author.avatarPath);

  const description = video.description || '';
  const shouldTruncate = description.length > 100;
  const displayDescription =
    shouldTruncate && !isExpanded ? `${description.slice(0, 100)}...` : description;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/85 via-black/35 to-transparent px-4 pt-3 safe-area-bottom">
      <div className="max-w-80 pr-16 pb-4">
        {/* Author */}
        <div className="mb-2 flex items-center gap-2">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={video.author.nickname}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-white/30"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20">
              <span className="text-sm font-bold">
                {video.author.nickname.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-white drop-shadow">
              {video.author.nickname}
            </p>
            <p className="truncate text-xs font-semibold text-white/75 drop-shadow">
              @{video.author.uniqueId} · {formatRelativeDate(new Date(video.createTime))}
            </p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="mb-2.5">
            <p className="text-sm font-medium leading-snug text-white/95 drop-shadow">
              {displayDescription}
              {shouldTruncate && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="ml-1 font-semibold text-white/80 transition hover:text-white">
                  {isExpanded ? 'less' : 'more'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Stats row (subtle) */}
        <div className="flex items-center gap-3 text-xs font-semibold text-white/70 drop-shadow">
          {video.diggCount != null && <span>{formatCount(video.diggCount)} likes</span>}
          {video.playCount != null && <span>{formatCount(video.playCount)} views</span>}
        </div>
      </div>
    </div>
  );
}

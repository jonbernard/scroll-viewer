import type { Author, FeedType, Video, VideosResponse } from '@/app/lib/types';

import { prisma } from '@/app/lib/prisma';

type AuthorSummary = Pick<Author, 'id' | 'uniqueId' | 'nickname' | 'avatarPath' | 'isFollowing'>;

type VideoWithAuthorSummary = Omit<Video, 'author' | 'createTime'> & {
  author: AuthorSummary;
  createTime: string;
};

export async function getFollowingAuthors(): Promise<AuthorSummary[]> {
  const authors = await prisma.author.findMany({
    where: { isFollowing: true },
    orderBy: { uniqueId: 'asc' },
    select: {
      id: true,
      uniqueId: true,
      nickname: true,
      avatarPath: true,
      isFollowing: true,
    },
  });

  return authors;
}

export async function getAuthorSummaryById(id: string): Promise<AuthorSummary | null> {
  const author = await prisma.author.findUnique({
    where: { id },
    select: {
      id: true,
      uniqueId: true,
      nickname: true,
      avatarPath: true,
      isFollowing: true,
    },
  });

  return author;
}

export async function getInitialVideos({
  type,
  authorId,
  limit = 5,
}: {
  type: FeedType;
  authorId?: string | null;
  limit?: number;
}): Promise<VideosResponse> {
  const where: Record<string, unknown> = {};

  switch (type) {
    case 'liked':
      where.isLiked = true;
      break;
    case 'favorite':
      where.isFavorite = true;
      break;
    case 'following':
      where.isFollowing = true;
      break;
    // 'all' has no filter
  }

  if (authorId) {
    where.authorId = authorId;
  }

  const take = Math.min(limit, 50);

  const rows = await prisma.video.findMany({
    where,
    take: take + 1,
    orderBy: { createTime: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          uniqueId: true,
          nickname: true,
          avatarPath: true,
          isFollowing: true,
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (rows.length > take) {
    const nextItem = rows.pop();
    nextCursor = nextItem ? nextItem.id : null;
  }

  const videos: VideoWithAuthorSummary[] = rows.map((v) => ({
    id: v.id,
    authorId: v.authorId,
    author: v.author,
    description: v.description,
    createTime: v.createTime.toISOString(),
    diggCount: v.diggCount,
    playCount: v.playCount,
    audioId: v.audioId,
    size: v.size,
    videoPath: v.videoPath,
    coverPath: v.coverPath,
    isLiked: v.isLiked,
    isFavorite: v.isFavorite,
    isFollowing: v.isFollowing,
  }));

  return { videos, nextCursor };
}

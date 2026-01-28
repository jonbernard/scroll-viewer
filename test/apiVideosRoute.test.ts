import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    video: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import * as videoByIdRoute from '@/app/api/videos/[id]/route';
import * as videosRoute from '@/app/api/videos/route';
import { prisma } from '@/app/lib/prisma';

function makeRow(id: string) {
  return {
    id,
    authorId: 'a',
    author: { id: 'a', uniqueId: 'u', nickname: 'n', avatarPath: null },
    description: null,
    createTime: new Date(),
    diggCount: 1,
    playCount: 2,
    audioId: null,
    size: null,
    videoPath: 'v.mp4',
    coverPath: null,
    isLiked: false,
    isFavorite: false,
    isFollowing: false,
  };
}

describe('api/videos', () => {
  it('maps type=liked to where.isLiked=true and sets nextCursor when over limit', async () => {
    (prisma.video.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      makeRow('v0'),
      makeRow('v1'),
      makeRow('v2'),
      makeRow('v3'),
      makeRow('v4'),
      makeRow('v5'),
    ]);

    const res = await videosRoute.GET({
      nextUrl: new URL('http://localhost/api/videos?type=liked&limit=5'),
    } as never);

    const callArg = (prisma.video.findMany as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(callArg.where).toEqual({ isLiked: true });
    expect(callArg.take).toBe(6);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.videos).toHaveLength(5);
    expect(json.nextCursor).toBe('v5');
  });

  it('includes cursor and authorId in the query when provided', async () => {
    (prisma.video.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    await videosRoute.GET({
      nextUrl: new URL('http://localhost/api/videos?type=all&limit=5&cursor=v9&authorId=a1'),
    } as never);

    const callArg = (prisma.video.findMany as unknown as ReturnType<typeof vi.fn>).mock.calls.at(
      -1,
    )?.[0];
    expect(callArg.cursor).toEqual({ id: 'v9' });
    expect(callArg.where).toEqual({ authorId: 'a1' });
  });
});

describe('api/videos/[id]', () => {
  it('does not include BigInt author fields in include select', async () => {
    (prisma.video.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...makeRow('v0'),
      author: {
        id: 'a',
        uniqueId: 'u',
        nickname: 'n',
        avatarPath: null,
        followerCount: 1,
        videoCount: 2,
        signature: null,
        isFollowing: true,
        _count: { videos: 10 },
      },
    });

    const res = await videoByIdRoute.GET({} as never, { params: Promise.resolve({ id: 'v0' }) });
    expect(res.status).toBe(200);

    const callArg = (prisma.video.findUnique as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    const authorSelect = callArg.include.author.select as Record<string, unknown>;
    expect(authorSelect.heartCount).toBeUndefined();

    const json = await res.json();
    expect(json.author).toMatchObject({ id: 'a', uniqueId: 'u' });
  });

  it('returns 404 when video is missing', async () => {
    (prisma.video.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await videoByIdRoute.GET({} as never, { params: Promise.resolve({ id: 'nope' }) });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Video not found' });
  });
});

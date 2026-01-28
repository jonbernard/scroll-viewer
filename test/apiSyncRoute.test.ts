import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    syncLog: {
      findMany: vi.fn(),
    },
    video: {
      count: vi.fn(),
    },
    author: {
      count: vi.fn(),
    },
  },
}));

import * as syncRoute from '@/app/api/sync/route';
import { prisma } from '@/app/lib/prisma';

describe('api/sync', () => {
  it('returns counts and recent sync logs', async () => {
    (prisma.syncLog.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 1,
        type: 'manual',
        status: 'completed',
        videosAdded: 0,
        videosUpdated: 0,
        authorsAdded: 0,
      },
    ]);

    // Promise.all order in route:
    (prisma.video.count as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(10) // total videos
      .mockResolvedValueOnce(3) // liked
      .mockResolvedValueOnce(2) // favorite
      .mockResolvedValueOnce(4); // following
    (prisma.author.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(5);

    const res = await syncRoute.GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.counts).toEqual({
      videos: 10,
      authors: 5,
      liked: 3,
      favorite: 2,
      following: 4,
    });
    expect(json.recentSyncs).toHaveLength(1);
  });
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    author: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import * as authorByIdRoute from '@/app/api/authors/[id]/route';
import * as authorsRoute from '@/app/api/authors/route';
import { prisma } from '@/app/lib/prisma';

describe('api/authors', () => {
  it('filters following=true and does not select BigInt heartCount', async () => {
    (prisma.author.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const res = await authorsRoute.GET({
      nextUrl: new URL('http://localhost/api/authors?following=true'),
    } as never);

    expect(prisma.author.findMany).toHaveBeenCalledTimes(1);
    const args = (prisma.author.findMany as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as Record<string, unknown>;

    expect(args.where).toEqual({ isFollowing: true });
    expect((args.select as Record<string, unknown>).heartCount).toBeUndefined();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authors: [] });
  });

  it('returns 404 for missing author by id', async () => {
    (prisma.author.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const res = await authorByIdRoute.GET({} as never, {
      params: Promise.resolve({ id: 'nope' }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Author not found' });
  });
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => {
  const createReadStream = vi.fn((_p: string, _opts: { start: number; end: number }) => {
    async function* gen() {
      yield Buffer.from('abcd');
    }
    return gen();
  });

  return {
    existsSync: vi.fn(),
    statSync: vi.fn(),
    createReadStream,
    readFileSync: vi.fn(),
  };
});

import * as fs from 'node:fs';

import * as mediaRoute from '@/app/api/media/[...path]/route';

describe('api/media/[...path]', () => {
  it('blocks directory traversal', async () => {
    const res = await mediaRoute.GET({ headers: new Headers() } as never, {
      params: Promise.resolve({ path: ['..', 'secret.mp4'] }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid path' });
  });

  it('returns 404 when file does not exist', async () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const res = await mediaRoute.GET({ headers: new Headers() } as never, {
      params: Promise.resolve({ path: ['missing.mp4'] }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'File not found' });
  });

  it('serves range responses for mp4', async () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({ size: 10 });

    const headers = new Headers();
    headers.set('range', 'bytes=0-3');

    const res = await mediaRoute.GET({ headers } as never, {
      params: Promise.resolve({ path: ['clip.mp4'] }),
    });

    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 0-3/10');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Content-Type')).toBe('video/mp4');
  });
});

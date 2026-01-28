import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVideoFeed } from '@/app/hooks/useVideoFeed';

function Harness({
  initial,
  type = 'liked',
}: {
  initial?: { videos: Array<{ id: string }>; nextCursor: string | null };
  type?: 'liked' | 'favorite' | 'following' | 'all';
}) {
  const { videos, isLoading, hasMore, loadMore } = useVideoFeed({
    type,
    limit: 5,
    initial: initial as never,
  });

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'yes' : 'no'}</div>
      <div data-testid="count">{videos.length}</div>
      <div data-testid="hasMore">{hasMore ? 'yes' : 'no'}</div>
      <button
        type="button"
        onClick={() => loadMore()}>
        more
      </button>
    </div>
  );
}

describe('useVideoFeed', () => {
  it('uses initial data without fetching on mount', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness initial={{ videos: [{ id: 'v0' }], nextCursor: 'v0' }} />);

    expect(screen.getByTestId('loading')).toHaveTextContent('no');
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Allow effects to run; should still not fetch.
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes cursor when loading more', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: [{ id: 'v1' }], nextCursor: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: [{ id: 'v2' }], nextCursor: null }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness initial={{ videos: [{ id: 'v0' }], nextCursor: 'v0' }} />);

    await act(async () => {
      screen.getByText('more').click();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('/api/videos?');
    expect(url).toContain('cursor=v0');
    expect(url).toContain('limit=5');
  });
});

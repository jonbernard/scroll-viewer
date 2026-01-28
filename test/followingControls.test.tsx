import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    toString: () => 'authorId=old&x=1',
  }),
}));

vi.mock('@/app/components/AuthorList', () => ({
  AuthorList: ({
    authors,
    onSelect,
  }: {
    authors: Array<{ id: string; uniqueId: string }>;
    onSelect: (author: { id: string } | null) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onSelect(authors[0] ?? null)}>
        pick
      </button>
    </div>
  ),
}));

import { FollowingControls } from '@/app/components/FollowingControls';

describe('FollowingControls', () => {
  it('clears authorId but preserves other query params', () => {
    pushMock.mockClear();

    render(
      <FollowingControls
        authors={[
          { id: 'a1', uniqueId: 'u1', nickname: 'n1', avatarPath: null, isFollowing: true },
        ]}
        selectedAuthor={{
          id: 'old',
          uniqueId: 'old',
          nickname: 'old',
          avatarPath: null,
          isFollowing: true,
        }}
      />,
    );

    fireEvent.click(screen.getByText('All Creators'));
    expect(pushMock).toHaveBeenCalledWith('/following?x=1', { scroll: false });
  });

  it('selects an author from Browse and preserves existing params', () => {
    pushMock.mockClear();

    render(
      <FollowingControls
        authors={[
          { id: 'a1', uniqueId: 'u1', nickname: 'n1', avatarPath: null, isFollowing: true },
        ]}
        selectedAuthor={null}
      />,
    );

    fireEvent.click(screen.getByText('Browse'));
    fireEvent.click(screen.getByText('pick'));

    expect(pushMock).toHaveBeenCalledWith('/following?authorId=a1&x=1', { scroll: false });
  });
});

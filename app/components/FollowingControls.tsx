'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import type { Author } from '@/app/lib/types';

import { AuthorList } from '@/app/components/AuthorList';

type AuthorSummary = Pick<Author, 'id' | 'uniqueId' | 'nickname' | 'avatarPath' | 'isFollowing'>;

export function FollowingControls({
  authors,
  selectedAuthor,
}: {
  authors: AuthorSummary[];
  selectedAuthor: AuthorSummary | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAuthorList, setShowAuthorList] = useState(false);

  const authorsForList = useMemo(() => {
    // `AuthorList` expects full `Author` shape; give it safe defaults for unused fields.
    return authors.map((a) => ({
      ...a,
      followerCount: null,
      heartCount: null,
      videoCount: null,
      signature: null,
    }));
  }, [authors]);

  const navigateToAuthor = (authorId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (authorId) params.set('authorId', authorId);
    else params.delete('authorId');

    const qs = params.toString();
    router.push(qs ? `/following?${qs}` : '/following', { scroll: false });
  };

  return (
    <>
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-3 pb-2">
        <button
          type="button"
          onClick={() => navigateToAuthor(null)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            selectedAuthor
              ? 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              : 'bg-white/20 text-white'
          }`}>
          All Creators
        </button>

        {selectedAuthor && (
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            @{selectedAuthor.uniqueId}
            <button
              type="button"
              onClick={() => navigateToAuthor(null)}
              className="text-white/80 transition hover:text-white"
              aria-label="Clear filter">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowAuthorList(true)}
          className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white">
          Browse
        </button>
      </div>

      {showAuthorList && (
        <AuthorList
          authors={authorsForList}
          isLoading={false}
          onSelect={(author) => {
            navigateToAuthor(author?.id ?? null);
            setShowAuthorList(false);
          }}
          onClose={() => setShowAuthorList(false)}
        />
      )}
    </>
  );
}

import Link from 'next/link';

import type { Author, FeedType } from '@/app/lib/types';

import { FollowingControls } from '@/app/components/FollowingControls';

interface NavigationProps {
  currentType: FeedType;
  followingAuthors?: Pick<Author, 'id' | 'uniqueId' | 'nickname' | 'avatarPath' | 'isFollowing'>[];
  selectedAuthor?: Pick<
    Author,
    'id' | 'uniqueId' | 'nickname' | 'avatarPath' | 'isFollowing'
  > | null;
}

const tabs: { type: FeedType; label: string; href: string }[] = [
  { type: 'following', label: 'Following', href: '/following' },
  { type: 'liked', label: 'Liked', href: '/liked' },
  { type: 'favorite', label: 'Favorites', href: '/favorites' },
  { type: 'all', label: 'All', href: '/all' },
];

export function Navigation({ currentType, followingAuthors, selectedAuthor }: NavigationProps) {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 safe-area-top">
      {/* TikTok-like top gradient overlay */}
      <div className="bg-linear-to-b from-black/80 via-black/40 to-transparent backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-3xl items-center justify-center px-3 py-2">
          {/* Center: text tabs with active underline */}
          <div className="relative flex items-center gap-6">
            {tabs.map((tab) => {
              const isActive = currentType === tab.type;
              return (
                <Link
                  key={tab.type}
                  href={tab.href}
                  prefetch={true}
                  className={`relative px-1 py-2 text-[13px] font-semibold tracking-wide transition ${
                    isActive ? 'text-white' : 'text-white/65 hover:text-white'
                  }`}>
                  {tab.label}
                  <span
                    className={`absolute bottom-1 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-white transition-all ${
                      isActive ? 'w-6 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Following: creator chip row */}
        {currentType === 'following' && (
          <FollowingControls
            authors={followingAuthors ?? []}
            selectedAuthor={selectedAuthor ?? null}
          />
        )}
      </div>
    </nav>
  );
}

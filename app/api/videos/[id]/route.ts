import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/app/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        author: {
          // Avoid returning BigInt fields (e.g. heartCount) which aren't JSON serializable.
          select: {
            id: true,
            uniqueId: true,
            nickname: true,
            avatarPath: true,
            followerCount: true,
            videoCount: true,
            signature: true,
            isFollowing: true,
            _count: {
              select: { videos: true },
            },
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to get userId from token
async function getUserIdFromToken(request: Request): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim() === '') {
      return NextResponse.json({ entries: [] }, { status: 200 });
    }

    // Get friend IDs for the current user
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      select: {
        requesterId: true,
        addresseeId: true,
      },
    });

    const friendIds = friendships.map(f => 
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    const entries = await prisma.diaryEntry.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
        AND: { // Apply privacy filters
          OR: [
            { privacyLevel: PrivacyLevel.PUBLIC }, // Public entries
            { userId: userId }, // User's own entries (any privacy level)
            { // Friends-only entries from accepted friends
              privacyLevel: PrivacyLevel.FRIENDS_ONLY,
              userId: { in: friendIds },
            },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error('Diary search error:', error);
    return NextResponse.json({ message: '日記の検索中にエラーが発生しました' }, { status: 500 });
  }
}

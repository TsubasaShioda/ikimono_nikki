import { NextResponse } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

interface Params {
  id: string; // This will be the userId of the entries to fetch
}

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

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const currentUserId = await getUserIdFromToken(request);
    if (!currentUserId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id: targetUserId } = params;

    // If fetching own entries, return all of them
    if (targetUserId === currentUserId) {
      const entries = await prisma.diaryEntry.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ entries }, { status: 200 });
    }

    // If fetching another user's entries, apply privacy logic
    let friendIds: string[] = [];
    // Check if current user is friends with target user
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: currentUserId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: currentUserId },
        ],
      },
    });

    if (friendship) {
      friendIds.push(targetUserId); // Add target user to friendIds if they are friends
    }

    const entries = await prisma.diaryEntry.findMany({
      where: {
        userId: targetUserId,
        OR: [
          { privacyLevel: PrivacyLevel.PUBLIC }, // Public entries
          { // Friends-only entries if current user is a friend of target user
            privacyLevel: PrivacyLevel.FRIENDS_ONLY,
            userId: { in: friendIds }, // This will only match if friendIds contains targetUserId
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error('Fetch user entries error:', error);
    return NextResponse.json({ message: 'ユーザーの日記取得中にエラーが発生しました' }, { status: 500 });
  }
}

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const userPayload = await verifyToken(token);
    const currentUserId = userPayload?.userId;

    if (!currentUserId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id: targetUserId } = context.params;

    // If fetching own entries, return all of them
    if (targetUserId === currentUserId) {
      const entries = await prisma.diaryEntry.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ entries }, { status: 200 });
    }

    // If fetching another user's entries, apply privacy logic
    const friendIds: string[] = [];
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
import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
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

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        iconUrl: true,
        description: true,
        // Add other public profile fields here
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // Check if current user is friends with target user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _isFriends = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: currentUserId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: currentUserId },
        ],
      },
    });

    // If not friends, and not self, limit information (e.g., hide email, etc.)
    // For now, we return all selected fields. More granular control can be added here.
    // Example: if (!isFriends && currentUserId !== targetUserId) { user.email = undefined; }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Fetch user profile error:', error);
    return NextResponse.json({ message: 'ユーザープロフィールの取得中にエラーが発生しました' }, { status: 500 });
  }
}
import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to get userId from token
async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const req = await request;

    const currentUserId = await getUserIdFromToken(req);
    if (!currentUserId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id: targetUserId } = await context.params;

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

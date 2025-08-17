import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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

    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      include: {
        requester: {
          select: { id: true, username: true, iconUrl: true },
        },
        addressee: {
          select: { id: true, username: true, iconUrl: true },
        },
      },
    });

    // Extract friend's info from the friendship records
    const friends = friendships.map(friendship => {
      const friendUser = friendship.requesterId === userId ? friendship.addressee : friendship.requester;
      return {
        friendshipId: friendship.id,
        ...friendUser,
      };
    });

    return NextResponse.json({ friends }, { status: 200 });
  } catch (error) {
    console.error('Fetch friends error:', error);
    return NextResponse.json({ message: 'フレンド一覧の取得中にエラーが発生しました' }, { status: 500 });
  }
}

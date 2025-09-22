import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.id;
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
    const friends = friendships.map((friendship: { id: string; requesterId: string; addresseeId: string; requester: { id: string; username: string; iconUrl: string | null; }; addressee: { id: string; username: string; iconUrl: string | null; }; }) => {
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

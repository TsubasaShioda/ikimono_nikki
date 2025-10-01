import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, FriendshipStatus } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id: friendshipId } = context.params;
    const { status } = await request.json();

    if (status !== 'ACCEPTED' && status !== 'DECLINED') {
      return NextResponse.json({ message: '無効なステータスです' }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ message: 'フレンド申請が見つかりません' }, { status: 404 });
    }

    // Only the addressee can accept/decline the request
    if (friendship.addresseeId !== userId) {
      return NextResponse.json({ message: 'この操作を行う権限がありません' }, { status: 403 });
    }
    
    if (friendship.status !== 'PENDING') {
        return NextResponse.json({ message: 'この申請は既に応答済みです' }, { status: 409 });
    }

    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: status as FriendshipStatus },
    });

    return NextResponse.json({ message: 'フレンド申請に応答しました', friendship: updatedFriendship }, { status: 200 });
  } catch (error) {
    console.error('Friend request response error:', error);
    return NextResponse.json({ message: 'フレンド申請への応答中にエラーが発生しました' }, { status: 500 });
  }
}
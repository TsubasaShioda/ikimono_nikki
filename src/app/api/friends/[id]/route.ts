import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id: friendshipId } = context.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ message: 'フレンド関係が見つかりません' }, { status: 404 });
    }

    // Only the requester or addressee of the friendship can delete it
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      return NextResponse.json({ message: 'この操作を行う権限がありません' }, { status: 403 });
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return NextResponse.json({ message: 'フレンド関係を解除しました' }, { status: 200 });
  } catch (error) {
    console.error('Friend removal error:', error);
    return NextResponse.json({ message: 'フレンド解除中にエラーが発生しました' }, { status: 500 });
  }
}
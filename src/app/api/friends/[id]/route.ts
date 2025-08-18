import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

interface Params {
  id: string; // This will be the friendshipId
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

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id: friendshipId } = params;

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

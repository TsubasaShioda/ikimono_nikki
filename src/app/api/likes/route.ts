import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, NotificationType } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { diaryEntryId } = await request.json();

    if (!diaryEntryId) {
      return NextResponse.json({ message: '日記IDが不足しています' }, { status: 400 });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_diaryEntryId: {
          userId,
          diaryEntryId,
        },
      },
    });

    if (existingLike) {
      // Unlike: just delete the like
      await prisma.like.delete({
        where: {
          userId_diaryEntryId: {
            userId,
            diaryEntryId,
          },
        },
      });
      return NextResponse.json({ message: 'いいねを解除しました' }, { status: 200 });
    } else {
      // Like: create the like and a notification in a transaction
      const diaryEntry = await prisma.diaryEntry.findUnique({ where: { id: diaryEntryId } });
      if (!diaryEntry) {
        return NextResponse.json({ message: '対象の日記が見つかりません' }, { status: 404 });
      }

      const isOwnPost = diaryEntry.userId === userId;

      if (isOwnPost) {
        // If liking own post, just create the like without a notification
        const like = await prisma.like.create({
          data: { userId, diaryEntryId },
        });
        return NextResponse.json({ message: 'いいねしました', like }, { status: 201 });
      } else {
        // If liking someone else's post, create like and notification
        const [like] = await prisma.$transaction([
          prisma.like.create({
            data: { userId, diaryEntryId },
          }),
          prisma.notification.create({
            data: {
              type: NotificationType.NEW_LIKE,
              recipientId: diaryEntry.userId, // Notify the author of the post
              actorId: userId, // The user who liked the post
              diaryEntryId: diaryEntryId,
            },
          }),
        ]);
        return NextResponse.json({ message: 'いいねしました', like }, { status: 201 });
      }
    }
  } catch (error) {
    console.error('いいね処理エラー:', error);
    return NextResponse.json({ message: 'いいね処理中にエラーが発生しました' }, { status: 500 });
  }
}

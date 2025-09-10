import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, NotificationType } from '@prisma/client';
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
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
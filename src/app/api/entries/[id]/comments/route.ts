import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, NotificationType } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET all comments for a specific diary entry
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const comments = await prisma.comment.findMany({
      where: { diaryEntryId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            iconUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    console.error(`Error fetching comments for entry ${params.id}:`, error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// POST a new comment to a diary entry
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id: diaryEntryId } = params;
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'コメント本文は必須です' }, { status: 400 });
    }

    const diaryEntry = await prisma.diaryEntry.findUnique({ where: { id: diaryEntryId } });
    if (!diaryEntry) {
      return NextResponse.json({ error: '対象の日記が見つかりません' }, { status: 404 });
    }

    const isOwnPost = diaryEntry.userId === userId;

    // Use a transaction to create the comment and potentially a notification
    const newComment = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          text: text.trim(),
          userId,
          diaryEntryId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              iconUrl: true,
            },
          },
        },
      });

      if (!isOwnPost) {
        await tx.notification.create({
          data: {
            type: NotificationType.NEW_COMMENT,
            recipientId: diaryEntry.userId,
            actorId: userId,
            diaryEntryId: diaryEntryId,
          },
        });
      }

      return comment;
    });

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error(`Error creating comment for entry ${params.id}:`, error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

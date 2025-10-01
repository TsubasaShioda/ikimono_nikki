import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// DELETE a comment by its ID
export async function DELETE(req: NextRequest, { params }: { params: { commentId: string } }) {
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { commentId } = params;

    // Find the comment and include its diary entry to check ownership
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        diaryEntry: {
          select: { userId: true }, // Select only the diary entry's owner ID
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'コメントが見つかりません' }, { status: 404 });
    }

    // Check if the user is the author of the comment OR the author of the post
    const isCommentAuthor = comment.userId === userId;
    const isPostAuthor = comment.diaryEntry.userId === userId;

    if (!isCommentAuthor && !isPostAuthor) {
      return NextResponse.json({ error: 'このコメントを削除する権限がありません' }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: 'コメントが正常に削除されました' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting comment ${params.commentId}:`, error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
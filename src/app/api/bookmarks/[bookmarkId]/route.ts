
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to verify JWT and get userId
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

// DELETE a bookmark
export async function DELETE(req: NextRequest, { params }: { params: { bookmarkId: string } }) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { bookmarkId } = params;

    // Find the bookmark and include its album to verify ownership
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: {
        bookmarkAlbum: true,
      },
    });

    if (!bookmark) {
      return NextResponse.json({ error: 'ブックマークが見つかりません' }, { status: 404 });
    }

    // Check if the user owns the album containing the bookmark
    if (bookmark.bookmarkAlbum.userId !== userId) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    await prisma.bookmark.delete({
      where: { id: bookmarkId },
    });

    return NextResponse.json({ message: 'ブックマークが正常に削除されました' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

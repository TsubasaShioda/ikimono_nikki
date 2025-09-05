
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

// PUT (update) a bookmark album
export async function PUT(req: NextRequest, { params }: { params: { albumId: string } }) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { albumId } = params;
    const { name } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'アルバム名は必須です' }, { status: 400 });
    }

    // First, verify the album exists and belongs to the user
    const album = await prisma.bookmarkAlbum.findUnique({
      where: { id: albumId },
    });

    if (!album || album.userId !== userId) {
      return NextResponse.json({ error: 'アルバムが見つからないか、権限がありません' }, { status: 404 });
    }

    const updatedAlbum = await prisma.bookmarkAlbum.update({
      where: { id: albumId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ bookmarkAlbum: updatedAlbum }, { status: 200 });
  } catch (error) {
    console.error('Error updating bookmark album:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// DELETE a bookmark album
export async function DELETE(req: NextRequest, { params }: { params: { albumId: string } }) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { albumId } = params;

    // Verify the album exists and belongs to the user
    const album = await prisma.bookmarkAlbum.findUnique({
      where: { id: albumId },
    });

    if (!album || album.userId !== userId) {
      return NextResponse.json({ error: 'アルバムが見つからないか、権限がありません' }, { status: 404 });
    }

    // Deleting the album will also delete all associated bookmarks due to cascading deletes in the schema
    await prisma.bookmarkAlbum.delete({
      where: { id: albumId },
    });

    return NextResponse.json({ message: 'アルバムが正常に削除されました' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting bookmark album:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

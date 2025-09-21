import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// アルバム名変更
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value;
  const user = verifyToken(token);

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const albumId = params.id;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'アルバム名は必須です' }, { status: 400 });
    }

    const album = await prisma.bookmarkAlbum.findUnique({
      where: { id: albumId },
    });

    if (!album || album.userId !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const updatedAlbum = await prisma.bookmarkAlbum.update({
      where: { id: albumId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ updatedAlbum });
  } catch (error) {
    console.error('Album update error:', error);
    return NextResponse.json({ error: 'アルバムの更新に失敗しました' }, { status: 500 });
  }
}

// アルバム削除
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('token')?.value;
  const user = verifyToken(token);

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const albumId = params.id;

    const album = await prisma.bookmarkAlbum.findUnique({
      where: { id: albumId },
    });

    if (!album || album.userId !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 関連するブックマークを先に削除
    await prisma.bookmark.deleteMany({
        where: { bookmarkAlbumId: albumId },
    });

    // アルバムを削除
    await prisma.bookmarkAlbum.delete({
      where: { id: albumId },
    });

    return NextResponse.json({ message: 'アルバムを削除しました' }, { status: 200 });
  } catch (error) {
    console.error('Album delete error:', error);
    return NextResponse.json({ error: 'アルバムの削除に失敗しました' }, { status: 500 });
  }
}

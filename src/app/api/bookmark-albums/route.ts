import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET all bookmark albums for the current user
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const bookmarkAlbums = await prisma.bookmarkAlbum.findMany({
      where: { userId },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bookmarkAlbums }, { status: 200 });
  } catch (error) {
    console.error('Error fetching bookmark albums:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// POST a new bookmark album
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'アルバム名は必須です' }, { status: 400 });
    }

    const newAlbum = await prisma.bookmarkAlbum.create({
      data: {
        name: name.trim(),
        userId,
      },
    });

    return NextResponse.json({ bookmarkAlbum: newAlbum }, { status: 201 });
  } catch (error) {
    console.error('Error creating bookmark album:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
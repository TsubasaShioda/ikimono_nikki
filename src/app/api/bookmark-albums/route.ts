
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

// GET all bookmark albums for the current user
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
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
    const userId = await getUserIdFromToken(req);
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

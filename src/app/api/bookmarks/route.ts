
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

// GET all bookmarks in a specific album
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const albumId = searchParams.get('albumId');

    if (!albumId) {
      return NextResponse.json({ error: 'albumIdが必要です' }, { status: 400 });
    }

    // Verify the album belongs to the user
    const album = await prisma.bookmarkAlbum.findFirst({
      where: {
        id: albumId,
        userId: userId,
      },
    });

    if (!album) {
      return NextResponse.json({ error: 'アルバムが見つからないか、権限がありません' }, { status: 404 });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { bookmarkAlbumId: albumId },
      include: {
        diaryEntry: { // Include the full diary entry details
          include: {
            user: { // Include the author's details
              select: {
                id: true,
                username: true,
                iconUrl: true,
              },
            },
            likes: { // To calculate likes count
              select: {
                userId: true,
              }
            }
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Process entries to add likesCount and isLikedByCurrentUser
    const processedBookmarks = bookmarks.map(bookmark => {
        const { diaryEntry } = bookmark;
        return {
            ...bookmark,
            diaryEntry: {
                ...diaryEntry,
                likesCount: diaryEntry.likes.length,
                isLikedByCurrentUser: diaryEntry.likes.some(like => like.userId === userId),
            }
        }
    });

    return NextResponse.json({ bookmarks: processedBookmarks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// POST a new bookmark to an album
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { diaryEntryId, albumId } = await req.json();

    if (!diaryEntryId || !albumId) {
      return NextResponse.json({ error: 'diaryEntryIdとalbumIdは必須です' }, { status: 400 });
    }

    // Verify the album belongs to the user
    const album = await prisma.bookmarkAlbum.findFirst({
      where: {
        id: albumId,
        userId: userId,
      },
    });

    if (!album) {
      return NextResponse.json({ error: 'アルバムが見つからないか、権限がありません' }, { status: 404 });
    }

    // Check if the bookmark already exists
    const existingBookmark = await prisma.bookmark.findUnique({
        where: { diaryEntryId_bookmarkAlbumId: { diaryEntryId, bookmarkAlbumId: albumId } }
    });

    if (existingBookmark) {
        return NextResponse.json({ error: 'この投稿は既にこのアルバムに保存されています' }, { status: 409 });
    }

    const newBookmark = await prisma.bookmark.create({
      data: {
        diaryEntryId,
        bookmarkAlbumId: albumId,
      },
    });

    return NextResponse.json({ bookmark: newBookmark }, { status: 201 });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

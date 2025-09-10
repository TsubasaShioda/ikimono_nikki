
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
    return null;
  }
}

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
      orderBy: { createdAt: 'asc' }, // Show oldest comments first
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
    const userId = await getUserIdFromToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = params;
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'コメント本文は必須です' }, { status: 400 });
    }

    // Check if the diary entry exists
    const diaryEntry = await prisma.diaryEntry.findUnique({ where: { id: id } });
    if (!diaryEntry) {
        return NextResponse.json({ error: '対象の日記が見つかりません' }, { status: 404 });
    }

    const newComment = await prisma.comment.create({
      data: {
        text: text.trim(),
        userId,
        diaryEntryId: id,
      },
      include: { // Return the new comment with user info
        user: {
            select: {
                id: true,
                username: true,
                iconUrl: true,
            }
        }
      }
    });

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error(`Error creating comment for entry ${params.id}:`, error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

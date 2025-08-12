import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
      userId = payload.userId as string;
    } catch (error) {
      return NextResponse.json({ message: '認証トークンが無効です' }, { status: 401 });
    }

    const { title, description, imageUrl, latitude, longitude, takenAt, isPublic } = await request.json();

    // Basic validation
    if (!title || !latitude || !longitude || !takenAt) {
      return NextResponse.json({ message: '必須項目が不足しています' }, { status: 400 });
    }

    const newEntry = await prisma.diaryEntry.create({
      data: {
        title,
        description,
        imageUrl,
        latitude,
        longitude,
        takenAt: new Date(takenAt),
        isPublic: isPublic || false,
        userId,
      },
    });

    return NextResponse.json({ message: '日記が正常に投稿されました', entry: newEntry }, { status: 201 });
  } catch (error) {
    console.error('日記投稿エラー:', error);
    return NextResponse.json({ message: '日記の投稿中にエラーが発生しました' }, { status: 500 });
  }
}

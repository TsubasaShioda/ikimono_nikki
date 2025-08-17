import { NextResponse } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client'; // PrivacyLevelをインポート
import { jwtVerify } from 'jose';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper function to verify JWT and get userId
async function getUserIdFromToken(request: Request): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromToken(request);

    let entries;
    if (userId) {
      // ログインユーザーには、公開されている日記と自分の日記（プライベート含む）を見せる
      entries = await prisma.diaryEntry.findMany({
        where: {
          OR: [
            { privacyLevel: 'PUBLIC' },
            { userId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // 未ログインユーザーには、公開されている日記のみを見せる
      entries = await prisma.diaryEntry.findMany({
        where: { privacyLevel: 'PUBLIC' },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error('DEBUG: 日記取得エラー:', error);
    return NextResponse.json({ message: '日記の取得中にエラーが発生しました' }, { status: 500 });
  }
}

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

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as File | null;
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);
    const takenAt = formData.get('takenAt') as string;
    const privacyLevel = formData.get('privacyLevel') as PrivacyLevel; // isPublicから変更

    // Validate privacyLevel
    if (!privacyLevel || !Object.values(PrivacyLevel).includes(privacyLevel)) {
        return NextResponse.json({ message: '無効な公開レベルです' }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = `${Date.now()}-${image.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filePath = path.join(uploadDir, filename);

      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    // Basic validation
    if (!title || isNaN(latitude) || isNaN(longitude) || !takenAt) {
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
        privacyLevel, // isPublicから変更
        userId,
      },
    });

    return NextResponse.json({ message: '日記が正常に投稿されました', entry: newEntry }, { status: 201 });
  } catch (error) {
    console.error('日記投稿エラー:', error);
    return NextResponse.json({ message: '日記の投稿中にエラーが発生しました' }, { status: 500 });
  }
}

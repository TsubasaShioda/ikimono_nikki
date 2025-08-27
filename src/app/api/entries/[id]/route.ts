import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client'; // PrivacyLevelをインポート
import { jwtVerify } from 'jose';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper function to verify JWT and get userId
async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// GET method to fetch a single diary entry by ID
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;

    const entry = await prisma.diaryEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    // 閲覧権限のチェック
    const userId = await getUserIdFromToken(request);

    // If the entry is not public and not owned by the current user
    if (entry.privacyLevel !== PrivacyLevel.PUBLIC && entry.userId !== userId) {
      // If it's friends-only, check if the current user is a friend
      if (entry.privacyLevel === PrivacyLevel.FRIENDS_ONLY) {
        if (!userId) { // Not logged in, cannot be a friend
          return NextResponse.json({ message: 'この日記を閲覧する権限がありません' }, { status: 403 });
        }

        // Check if the current user is a friend of the entry owner
        const friendship = await prisma.friendship.findFirst({
          where: {
            status: 'ACCEPTED',
            OR: [
              { requesterId: userId, addresseeId: entry.userId },
              { requesterId: entry.userId, addresseeId: userId },
            ],

          },

        });

        if (!friendship) { // Not friends
          return NextResponse.json({ message: 'この日記を閲覧する権限がありません' }, { status: 403 });
        }

      } else { // PRIVATE entry, and not the owner
        return NextResponse.json({ message: 'この日記を閲覧する権限がありません' }, { status: 403 });
      }

    }

    return NextResponse.json({ entry }, { status: 200 });
  } catch (error) {
    console.error('日記取得エラー:', error);
    return NextResponse.json({ message: '日記の取得中にエラーが発生しました' }, { status: 500 });
  }

}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const userId = await getUserIdFromToken(request); // 認証と権限の確認

    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    // 日記エントリーの存在と所有者の確認
    const existingEntry = await prisma.diaryEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    if (existingEntry.userId !== userId) {
      return NextResponse.json({ message: 'この日記を更新する権限がありません' }, { status: 403 });
    }

    // フォームデータの取得
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as File | null;
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : existingEntry.latitude;
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : existingEntry.longitude;
    const takenAt = formData.get('takenAt') as string;
    const privacyLevel = formData.get('privacyLevel') as PrivacyLevel;
    let imageUrl = existingEntry.imageUrl; // 既存の画像URLを初期値とする

    // 画像ファイルの更新
    if (image) {
      // 既存の画像があれば削除
      if (existingEntry.imageUrl) {
        const oldImagePath = path.join(process.cwd(), 'public', existingEntry.imageUrl);
        try {
          await fs.unlink(oldImagePath);
        } catch (unlinkError) {
          console.error('Failed to delete old image file:', unlinkError);
        }
      }
      // 新しい画像を保存
      const imageName = `${Date.now()}-${image.name}`;
      imageUrl = `/uploads/${imageName}`;
      const imagePath = path.join(process.cwd(), 'public', imageUrl);
      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(imagePath, buffer);
    } else if (formData.get('image') === null && existingEntry.imageUrl) {
      // 画像がフォームデータからnullとして送られ、既存の画像がある場合は削除
      const oldImagePath = path.join(process.cwd(), 'public', existingEntry.imageUrl);
      try {
        await fs.unlink(oldImagePath);
        imageUrl = null;
      } catch (unlinkError) {
        console.error('Failed to delete old image file:', unlinkError);
      }
    }


    // データベースの更新
    const updatedEntry = await prisma.diaryEntry.update({
  where: { id },
  data: {
    title,
    description,
    imageUrl,
    latitude,
    longitude,
    takenAt: takenAt ? new Date(takenAt) : existingEntry.takenAt,
    privacyLevel,
  },
});

    return NextResponse.json({ entry: updatedEntry }, { status: 200 });
  } catch (error) {
    console.error('日記更新エラー:', error);
    return NextResponse.json({ message: '日記の更新中にエラーが発生しました' }, { status: 500 });
  }
}
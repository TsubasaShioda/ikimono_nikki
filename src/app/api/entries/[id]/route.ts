import { NextResponse } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client'; // PrivacyLevelをインポート
import { jwtVerify } from 'jose';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface Params {
  id: string;
}

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
    console.error('Token verification failed:', error);
    return null;
  }
}

// GET method to fetch a single diary entry by ID
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { id } = params;

    const entry = await prisma.diaryEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    // 閲覧権限のチェック
    const userId = await getUserIdFromToken(request);
    if (entry.privacyLevel !== 'PUBLIC' && entry.userId !== userId) {
      // TODO: フレンド機能実装時に、FRIENDS_ONLYのロジックを追加
      return NextResponse.json({ message: 'この日記を閲覧する権限がありません' }, { status: 403 });
    }

    return NextResponse.json({ entry }, { status: 200 });
  } catch (error) {
    console.error('日記取得エラー:', error);
    return NextResponse.json({ message: '日記の取得中にエラーが発生しました' }, { status: 500 });
  }
}


export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id } = params;
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

    // Find the existing entry
    const existingEntry = await prisma.diaryEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    // Check if the authenticated user is the owner of the entry
    if (existingEntry.userId !== userId) {
      return NextResponse.json({ message: 'この日記を編集する権限がありません' }, { status: 403 });
    }

    let imageUrl: string | null = existingEntry.imageUrl;
    if (image) {
      // Delete old image if it exists
      if (existingEntry.imageUrl) {
        const oldImagePath = path.join(process.cwd(), 'public', existingEntry.imageUrl);
        try {
          await fs.unlink(oldImagePath);
        } catch (unlinkError) {
          console.error('Failed to delete old image:', unlinkError);
        }
      }

      // Upload new image
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = `${Date.now()}-${image.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    } else if (formData.get('imageUrl') === '') { // Handle case where image is removed
      if (existingEntry.imageUrl) {
        const oldImagePath = path.join(process.cwd(), 'public', existingEntry.imageUrl);
        try {
          await fs.unlink(oldImagePath);
        } catch (unlinkError) {
          console.error('Failed to delete old image:', unlinkError);
        }
      }
      imageUrl = null;
    }

    // Basic validation
    if (!title || isNaN(latitude) || isNaN(longitude) || !takenAt) {
      return NextResponse.json({ message: '必須項目が不足しています' }, { status: 400 });
    }

    const updatedEntry = await prisma.diaryEntry.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl,
        latitude,
        longitude,
        takenAt: new Date(takenAt),
        privacyLevel, // isPublicから変更
      },
    });

    return NextResponse.json({ message: '日記が正常に更新されました', entry: updatedEntry }, { status: 200 });
  } catch (error) {
    console.error('日記更新エラー:', error);
    return NextResponse.json({ message: '日記の更新中にエラーが発生しました' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { id } = params;

    // Find the existing entry
    const existingEntry = await prisma.diaryEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    // Check if the authenticated user is the owner of the entry
    if (existingEntry.userId !== userId) {
      return NextResponse.json({ message: 'この日記を削除する権限がありません' }, { status: 403 });
    }

    // Delete associated image file if it exists
    if (existingEntry.imageUrl) {
      const imagePath = path.join(process.cwd(), 'public', existingEntry.imageUrl);
      try {
        await fs.unlink(imagePath);
      } catch (unlinkError) {
        console.error('Failed to delete image file:', unlinkError);
        // Continue even if image deletion fails, as the main goal is to delete the entry
      }
    }

    await prisma.diaryEntry.delete({
      where: { id },
    });

    return NextResponse.json({ message: '日記が正常に削除されました' }, { status: 200 });
  } catch (error) {
    console.error('日記削除エラー:', error);
    return NextResponse.json({ message: '日記の削除中にエラーが発生しました' }, { status: 500 });
  }
}

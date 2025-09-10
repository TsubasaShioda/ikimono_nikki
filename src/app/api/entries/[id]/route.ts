import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client';
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
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const entry = await prisma.diaryEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            iconUrl: true,
          }
        }
      }
    });

    if (!entry) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    // 閲覧権限のチェック
    const userId = await getUserIdFromToken(request);

    if (entry.privacyLevel !== PrivacyLevel.PUBLIC && entry.privacyLevel !== PrivacyLevel.PUBLIC_ANONYMOUS && entry.userId !== userId) {
      if (entry.privacyLevel === PrivacyLevel.FRIENDS_ONLY) {
        if (!userId) { 
          return NextResponse.json({ message: 'この日記を閲覧する権限がありません' }, { status: 403 });
        }
        const friendship = await prisma.friendship.findFirst({
          where: {
            status: 'ACCEPTED',
            OR: [
              { requesterId: userId, addresseeId: entry.userId },
              { requesterId: entry.userId, addresseeId: userId },
            ],
          },
        });
        if (!friendship) { 
          return NextResponse.json({ message: 'この日記を閲覧する権限がありません' }, { status: 403 });
        }
      } else { // PRIVATE
        return NextResponse.json({ message: 'この日記を閲覧する権限がありません' }, { status: 403 });
      }
    }

    // Anonymize if necessary
    if (entry.privacyLevel === PrivacyLevel.PUBLIC_ANONYMOUS) {
        const isOwner = entry.userId === userId;
        if (!isOwner) {
            const isFriend = userId ? (await prisma.friendship.findFirst({
                where: {
                    status: 'ACCEPTED',
                    OR: [
                        { requesterId: userId, addresseeId: entry.userId },
                        { requesterId: entry.userId, addresseeId: userId },
                    ],
                },
            })) !== null : false;

            if (!isFriend) {
                entry.user = { id: 'anonymous', username: '匿名ユーザー', iconUrl: '/default-avatar.svg' };
            }
        }
    }

    return NextResponse.json({ entry }, { status: 200 });
  } catch (error) {
    console.error('日記取得エラー:', error);
    return NextResponse.json({ message: '日記の取得中にエラーが発生しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const existingEntry = await prisma.diaryEntry.findUnique({ where: { id } });

    if (!existingEntry) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    if (existingEntry.userId !== userId) {
      return NextResponse.json({ message: 'この日記を更新する権限がありません' }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as File | null;
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : existingEntry.latitude;
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : existingEntry.longitude;
    const takenAt = formData.get('takenAt') as string;
    const privacyLevel = formData.get('privacyLevel') as PrivacyLevel;
    let imageUrl = existingEntry.imageUrl;

    if (image) {
      if (existingEntry.imageUrl) {
        const oldImagePath = path.join(process.cwd(), 'public', existingEntry.imageUrl);
        try { await fs.unlink(oldImagePath); } catch (e) { console.error('Failed to delete old image:', e); }
      }
      const imageName = `${Date.now()}-${image.name}`;
      imageUrl = `/uploads/${imageName}`;
      const imagePath = path.join(process.cwd(), 'public', imageUrl);
      await fs.writeFile(imagePath, Buffer.from(await image.arrayBuffer()));
    } else if (formData.has('imageUrl') && !formData.get('imageUrl')) {
        if (existingEntry.imageUrl) {
            const oldImagePath = path.join(process.cwd(), 'public', existingEntry.imageUrl);
            try { await fs.unlink(oldImagePath); } catch (e) { console.error('Failed to delete old image:', e); }
        }
        imageUrl = null;
    }

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const entryToDelete = await prisma.diaryEntry.findUnique({ where: { id } });

    if (!entryToDelete) {
      return NextResponse.json({ message: '日記が見つかりません' }, { status: 404 });
    }

    if (entryToDelete.userId !== userId) {
      return NextResponse.json({ message: 'この日記を削除する権限がありません' }, { status: 403 });
    }

    if (entryToDelete.imageUrl) {
      const imagePath = path.join(process.cwd(), 'public', entryToDelete.imageUrl);
      try { await fs.unlink(imagePath); } catch (e) { console.error('Failed to delete image:', e); }
    }

    await prisma.diaryEntry.delete({ where: { id } });

    return NextResponse.json({ message: '日記が正常に削除されました' }, { status: 200 });
  } catch (error) {
    console.error('日記削除エラー:', error);
    return NextResponse.json({ message: '日記の削除中にエラーが発生しました' }, { status: 500 });
  }
}
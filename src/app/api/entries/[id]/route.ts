import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

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
    const token = request.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

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
    const token = request.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

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

    // Supabaseクライアントの初期化
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key is not defined');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const bucketName = 'diary-images'; // 日記画像用のバケット名

    if (image) {
      // 古い画像を削除
      if (existingEntry.imageUrl) {
        const oldFilename = existingEntry.imageUrl.split('/').pop(); // URLからファイル名を取得
        if (oldFilename) {
          const { error: deleteError } = await supabase.storage.from(bucketName).remove([oldFilename]);
          if (deleteError) {
            console.error('Failed to delete old image from Supabase Storage:', deleteError);
          }
        }
      }

      // 新しい画像をアップロード
      const filename = `${Date.now()}-${image.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filename, image, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error('画像のアップロードに失敗しました。');
      }
      imageUrl = supabase.storage.from(bucketName).getPublicUrl(filename).data.publicUrl;
    } else if (formData.has('imageUrl') && !formData.get('imageUrl')) { // 画像が削除された場合
      if (existingEntry.imageUrl) {
        const oldFilename = existingEntry.imageUrl.split('/').pop();
        if (oldFilename) {
          const { error: deleteError } = await supabase.storage.from(bucketName).remove([oldFilename]);
          if (deleteError) {
            console.error('Failed to delete old image from Supabase Storage:', deleteError);
          }
        }
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
    const token = request.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

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

    // Supabaseクライアントの初期化
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key is not defined');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const bucketName = 'diary-images'; // 日記画像用のバケット名

    if (entryToDelete.imageUrl) {
      const filename = entryToDelete.imageUrl.split('/').pop(); // URLからファイル名を取得
      if (filename) {
        const { error: deleteError } = await supabase.storage.from(bucketName).remove([filename]);
        if (deleteError) {
          console.error('Failed to delete image from Supabase Storage:', deleteError);
        }
      }
    }

    await prisma.diaryEntry.delete({ where: { id } });

    return NextResponse.json({ message: '日記が正常に削除されました' }, { status: 200 });
  } catch (error) {
    console.error('日記削除エラー:', error);
    return NextResponse.json({ message: '日記の削除中にエラーが発生しました' }, { status: 500 });
  }
}
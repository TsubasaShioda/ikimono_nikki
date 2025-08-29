import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, PrivacyLevel, Prisma, DiaryEntry } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to get userId from token
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request); // ゲストの場合はnullになります

    let friendIds: string[] = [];
    let hiddenEntryIds: string[] = [];
    let hiddenUserIds: string[] = [];

    if (userId) {
      // 非表示の投稿IDを取得
      const hiddenEntries = await prisma.hiddenEntry.findMany({
        where: { userId: userId },
        select: { entryId: true },
      });
      hiddenEntryIds = hiddenEntries.map((he) => he.entryId);

      // 非表示のユーザーIDを取得
      const hiddenUsers = await prisma.hiddenUser.findMany({
        where: { userId: userId },
        select: { hiddenUserId: true },
      });
      hiddenUserIds = hiddenUsers.map((hu) => hu.hiddenUserId);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const minLat = searchParams.get('minLat');
    const maxLat = searchParams.get('maxLat');
    const minLng = searchParams.get('minLng');
    const maxLng = searchParams.get('maxLng');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const timeOfDay = searchParams.get('timeOfDay');
    const monthOnlyParam = searchParams.get('monthOnly'); // 月フィルターを複数選択可能に

    const whereConditions: Prisma.DiaryEntryWhereInput = {
      AND: [],
    };

    // --- 非表示フィルターのロジック ---
    if (hiddenEntryIds.length > 0) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
        id: { notIn: hiddenEntryIds },
      });
    }
    if (hiddenUserIds.length > 0) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
        userId: { notIn: hiddenUserIds },
      });
    }

    // --- プライバシーフィルターのロジック ---
    if (userId) {
      // --- ログインユーザーの場合 ---
      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
        select: {
          requesterId: true,
          addresseeId: true,
        },
      });
      friendIds = friendships.map((f: { requesterId: string; addresseeId: string; }) =>
        f.requesterId === userId ? f.addresseeId : f.requesterId
      );
      

      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
        OR: [
          { privacyLevel: PrivacyLevel.PUBLIC },
          { userId: userId },
          {
            privacyLevel: PrivacyLevel.FRIENDS_ONLY,
            userId: { in: friendIds },
          },
        ],
      });
    } else {
      // --- ゲストユーザーの場合 ---
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
        privacyLevel: PrivacyLevel.PUBLIC,
      });
    }

    if (query && query.trim() !== '') {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      });
    }

    if (categoryId) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ categoryId: categoryId });
    }

    if (minLat && maxLat && minLng && maxLng) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
        latitude: {
          gte: parseFloat(minLat),
          lte: parseFloat(maxLat),
        },
        longitude: {
          gte: parseFloat(minLng),
          lte: parseFloat(maxLng),
        },
      });
    }

    if (startDate || endDate) {
      const takenAtCondition: Prisma.DateTimeFilter = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        takenAtCondition.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        takenAtCondition.lte = end;
      }
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ takenAt: takenAtCondition });
    }

    let entries = await prisma.diaryEntry.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        imageUrl: true,
        latitude: true,
        longitude: true,
        takenAt: true,
        createdAt: true,
        privacyLevel: true,
        categoryId: true,
        user: {
          select: {
            id: true,
            username: true,
            iconUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          }
        },
        likes: true
      },
    });

    

    // Calculate isFriend for each entry
    let processedEntries = entries.map(entry => ({
      ...entry,
      isFriend: userId ? friendIds.includes(entry.userId) : false,
      likesCount: entry.likes.length,
      isLikedByCurrentUser: userId
        ? entry.likes.some(like => like.userId === userId)
        : false,
    }));

    

    if (timeOfDay && timeOfDay !== 'all') {
      processedEntries = processedEntries.filter((entry: DiaryEntry) => {
        const jstDate = new Date(new Date(entry.takenAt).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        const hour = jstDate.getHours();
        
        switch (timeOfDay) {
          case 'morning':
            return hour >= 5 && hour < 10;
          case 'daytime':
            return hour >= 10 && hour < 16;
          case 'night':
            return hour >= 16 || hour < 5;
          default:
            return true;
        }
      });
      
    }

    // 月フィルターを追加 (複数選択可能)
    if (monthOnlyParam) {
      const targetMonths = monthOnlyParam.split(',').map(month => parseInt(month.trim(), 10)).filter(month => !isNaN(month) && month >= 1 && month <= 12);
      if (targetMonths.length > 0) {
        processedEntries = processedEntries.filter((entry: DiaryEntry) => {
          const jstDate = new Date(new Date(entry.takenAt).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
          return targetMonths.includes(jstDate.getMonth() + 1); // getMonth()は0-indexed
        });
      }
      
    }

    return NextResponse.json({ entries: processedEntries }, { status: 200 });
  } catch (error) {
    console.error('Diary search error:', error);
    return NextResponse.json({ message: '日記の検索中にエラーが発生しました' }, { status: 500 });
  }
}

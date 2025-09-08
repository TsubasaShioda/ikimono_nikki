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
    const userId = await getUserIdFromToken(request);

    let friendIds: string[] = [];
    let hiddenEntryIds: string[] = [];
    let hiddenUserIds: string[] = [];

    if (userId) {
      // Fetch hidden entries and users
      const hiddenEntries = await prisma.hiddenEntry.findMany({ where: { userId }, select: { entryId: true } });
      hiddenEntryIds = hiddenEntries.map((he) => he.entryId);

      const hiddenUsers = await prisma.hiddenUser.findMany({ where: { userId }, select: { hiddenUserId: true } });
      hiddenUserIds = hiddenUsers.map((hu) => hu.hiddenUserId);

      // Fetch friend IDs
      const friendships = await prisma.friendship.findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { requesterId: true, addresseeId: true },
      });
      friendIds = friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
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
    const monthOnlyParam = searchParams.get('monthOnly');
    const scope = searchParams.get('scope'); // New scope filter

    const whereConditions: Prisma.DiaryEntryWhereInput = {
      AND: [],
    };

    // --- Hiding Filters ---
    if (hiddenEntryIds.length > 0) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ id: { notIn: hiddenEntryIds } });
    }
    if (hiddenUserIds.length > 0) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ userId: { notIn: hiddenUserIds } });
    }

    // --- Scope and Privacy Filters ---
    if (userId) {
      // Logged-in user
      if (scope === 'me') {
        (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ userId: userId });
      } else if (scope === 'friends') {
        (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ userId: { in: friendIds } });
        // Also ensure we only see PUBLIC or FRIENDS_ONLY posts from friends
        (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ privacyLevel: { in: [PrivacyLevel.PUBLIC, PrivacyLevel.FRIENDS_ONLY] } });
      } else {
        // Default scope ('all') for logged-in user
        (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
          OR: [
            { privacyLevel: PrivacyLevel.PUBLIC },
            { userId: userId },
            { privacyLevel: PrivacyLevel.FRIENDS_ONLY, userId: { in: friendIds } },
          ],
        });
      }
    } else {
      // Guest user can only see public posts, regardless of scope
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ privacyLevel: PrivacyLevel.PUBLIC });
    }

    // --- Other Filters ---
    if (query && query.trim() !== '') {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ OR: [{ title: { contains: query } }, { description: { contains: query } }] });
    }
    if (categoryId) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ categoryId: categoryId });
    }
    if (minLat && maxLat && minLng && maxLng) {
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({
        latitude: { gte: parseFloat(minLat), lte: parseFloat(maxLat) },
        longitude: { gte: parseFloat(minLng), lte: parseFloat(maxLng) },
      });
    }
    if (startDate || endDate) {
      const takenAtCondition: Prisma.DateTimeFilter = {};
      if (startDate) takenAtCondition.gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
      if (endDate) takenAtCondition.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      (whereConditions.AND as Prisma.DiaryEntryWhereInput[]).push({ takenAt: takenAtCondition });
    }

    let entries = await prisma.diaryEntry.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, userId: true, title: true, description: true, imageUrl: true, latitude: true, longitude: true, takenAt: true, createdAt: true, privacyLevel: true, categoryId: true,
        user: { select: { id: true, username: true, iconUrl: true } },
        category: { select: { id: true, name: true } },
        likes: true,
      },
    });

    let processedEntries = entries.map(entry => ({
      ...entry,
      isFriend: userId ? friendIds.includes(entry.userId) : false,
      likesCount: entry.likes.length,
      isLikedByCurrentUser: userId ? entry.likes.some(like => like.userId === userId) : false,
    }));

    if (timeOfDay && timeOfDay !== 'all') {
      processedEntries = processedEntries.filter((entry: DiaryEntry) => {
        const jstDate = new Date(new Date(entry.takenAt).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        const hour = jstDate.getHours();
        switch (timeOfDay) {
          case 'morning': return hour >= 5 && hour < 10;
          case 'daytime': return hour >= 10 && hour < 16;
          case 'night': return hour >= 16 || hour < 5;
          default: return true;
        }
      });
    }

    if (monthOnlyParam) {
      const targetMonths = monthOnlyParam.split(',').map(month => parseInt(month.trim(), 10)).filter(month => !isNaN(month) && month >= 1 && month <= 12);
      if (targetMonths.length > 0) {
        processedEntries = processedEntries.filter((entry: DiaryEntry) => {
          const jstDate = new Date(new Date(entry.takenAt).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
          return targetMonths.includes(jstDate.getMonth() + 1);
        });
      }
    }

    return NextResponse.json({ entries: processedEntries }, { status: 200 });
  } catch (error) {
    console.error('Diary search error:', error);
    return NextResponse.json({ message: '日記の検索中にエラーが発生しました' }, { status: 500 });
  }
}
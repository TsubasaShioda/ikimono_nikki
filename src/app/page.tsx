'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { debounce } from 'lodash';
import Sidebar, { Filters } from '@/components/FilterSidebar';
import Image from 'next/image';

const MapComponent = dynamic(
  () => import('../components/MapComponent'),
  { ssr: false }
);

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';
  takenAt: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    iconUrl: string | null;
  };
  likesCount: number;
  isLikedByCurrentUser: boolean;
  isFriend: boolean;
}

interface RawDiaryEntry extends Omit<DiaryEntry, 'likesCount' | 'isLikedByCurrentUser'> {
  likes: { userId: string }[];
}

interface CurrentUser {
  id: string;
  iconUrl: string | null;
}

const MAP_VIEW_STATE_KEY = 'mapViewState';
const DEFAULT_ZOOM = 13;
const TOKYO_COORDS: [number, number] = [35.6895, 139.6917];

export default function HomePage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [mapView, setMapView] = useState<{ center: [number, number]; zoom: number } | null>(null);

  const [filters, setFilters] = useState<Filters>({
    q: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    timeOfDay: 'all',
    monthOnly: null,
  });

  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);

  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize map view from sessionStorage or user location
  useEffect(() => {
    if (isClient) {
      try {
        const savedView = sessionStorage.getItem(MAP_VIEW_STATE_KEY);
        if (savedView) {
          const { lat, lng, zoom } = JSON.parse(savedView);
          setMapView({ center: [lat, lng], zoom });
          return;
        }
      } catch (e) {
        console.error("Failed to parse map view state from sessionStorage", e);
      }

      // If no saved view, get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMapView({
              center: [position.coords.latitude, position.coords.longitude],
              zoom: DEFAULT_ZOOM,
            });
          },
          () => {
            setError('現在地を取得できませんでした。東京を表示します。');
            setMapView({ center: TOKYO_COORDS, zoom: DEFAULT_ZOOM });
          }
        );
      } else {
        setError('お使いのブラウザは位置情報に対応していません。東京を表示します。');
        setMapView({ center: TOKYO_COORDS, zoom: DEFAULT_ZOOM });
      }
    }
  }, [isClient]);

  // Fetch current user
  useEffect(() => {
    if (isClient) {
      const fetchCurrentUser = async () => {
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        } catch (err) {
          console.error('Failed to fetch current user:', err);
          setCurrentUser(null);
        }
      };
      fetchCurrentUser();
    }
  }, [isClient]);

  // Fetch entries based on the unified filters state
  const fetchEntries = useCallback(async () => {
    if (!isClient) return;

    setSearchLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.timeOfDay && filters.timeOfDay !== 'all') {
        params.append('timeOfDay', filters.timeOfDay);
      }
      if (mapBounds) {
        params.append('minLat', mapBounds.minLat.toString());
        params.append('maxLat', mapBounds.maxLat.toString());
        params.append('minLng', mapBounds.minLng.toString());
        params.append('maxLng', mapBounds.maxLng.toString());
      }

      const url = `/api/entries/search?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const processedEntries = data.entries.map((entry: RawDiaryEntry) => ({
          ...entry,
          likesCount: entry.likes.length,
          isLikedByCurrentUser: currentUser
            ? entry.likes.some((like: { userId: string }) => like.userId === currentUser.id)
            : false,
        }));
        setEntries(processedEntries);
      } else {
        setError(data.message || '日記の取得に失敗しました。');
      }
    } catch (err) {
      console.error('Fetch entries error:', err);
      setError('日記の取得中に予期せぬエラーが発生しました。');
    } finally {
      setSearchLoading(false);
      setInitialLoading(false);
    }
  }, [isClient, currentUser, filters, mapBounds]);

  const debouncedFetchEntries = useMemo(() => debounce(fetchEntries, 500), [fetchEntries]);

  // Trigger fetchEntries when filters change
  useEffect(() => {
    debouncedFetchEntries();
  }, [filters, mapBounds, debouncedFetchEntries]);

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const handleFlyTo = (coords: [number, number]) => {
    setFlyToCoords(coords);
  };
  
  const debouncedHandleBoundsChange = useMemo(
    () => debounce((bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => {
      setMapBounds(bounds);
    }, 300),
    []
  );

  const handleBoundsChange = useCallback(
    (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => {
      debouncedHandleBoundsChange(bounds);
    },
    [debouncedHandleBoundsChange]
  );

  const debouncedHandleMapViewChange = useMemo(
    () => debounce((newView: { center: [number, number], zoom: number }) => {
      try {
        sessionStorage.setItem(MAP_VIEW_STATE_KEY, JSON.stringify({ lat: newView.center[0], lng: newView.center[1], zoom: newView.zoom }));
      } catch (e) {
        console.error("Failed to save map view state to sessionStorage", e);
      }
    }, 500),
    []
  );

  const handleResetBounds = () => {
      setMapBounds(null);
  };

  const handleLogout = async () => {
    if (window.confirm('本当にログアウトしますか？')) {
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
        });

        if (response.ok) {
          setCurrentUser(null);
          debouncedFetchEntries();
        } else {
          alert('ログアウトに失敗しました。');
        }
      } catch (err) {
        console.error('Logout error:', err);
        alert('ログアウト中にエラーが発生しました。');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('本当にこの日記を削除しますか？')) {
      try {
        const response = await fetch(`/api/entries/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setEntries(entries.filter(entry => entry.id !== id));
          alert('日記が正常に削除されました。');
        }
        else {
          const data = await response.json();
          alert(data.message || '日記の削除に失敗しました。');
        }
      } catch (err) {
        console.error('Delete entry error:', err);
        alert('日記の削除中にエラーが発生しました。');
      }
    }
  };

  const onLikeToggle = async (entryId: string) => {
    if (!currentUser) {
      alert('「いいね」するにはログインが必要です。');
      router.push('/auth/login');
      return;
    }

    const originalEntries = [...entries];
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    // Optimistic update
    const updatedEntries = entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          likesCount: e.isLikedByCurrentUser ? e.likesCount - 1 : e.likesCount + 1,
          isLikedByCurrentUser: !e.isLikedByCurrentUser,
        };
      }
      return e;
    });
    setEntries(updatedEntries);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diaryEntryId: entryId }),
      });

      if (!response.ok) {
        // Revert on failure
        setEntries(originalEntries);
        const data = await response.json();
        alert(data.message || '「いいね」に失敗しました。');
      }
    } catch (error) {
      // Revert on error
      setEntries(originalEntries);
      alert('「いいね」中にエラーが発生しました。');
      console.error('Like toggle error:', error);
    }
  };

  const handleHideEntry = (entryId: string) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
  };

  const handleHideUser = (userId: string) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.userId !== userId));
  };

  if (!isClient || !mapView || initialLoading) {
    return <div className="min-h-screen flex items-center justify-center">地図を読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center py-4 px-6 bg-white shadow-md z-30">
        <h1 className="text-3xl font-bold text-gray-900">生き物日記マップ</h1>
        <nav className="flex items-center space-x-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            フィルター
          </button>

          {currentUser ? (
            <>
              <Link href="/entries/new" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                新しい日記を投稿
              </Link>
              <Link href="/entries/my" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                自分の日記
              </Link>
              <Link href="/friends" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                フレンド管理
              </Link>
              <Link href="/settings" className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center hover:opacity-80 transition-opacity">
                {currentUser.iconUrl ? (
                  <Image src={currentUser.iconUrl} alt="プロフィールアイコン" width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <Image src="/default-avatar.svg" alt="デフォルトアイコン" width={40} height={40} className="w-full h-full object-cover" />
                )}
              </Link>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md">
                ログイン
              </Link>
              <Link href="/auth/register" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                新規登録
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main content area */}
      <main className="flex-grow relative z-10" style={{ height: 'calc(100vh - 88px)' }}>
        {/* Map Component takes up the full space */}
        <MapComponent 
            center={mapView.center}
            zoom={mapView.zoom}
            flyToCoords={flyToCoords}
            entries={entries} 
            currentUserId={currentUser?.id || null} 
            onDelete={handleDelete} 
            onLikeToggle={onLikeToggle}
            onBoundsChange={handleBoundsChange}
            onMapViewChange={debouncedHandleMapViewChange}
            onHideEntry={handleHideEntry}
            onHideUser={handleHideUser}
        />

        {/* エラーメッセージの表示 */}
        {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg">
                {error}
            </div>
        )}
        
        {/* Area selection reset button */}
        {mapBounds && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <button
              onClick={handleResetBounds}
              className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-lg hover:bg-blue-600"
            >
              エリア選択を解除
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {searchLoading && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-md shadow-lg">
                <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>検索中...</span>
                </div>
            </div>
        )}
      </main>

      {/* Sidebar and overlay */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onApplyFilters={handleApplyFilters}
        onFlyTo={handleFlyTo}
        initialFilters={{
          q: filters.q,
          categoryId: filters.categoryId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          timeOfDay: filters.timeOfDay,
          monthOnly: filters.monthOnly,
        }}
      />
      {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
}

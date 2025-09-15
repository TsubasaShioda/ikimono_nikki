'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { debounce } from 'lodash';
import Sidebar from '@/components/FilterSidebar';
import Image from 'next/image';
import AlbumModal from '@/components/AlbumModal';
import Header from '@/components/Header';
import FloatingActionButton from '@/components/FloatingActionButton'; // ★ FABをインポート
import MyDiaryActionButton from '@/components/MyDiaryActionButton'; // ★ MyDiary FABをインポート
import AlbumActionButton from '@/components/AlbumActionButton'; // ★ Album FABをインポート

const MapComponent = dynamic(
  () => import('../components/MapComponent'),
  { ssr: false }
);

// (中略... インターフェース定義は変更なし)
interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC' | 'PUBLIC_ANONYMOUS';
  takenAt: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    iconUrl: string | null;
  };
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser: boolean;
  isFriend: boolean;
}

interface RawDiaryEntry extends Omit<DiaryEntry, 'likesCount' | 'isLikedByCurrentUser' | 'commentsCount'> {
  likes: { userId: string }[];
  _count: { comments: number };
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

  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [bookmarkTargetId, setBookmarkTargetId] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    q: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    timeOfDay: 'all',
    monthOnly: null,
    scope: 'all',
  });

  const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);

  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMapView({ center: [position.coords.latitude, position.coords.longitude], zoom: DEFAULT_ZOOM });
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
      if (filters.scope && filters.scope !== 'all') {
        params.append('scope', filters.scope);
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
          commentsCount: entry._count.comments,
          isLikedByCurrentUser: currentUser ? entry.likes.some((like: { userId: string }) => like.userId === currentUser.id) : false,
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

  useEffect(() => {
    debouncedFetchEntries();
  }, [filters, mapBounds, debouncedFetchEntries]);

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  };

  const handleFlyTo = (coords: [number, number]) => {
    setFlyToCoords(coords);
  };
  
  const debouncedHandleBoundsChange = useMemo(() => debounce((bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => {
    setMapBounds(bounds);
  }, 300), []);

  const handleBoundsChange = useCallback((bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => {
    debouncedHandleBoundsChange(bounds);
  }, [debouncedHandleBoundsChange]);

  const debouncedHandleMapViewChange = useMemo(() => debounce((newView: { center: [number, number], zoom: number }) => {
    try {
      sessionStorage.setItem(MAP_VIEW_STATE_KEY, JSON.stringify({ lat: newView.center[0], lng: newView.center[1], zoom: newView.zoom }));
    } catch (e) {
      console.error("Failed to save map view state to sessionStorage", e);
    }
  }, 500), []);

  const handleLogout = useCallback(async () => {
    if (window.confirm('本当にログアウトしますか？')) {
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
          setCurrentUser(null);
          setFilters(prev => ({ ...prev, scope: 'all' }));
          debouncedFetchEntries();
        } else {
          alert('ログアウトに失敗しました。');
        }
      } catch (err) {
        console.error('Logout error:', err);
        alert('ログアウト中にエラーが発生しました。');
      }
    }
  }, [debouncedFetchEntries]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('本当にこの日記を削除しますか？')) {
      try {
        const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setEntries(prevEntries => prevEntries.filter(entry => entry.id !== id));
          alert('日記が正常に削除されました。');
        } else {
          const data = await response.json();
          alert(data.message || '日記の削除に失敗しました。');
        }
      } catch (err) {
        console.error('Delete entry error:', err);
        alert('日記の削除中にエラーが発生しました。');
      }
    }
  }, []);

  const onLikeToggle = useCallback(async (entryId: string) => {
    if (!currentUser) {
      alert('「いいね」するにはログインが必要です。');
      router.push('/auth/login');
      return;
    }
    const originalEntries = [...entries];
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const updatedEntries = entries.map(e => {
      if (e.id === entryId) {
        return { ...e, likesCount: e.isLikedByCurrentUser ? e.likesCount - 1 : e.likesCount + 1, isLikedByCurrentUser: !e.isLikedByCurrentUser };
      }
      return e;
    });
    setEntries(updatedEntries);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaryEntryId: entryId }),
      });
      if (!response.ok) {
        setEntries(originalEntries);
        const data = await response.json();
        alert(data.message || '「いいね」に失敗しました。');
      }
    } catch (error) {
      setEntries(originalEntries);
      alert('「いいね」中にエラーが発生しました。');
      console.error('Like toggle error:', error);
    }
  }, [currentUser, entries, router]);

  const handleHideEntry = useCallback((entryId: string) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
  }, []);

  const handleHideUser = useCallback((userId: string) => {
    setEntries(prevEntries => prevEntries.filter(entry => entry.userId !== userId));
  }, []);

  const onOpenBookmarkModal = (diaryEntryId: string) => {
    if (!currentUser) {
      alert('アルバム機能を利用するにはログインが必要です。');
      router.push('/auth/login');
      return;
    }
    setBookmarkTargetId(diaryEntryId);
    setIsAlbumModalOpen(true);
  };

  const handleCloseAlbumModal = () => {
    setIsAlbumModalOpen(false);
    setBookmarkTargetId(null);
  };

  const handleBookmark = async (albumId: string) => {
    if (!bookmarkTargetId) return;
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaryEntryId: bookmarkTargetId, albumId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'アルバムへの追加に失敗しました');
      }
      alert('アルバムに追加しました！');
      handleCloseAlbumModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  if (!isClient || !mapView || initialLoading) {
    return <div className="min-h-screen flex items-center justify-center">地図を読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <main className="flex-grow relative z-10" style={{ height: 'calc(100vh - 88px)' }}>
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
            onOpenBookmarkModal={onOpenBookmarkModal}
        />
        {error && <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg">{error}</div>}
        {searchLoading && <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-md shadow-lg"><div className="flex items-center space-x-2"><svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>検索中...</span></div></div>}
      </main>

      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onApplyFilters={handleApplyFilters}
        onFlyTo={handleFlyTo}
        isLoggedIn={!!currentUser}
        initialFilters={filters}
      />
      {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={() => setIsSidebarOpen(false)}></div>}

      <AlbumModal 
        isOpen={isAlbumModalOpen}
        onClose={handleCloseAlbumModal}
        diaryEntryId={bookmarkTargetId}
        onBookmark={handleBookmark}
      />

      {/* ★ FABをここに追加 (ログイン時のみ) */}
      {currentUser && (
        <>
          <FloatingActionButton />
          <MyDiaryActionButton />
          <AlbumActionButton />
        </>
      )}
    </div>
  );
}

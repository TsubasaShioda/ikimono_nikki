'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { debounce } from 'lodash';
import FilterSidebar from '../components/FilterSidebar'; // Import the sidebar

// Dynamically import MapComponent
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
  user: { // Add user details
    id: string;
    username: string;
    iconUrl: string | null;
  };
}

interface CurrentUser {
  id: string;
  iconUrl: string | null;
}

export default function HomePage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Unified filter state
  const [filters, setFilters] = useState({
    q: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    timeOfDay: 'all',
    bounds: null as { minLat: number; maxLat: number; minLng: number; maxLng: number } | null,
  });

  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch current user
  useEffect(() => {
    if (isClient) {
      const fetchCurrentUser = async () => {
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user);
          } else if (response.status === 401) {
            router.push('/auth/login');
          }
        } catch (err) {
          console.error('Failed to fetch current user:', err);
        }
      };
      fetchCurrentUser();
    }
  }, [isClient, router]);

  // Fetch user location
  useEffect(() => {
    if (isClient && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          setError('現在地を取得できませんでした。');
          setUserLocation([35.6895, 139.6917]); // Default to Tokyo
        }
      );
    } else if (isClient) {
      setError('お使いのブラウザは位置情報に対応していません。');
      setUserLocation([35.6895, 139.6917]); // Default to Tokyo
    }
  }, [isClient]);

  // Fetch entries based on the unified filters state
  const fetchEntries = useCallback(debounce(async (currentFilters: typeof filters) => {
    if (!isClient || currentUser === undefined) return;

    setSearchLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (currentFilters.q) params.append('q', currentFilters.q);
      if (currentFilters.categoryId) params.append('categoryId', currentFilters.categoryId);
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);
      if (currentFilters.timeOfDay && currentFilters.timeOfDay !== 'all') {
        params.append('timeOfDay', currentFilters.timeOfDay);
      }
      if (currentFilters.bounds) {
        params.append('minLat', currentFilters.bounds.minLat.toString());
        params.append('maxLat', currentFilters.bounds.maxLat.toString());
        params.append('minLng', currentFilters.bounds.minLng.toString());
        params.append('maxLng', currentFilters.bounds.maxLng.toString());
      }

      const url = `/api/entries/search?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setEntries(data.entries);
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
  }, 500), [isClient, currentUser]);

  // Trigger fetchEntries when filters change
  useEffect(() => {
    if(currentUser !== undefined) {
        fetchEntries(filters);
    }
  }, [filters, currentUser, fetchEntries]);

  const handleApplyFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters,
    }));
  };
  
  const handleBoundsChange = (bounds: any) => {
      setFilters(prev => ({ ...prev, bounds }));
  };

  const handleResetBounds = () => {
      setFilters(prev => ({ ...prev, bounds: null }));
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/auth/login');
      } else {
        alert('ログアウトに失敗しました。');
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('ログアウト中にエラーが発生しました。');
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

  if (!isClient || initialLoading || userLocation === null) {
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
          <Link href="/entries/new" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            新しい日記を投稿
          </Link>
          <Link href="/entries/my" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            自分の日記
          </Link>
          <Link href="/friends" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            フレンド管理
          </Link>
          {currentUser && (
            <Link href="/settings" className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center hover:opacity-80 transition-opacity">
              {currentUser.iconUrl ? (
                <img src={currentUser.iconUrl} alt="プロフィールアイコン" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
              )}
            </Link>
          )}
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            ログアウト
          </button>
        </nav>
      </header>

      {/* Main content area */}
      <main className="flex-grow relative z-10" style={{ height: 'calc(100vh - 88px)' }}>
        {/* Map Component takes up the full space */}
        <MapComponent 
            userLocation={userLocation} 
            entries={entries} 
            error={error} 
            currentUserId={currentUser?.id || null} 
            onDelete={handleDelete} 
            onBoundsChange={handleBoundsChange} 
        />
        
        {/* Area selection reset button */}
        {filters.bounds && (
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
      <FilterSidebar 
        isSidebarOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={filters}
      />
      {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={() => setIsSidebarOpen(false)}></div>}
    </div>
  );
}

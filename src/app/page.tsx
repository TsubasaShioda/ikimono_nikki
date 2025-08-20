'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { debounce } from 'lodash'; // lodashのdebounceをインポート

// Dynamically import MapComponent
const MapComponent = dynamic(
  () => import('../components/MapComponent'),
  { ssr: false } // Disable server-side rendering
);

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'; // Use PrivacyLevel enum
  takenAt: string;
  createdAt: string;
  userId: string; // Ensure userId is part of the interface
}

interface CurrentUser {
  id: string;
  iconUrl: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function HomePage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // 初回読み込み用
  const [searchLoading, setSearchLoading] = useState(false); // 検索中用
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // 検索クエリのstate
  const [categories, setCategories] = useState<Category[]>([]); // カテゴリ一覧のstate
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // 選択されたカテゴリIDのstate
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch current user info (ID and icon)
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
            // If not authenticated, redirect to login
            if (response.status === 401) {
              router.push('/auth/login');
            }
          }
        } catch (err) {
          console.error('FRONTEND DEBUG: Failed to fetch current user:', err);
          setCurrentUser(null);
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
        (err) => {
          console.error('Geolocation error:', err);
          setError('現在地を取得できませんでした。デフォルトの位置を表示します。');
          setUserLocation([35.6895, 139.6917]); // Default to Tokyo
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else if (isClient) {
      setError('お使いのブラウザは位置情報に対応していません。デフォルトの位置を表示します。');
      setUserLocation([35.6895, 139.6917]); // Default to Tokyo
    }
  }, [isClient]);

  // Fetch categories
  useEffect(() => {
    if (isClient) {
      const fetchCategories = async () => {
        try {
          const response = await fetch('/api/categories');
          const data = await response.json();
          if (response.ok) {
            setCategories(data.categories);
          } else {
            console.error('Failed to fetch categories:', data.message);
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
      };
      fetchCategories();
    }
  }, [isClient]);

  // Fetch diary entries based on search query or all entries
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchEntries = useCallback(
    debounce(async (query: string, categoryId: string) => {
      if (!isClient || currentUser === undefined) return;

      setSearchLoading(true); // 検索中はsearchLoadingをtrueに
      setError('');
      try {
        let url = '/api/entries';
        const params = new URLSearchParams();
        if (query) {
          params.append('q', query);
        }
        if (categoryId) {
          params.append('categoryId', categoryId);
        }

        if (params.toString()) {
          url = `/api/entries/search?${params.toString()}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
          setEntries(data.entries);
        } else {
          setError(data.message || '日記の取得に失敗しました。');
        }
      } catch (err) {
        console.error('FRONTEND DEBUG: Fetch entries error:', err);
        setError('日記の取得中に予期せぬエラーが発生しました。');
      } finally {
        setSearchLoading(false); // 検索終了後はsearchLoadingをfalseに
        setInitialLoading(false); // 初回読み込みも完了
      }
    }, 300), // 300ms debounce
    [isClient, currentUser] // Dependencies for useCallback
  );

  useEffect(() => {
    fetchEntries(searchQuery, selectedCategoryId);
  }, [searchQuery, selectedCategoryId, fetchEntries]);


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
        } else {
          const data = await response.json();
          alert(data.message || '日記の削除に失敗しました。');
        }
      } catch (err) {
        console.error('Delete entry error:', err);
        alert('日記の削除中にエラーが発生しました。');
      }
    }
  };

  if (!isClient || initialLoading || userLocation === null) { // initialLoadingを使用
    return <div className="min-h-screen flex items-center justify-center">地図を読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">エラー: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-b-lg mb-4">
        <h1 className="text-3xl font-bold text-gray-900">生き物日記マップ</h1>
        <nav className="flex items-center space-x-4">
          <div className="relative flex items-center"> {/* 検索バーとローディングスピナーを囲む */}
            <input
              type="search"
              placeholder="日記を検索..."
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 pr-10" // 右側にパディングを追加
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchLoading && ( // 検索中のスピナー
              <svg className="animate-spin h-5 w-5 text-gray-500 absolute right-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
          {/* カテゴリ選択ドロップダウン */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">すべてのカテゴリ</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
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

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            ログアウト
          </button>
        </nav>
      </header>

      <MapComponent userLocation={userLocation} entries={entries} error={error} currentUserId={currentUser?.id || null} onDelete={handleDelete} />
    </div>
  );
}

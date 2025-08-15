'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

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
  isPublic: boolean;
  takenAt: string;
  createdAt: string;
  userId: string; // Ensure userId is part of the interface
}

interface CurrentUser {
  id: string;
  iconUrl: string | null;
}

export default function HomePage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
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

  // Fetch diary entries - NOW DEPENDS ON currentUser
  useEffect(() => {
    // We fetch entries only when we know who the user is (or if they are not logged in)
    if (isClient && currentUser !== undefined) {
      const fetchEntries = async () => {
        try {
          const response = await fetch('/api/entries');
          const data = await response.json();

          if (response.ok) {
            setEntries(data.entries);
          } else {
            setError(data.message || '日記の取得に失敗しました。');
          }
        } catch (err) {
          console.error('FRONTEND DEBUG: Fetch entries error (inside useEffect):', err);
          setError('日記の取得中に予期せぬエラーが発生しました。');
        } finally {
          setLoading(false);
        }
      };

      fetchEntries();
    }
  }, [isClient, currentUser]);

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

  if (!isClient || loading || userLocation === null) {
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
          <Link href="/entries/new" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            新しい日記を投稿
          </Link>
          <Link href="/entries/my" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            自分の日記
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

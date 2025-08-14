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

export default function HomePage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // State to store current user ID
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch current user ID
  useEffect(() => {
    if (isClient) {
      const fetchCurrentUser = async () => {
        try {
          // Assuming you have an API endpoint to get current user info
          const response = await fetch('/api/auth/me'); // This endpoint needs to be created
          if (response.ok) {
            const data = await response.json();
            setCurrentUserId(data.user.id);
          } else {
            // Not logged in or token invalid, clear user ID
            setCurrentUserId(null);
          }
        } catch (err) {
          console.error('Failed to fetch current user:', err);
          setCurrentUserId(null);
        }
      };
      fetchCurrentUser();
    }
  }, [isClient]);


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

  // Fetch diary entries
  useEffect(() => {
    if (isClient) {
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
          console.error('Fetch entries error:', err);
          setError('日記の取得中に予期せぬエラーが発生しました。');
        } finally {
          setLoading(false);
        }
      };

      fetchEntries();
    }
  }, [isClient]);

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
        <nav className="space-x-4">
          <Link href="/entries/new" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            新しい日記を投稿
          </Link>
          <Link href="/entries/my" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            自分の日記
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            ログアウト
          </button>
        </nav>
      </header>

      <MapComponent userLocation={userLocation} entries={entries} error={error} currentUserId={currentUserId} onDelete={handleDelete} />
    </div>
  );
}
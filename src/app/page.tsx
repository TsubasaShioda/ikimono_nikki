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
  userId: string;
}

export default function HomePage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false); // New state for client-side rendering
  const router = useRouter();

  useEffect(() => {
    setIsClient(true); // Set to true once component mounts on client
  }, []);

  // Fetch user location
  useEffect(() => {
    if (isClient && navigator.geolocation) { // Only run if on client
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
    } else if (isClient) { // If not geolocation supported but on client
      setError('お使いのブラウザは位置情報に対応していません。デフォルトの位置を表示します。');
      setUserLocation([35.6895, 139.6917]); // Default to Tokyo
    }
  }, [isClient]); // Depend on isClient

  // Fetch diary entries
  useEffect(() => {
    if (isClient) { // Only run if on client
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
  }, [isClient]); // Depend on isClient

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

  if (!isClient || loading || userLocation === null) { // Check isClient first
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
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            ログアウト
          </button>
        </nav>
      </header>

      <MapComponent userLocation={userLocation} entries={entries} error={error} />
    </div>
  );
}
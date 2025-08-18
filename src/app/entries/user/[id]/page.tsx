'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
// import dynamic from 'next/dynamic'; // MapComponentを削除するので不要

// Dynamically import MapComponent (削除)
// const MapComponent = dynamic(
//   () => import('../../../../components/MapComponent'), // Adjust path as needed
//   { ssr: false } // Disable server-side rendering
// );

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
  userId: string;
}

interface UserProfile {
  id: string;
  username: string;
  iconUrl: string | null;
  description?: string | null;
}

export default function UserEntriesPage() {
  const params = useParams();
  const targetUserId = params.id as string; // User ID from URL

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true); // Separate loading state for entries
  const [loadingUser, setLoadingUser] = useState(true); // Separate loading state for user profile
  const [error, setError] = useState('');
  // const [userLocation, setUserLocation] = useState<[number, number] | null>(null); // MapComponentを削除するので不要
  const [isClient, setIsClient] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // To check if current user is owner or friend
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null); // To store target user's profile

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch current user ID
  useEffect(() => {
    if (isClient) {
      const fetchCurrentUser = async () => {
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            setCurrentUserId(data.user.id);
          } else {
            setCurrentUserId(null);
          }
        } catch (err) {
          console.error('FRONTEND DEBUG: Failed to fetch current user:', err);
          setCurrentUserId(null);
        }
      };
      fetchCurrentUser();
    }
  }, [isClient]);

  // Fetch target user's profile
  useEffect(() => {
    if (isClient && targetUserId) {
      const fetchTargetUser = async () => {
        setLoadingUser(true);
        try {
          const response = await fetch(`/api/users/${targetUserId}`);
          const data = await response.json();
          if (response.ok) {
            setTargetUser(data.user);
          } else {
            setError(data.message || 'ユーザー情報の取得に失敗しました。');
          }
        } catch (err) {
          console.error('FRONTEND DEBUG: Failed to fetch target user:', err);
          setError('ユーザー情報の取得中に予期せぬエラーが発生しました。');
        } finally {
          setLoadingUser(false);
        }
      };
      fetchTargetUser();
    }
  }, [isClient, targetUserId]);

  // Fetch user location (for map centering) (削除)
  // useEffect(() => {
  //   if (isClient && navigator.geolocation) {
  //     navigator.geolocation.getCurrentPosition(
  //       (position) => {
  //         setUserLocation([position.coords.latitude, position.coords.longitude]);
  //       },
  //       (err) => {
  //         console.error('Geolocation error:', err);
  //         setError('現在地を取得できませんでした。デフォルトの位置を表示します。');
  //         setUserLocation([35.6895, 139.6917]); // Default to Tokyo
  //       },
  //       { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  //     );S
  //   } else if (isClient) {
  //     setError('お使いのブラウザは位置情報に対応していません。デフォルトの位置を表示します。');
  //     setUserLocation([35.6895, 139.6917]); // Default to Tokyo
  //   }
  // }, [isClient]);

  // Fetch diary entries for the target user
  useEffect(() => {
    if (isClient && targetUserId && currentUserId !== undefined) { // Wait for currentUserId to be fetched
      const fetchEntries = async () => {
        setLoadingEntries(true); // Set loading true before fetching entries
        try {
          const response = await fetch(`/api/users/${targetUserId}/entries`); // Call new API
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
          setLoadingEntries(false);
        }
      };

      fetchEntries();
    }
  }, [isClient, targetUserId, currentUserId]); // Re-fetch when targetUserId or currentUserId changes

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

  if (!isClient || loadingEntries || loadingUser) { // userLocationのチェックを削除
    return <div className="min-h-screen flex items-center justify-center">日記を読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">エラー: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-b-lg mb-4">
        <h1 className="text-3xl font-bold text-gray-900">{targetUser ? `${targetUser.username}さんの日記一覧` : '日記一覧'}</h1>
        <nav className="space-x-4">
          <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            ホームに戻る
          </Link>
        </nav>
      </header>

      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        {entries.length === 0 ? (
          <p className="text-gray-600 text-center">まだ日記がありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {entry.imageUrl && (
                  <img src={entry.imageUrl} alt={entry.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">{entry.title}</h2>
                  <p className="text-gray-600 text-sm mb-2">{entry.description}</p>
                  <p className="text-gray-500 text-xs">
                    発見日時: {new Date(entry.takenAt).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-xs">
                    公開レベル: {entry.privacyLevel === 'PRIVATE' ? '非公開' : entry.privacyLevel === 'FRIENDS_ONLY' ? 'フレンドのみ' : '公開'}
                  </p>
                  {currentUserId === entry.userId && (
                    <div className="mt-4 flex space-x-2">
                      <Link href={`/entries/edit/${entry.id}`} className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
                        編集
                      </Link>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
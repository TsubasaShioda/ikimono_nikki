'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function MyEntriesPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchMyEntries = async () => {
      try {
        const response = await fetch('/api/entries/my');
        const data = await response.json();

        if (response.ok) {
          setEntries(data.entries);
        } else {
          setError(data.message || '自分の日記の取得に失敗しました。');
        }
      } catch (err) {
        console.error('Fetch my entries error:', err);
        setError('自分の日記の取得中に予期せぬエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchMyEntries();
  }, []);

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">自分の日記を読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">エラー: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-b-lg mb-4">
        <h1 className="text-3xl font-bold text-gray-900">自分の日記一覧</h1>
        <nav className="space-x-4">
          <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            全体マップに戻る
          </Link>
          <Link href="/entries/new" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            新しい日記を投稿
          </Link>
        </nav>
      </header>

      <div className="container mx-auto p-4">
        {entries.length === 0 ? (
          <p className="text-center text-gray-600">まだ日記がありません。新しい日記を投稿しましょう！</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{entry.title}</h3>
                {entry.imageUrl && (
                  <img src={entry.imageUrl} alt={entry.title} className="w-full h-32 object-cover rounded-md mb-2" />
                )}
                <p className="text-gray-700 text-sm mb-1">{entry.description || '説明なし'}</p>
                <p className="text-gray-500 text-xs">発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
                <p className="text-gray-500 text-xs">公開: {entry.isPublic ? 'はい' : 'いいえ'}</p>
                <div className="mt-2 flex space-x-2">
                  <Link href={`/entries/edit/${entry.id}`} className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                    編集
                  </Link>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
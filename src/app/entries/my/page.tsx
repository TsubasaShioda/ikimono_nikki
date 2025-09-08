'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PrivacyLevel } from '@/lib/types'; // Import the enum

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  privacyLevel: PrivacyLevel;
  takenAt: string;
  createdAt: string;
}

export default function MyEntriesPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  

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
              <div key={entry.id} className="bg-white rounded-lg shadow-sm flex flex-col">
                <Link href={`/entries/${entry.id}`} className="block hover:bg-gray-50 rounded-t-lg flex-grow">
                  {entry.imageUrl && (
                    <Image src={entry.imageUrl} alt={entry.title} width={320} height={128} className="object-cover rounded-t-md w-full h-40" />
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{entry.title}</h3>
                    <p className="text-gray-700 text-sm mb-1 line-clamp-2">{entry.description || '説明なし'}</p>
                    <p className="text-gray-500 text-xs">発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">公開設定: {entry.privacyLevel === 'PUBLIC' ? '公開' : entry.privacyLevel === 'FRIENDS_ONLY' ? 'フレンドのみ' : '非公開'}</p>
                  </div>
                </Link>
                <div className="p-4 border-t flex space-x-2 bg-gray-50 rounded-b-lg">
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

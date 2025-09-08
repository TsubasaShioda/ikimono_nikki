'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// This type should ideally be shared
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
}

export default function EntryDetailPage() {
  const params = useParams();
  const { id } = params;

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      const fetchEntry = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch(`/api/entries/${id}`);
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '日記の取得に失敗しました');
          }
          const data = await response.json();
          setEntry(data.entry);
        } catch (err) {
          setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        } finally {
          setLoading(false);
        }
      };
      fetchEntry();
    }
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">エラー: {error}</div>;
  }

  if (!entry) {
    return <div className="min-h-screen flex items-center justify-center">日記が見つかりません。</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
       <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">日記の詳細</h1>
          <div className="flex space-x-4">
            <Link href="/albums" className="text-blue-600 hover:underline">
              アルバムに戻る
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              マップに戻る
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">{entry.title}</h2>
            
            <div className="flex items-center space-x-4 mb-4 border-b pb-4">
                <Link href={`/entries/user/${entry.user.id}`} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    <Image 
                        src={entry.user.iconUrl || '/default-avatar.svg'}
                        alt={entry.user.username} 
                        width={40} 
                        height={40} 
                        className="rounded-full object-cover bg-gray-200"
                    />
                    <span className="font-semibold text-gray-800">{entry.user.username}</span>
                </Link>
            </div>

            {entry.imageUrl && (
                <div className="my-4">
                    <Image src={entry.imageUrl} alt={entry.title} width={800} height={600} className="w-full h-auto object-contain rounded-md" />
                </div>
            )}

            <div className="prose max-w-none text-gray-800">
                <p>{entry.description || '説明はありません。'}</p>
            </div>

            <div className="mt-6 pt-4 border-t text-sm text-gray-500 space-y-2">
                <p><strong>発見日時:</strong> {new Date(entry.takenAt).toLocaleString()}</p>
                <p><strong>投稿日時:</strong> {new Date(entry.createdAt).toLocaleString()}</p>
                <p><strong>公開範囲:</strong> {entry.privacyLevel === 'PUBLIC' ? '公開' : entry.privacyLevel === 'FRIENDS_ONLY' ? 'フレンドのみ' : '非公開'}</p>
            </div>
        </div>
      </main>
    </div>
  );
}

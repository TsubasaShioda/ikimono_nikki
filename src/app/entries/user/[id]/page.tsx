'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PrivacyLevel } from '@/lib/types';
import styles from '../../my/page.module.css'; // 「自分の日記」のスタイルを流用

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  privacyLevel: PrivacyLevel;
  takenAt: string;
  createdAt: string;
}

interface User {
    id: string;
    name: string | null;
    iconUrl: string | null;
}

export default function UserEntriesPage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const fetchUserEntries = async () => {
      setLoading(true);
      try {
        // ユーザー情報を取得
        const userRes = await fetch(`/api/users/${userId}`);
        if (!userRes.ok) {
            const errorData = await userRes.json();
            throw new Error(errorData.message || 'ユーザー情報の取得に失敗しました。');
        }
        const userData = await userRes.json();
        setTargetUser(userData.user);

        // ユーザーの日記を取得
        const entriesRes = await fetch(`/api/users/${userId}/entries`);
        if (!entriesRes.ok) {
            const errorData = await entriesRes.json();
            throw new Error(errorData.message || '日記の取得に失敗しました。');
        }
        const entriesData = await entriesRes.json();
        setEntries(entriesData.entries);

      } catch (err: any) {
        console.error('Fetch user entries error:', err);
        setError(err.message || 'データの取得中に予期せぬエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchUserEntries();
  }, [userId]);

  const getPrivacyLabel = (level: PrivacyLevel) => {
    switch (level) {
      case PrivacyLevel.PUBLIC: return '公開';
      case PrivacyLevel.FRIENDS_ONLY: return 'フレンドのみ';
      case PrivacyLevel.PUBLIC_ANONYMOUS: return '匿名で公開';
      case PrivacyLevel.PRIVATE: return '非公開';
      default: return '';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">エラー: {error}</div>;
  }

  return (
    <div className={styles.container}>
        <header className={styles.header}>
            <h1 className={styles.title}>{targetUser?.name || 'ユーザー'}さんの日記</h1>
        </header>

        {entries.length === 0 ? (
          <p className="text-center text-gray-600">このユーザーはまだ日記を投稿していません。</p>
        ) : (
          <div className={styles.grid}>
            {entries.map((entry) => (
              <Link href={`/entries/${entry.id}`} key={entry.id} className={styles.card}>
                {entry.imageUrl && (
                  <div className={styles.imageContainer}>
                    <Image src={entry.imageUrl} alt={entry.title} layout="fill" className={styles.image} />
                  </div>
                )}
                <div className={styles.content}>
                  <h3 className={styles.cardTitle}>{entry.title}</h3>
                  <p className={styles.cardDate}>発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
                  <p className={styles.cardDescription}>{entry.description || ''}</p>
                </div>
                <div className={styles.cardFooter}>
                    <span className={styles.privacy}>{getPrivacyLabel(entry.privacyLevel)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
            <button onClick={() => router.back()} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
                戻る
            </button>
        </div>
    </div>
  );
}

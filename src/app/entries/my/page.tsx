'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PrivacyLevel } from '@/lib/types';
import styles from './page.module.css';

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  privacyLevel: PrivacyLevel;
  takenAt: string;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

export default function MyEntriesPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- フィルター用のState --- //
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // カテゴリ一覧を取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories', error);
      }
    };
    fetchCategories();
  }, []);

  // 日記を取得するメインの関数
  const fetchMyEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('q', keyword);
      if (categoryId) params.append('categoryId', categoryId);

      const response = await fetch(`/api/entries/my?${params.toString()}`);
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
  }, [keyword, categoryId]);

  // フィルターが変更されたら日記を再取得
  useEffect(() => {
    const debounceFetch = setTimeout(() => {
        fetchMyEntries();
    }, 500); // 500msのデバウンス

    return () => clearTimeout(debounceFetch);
  }, [fetchMyEntries]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('本当にこの日記を削除しますか？')) {
      try {
        const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
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

  const getPrivacyLabel = (level: PrivacyLevel) => {
    switch (level) {
      case PrivacyLevel.PUBLIC: return '公開';
      case PrivacyLevel.FRIENDS_ONLY: return 'フレンドのみ';
      case PrivacyLevel.PUBLIC_ANONYMOUS: return '匿名で公開';
      case PrivacyLevel.PRIVATE: return '非公開';
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
        <header className={styles.header}>
            <h1 className={styles.title}>自分の日記</h1>
        </header>

        {/* --- フィルターバー --- */}
        <div className={styles.filterBar}>
            <input 
                type="text"
                placeholder="キーワードで検索..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className={styles.filterInput}
            />
            <select 
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={styles.filterSelect}
            >
                <option value="">すべてのカテゴリ</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>
        </div>

        {loading ? (
            <div className="text-center">日記を読み込み中...</div>
        ) : error ? (
            <div className="text-center text-red-500">エラー: {error}</div>
        ) : entries.length === 0 ? (
          <p className="text-center text-gray-600">該当する日記がありません。</p>
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
                    <div className={styles.actions}>
                        <Link href={`/entries/edit/${entry.id}`} className={`${styles.actionButton} ${styles.editButton}`} onClick={(e) => e.stopPropagation()}>編集</Link>
                        <button onClick={(e) => handleDelete(entry.id, e)} className={`${styles.actionButton} ${styles.deleteButton}`}>削除</button>
                    </div>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import CommentSection from '@/components/CommentSection';
import styles from './page.module.css';

const DetailMap = dynamic(() => import('@/components/DetailMap'), { 
  ssr: false, 
  loading: () => <p>地図を読み込み中...</p> 
});

// APIから返される生のデータ構造
interface RawDiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC' | 'PUBLIC_ANONYMOUS';
  takenAt: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    iconUrl: string | null;
  };
  likes: { userId: string }[]; // 生のlikesデータ
  _count: { comments: number }; // 生のcomments countデータ
}

// UIで使うための加工済みデータ構造
interface DiaryEntry extends Omit<RawDiaryEntry, 'likes' | '_count'> {
  isLikedByCurrentUser: boolean;
  likesCount: number;
  commentsCount: number;
}

interface CurrentUser {
  id: string;
}

export default function EntryDetailPage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch diary entry
  const fetchEntry = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/entries/${id}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '日記の取得に失敗しました');
      }
      const rawData: { entry: RawDiaryEntry } = await response.json();
      
      // データを加工してUI用Stateにセット
      const processedEntry: DiaryEntry = {
        ...rawData.entry,
        likesCount: rawData.entry.likes ? rawData.entry.likes.length : 0,
        commentsCount: rawData.entry._count ? rawData.entry._count.comments : 0,
        isLikedByCurrentUser: currentUser ? (rawData.entry.likes ? rawData.entry.likes.some(like => like.userId === currentUser.id) : false) : false,
      };
      setEntry(processedEntry);

    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]); // currentUserを依存配列に追加

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const getPrivacyLevelText = (level: DiaryEntry['privacyLevel']) => {
    switch (level) {
      case 'PUBLIC': return '公開';
      case 'FRIENDS_ONLY': return 'フレンドのみ';
      case 'PRIVATE': return '非公開';
      case 'PUBLIC_ANONYMOUS': return 'フレンド以外には匿名で公開';
      default: return '不明';
    }
  };

  const onLikeToggle = useCallback(async () => {
    if (!currentUser) {
      alert('「いいね」するにはログインが必要です。');
      router.push('/auth/login');
      return;
    }
    if (!entry) return;

    const originalIsLiked = entry.isLikedByCurrentUser;
    const originalLikesCount = entry.likesCount;

    // Optimistic update
    setEntry(prev => prev ? {
      ...prev,
      isLikedByCurrentUser: !originalIsLiked,
      likesCount: originalIsLiked ? originalLikesCount - 1 : originalLikesCount + 1
    } : null);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diaryEntryId: entry.id }),
      });
      if (!response.ok) {
        // Revert if API call fails
        setEntry(prev => prev ? {
          ...prev,
          isLikedByCurrentUser: originalIsLiked,
          likesCount: originalLikesCount
        } : null);
        const data = await response.json();
        alert(data.message || '「いいね」に失敗しました。');
      }
    } catch (error) {
      setEntry(prev => prev ? {
        ...prev,
        isLikedByCurrentUser: originalIsLiked,
        likesCount: originalLikesCount
      } : null);
      alert('「いいね」中にエラーが発生しました。');
      console.error('Like toggle error:', error);
    }
  }, [currentUser, entry, router]);

  const handleDelete = useCallback(async () => {
    if (window.confirm('本当にこの日記を削除しますか？')) {
      try {
        const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
        if (response.ok) {
          alert('日記が正常に削除されました。');
          router.push('/entries/my'); // Redirect to my entries page
        } else {
          const data = await response.json();
          alert(data.message || '日記の削除に失敗しました。');
        }
      } catch (err) {
        console.error('Delete entry error:', err);
        alert('日記の削除中にエラーが発生しました。');
      }
    }
  }, [id, router]);

  if (loading) {
    return <div className={styles.loadingErrorContainer}>読み込み中...</div>;
  }

  if (error) {
    return <div className={styles.loadingErrorContainer}>エラー: {error}</div>;
  }

  if (!entry) {
    return <div className={styles.loadingErrorContainer}>日記が見つかりません。</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.notebook}>
        <div className={styles.spiral}></div>
        <div className={styles.contentArea}>
          <h1 className={styles.title}>{entry.title}</h1>

          <div className={styles.metaInfo}>
            <Link href={`/entries/user/${entry.user.id}`} className={styles.userInfo}>
              <Image 
                  src={entry.user.iconUrl || '/default-avatar.svg'}
                  alt={entry.user.username} 
                  width={40} 
                  height={40} 
                  className={styles.userIcon}
              />
              <span className={styles.username}>{entry.user.username}</span>
            </Link>
            <div className={styles.datePrivacy}>
              <p>発見日時: {new Date(entry.takenAt).toLocaleString()}</p>
              <p>投稿日時: {new Date(entry.createdAt).toLocaleString()}</p>
              <p>公開範囲: {getPrivacyLevelText(entry.privacyLevel)}</p>
            </div>
          </div>

          {entry.imageUrl && (
            <div className={styles.imageContainer}>
              <Image src={entry.imageUrl} alt={entry.title} width={800} height={600} className={styles.image} />
            </div>
          )}

          <div className={styles.description}>
            <p>{entry.description || '説明はありません。'}</p>
          </div>

          <div className={styles.mapContainer}>
            <DetailMap latitude={entry.latitude} longitude={entry.longitude} />
          </div>

          <CommentSection 
            entryId={entry.id} 
            currentUserId={currentUser?.id || null} 
            entryAuthorId={entry.userId} 
            onCommentPosted={fetchEntry} // コメント投稿後に日記データを再取得
          />
        </div>

        <div className={styles.actionButtons}>
          <Link href="/" className={`${styles.actionButton} ${styles.backButton}`}>マップに戻る</Link>
          {currentUser && currentUser.id === entry.userId && (
            <>
              <Link href={`/entries/edit/${entry.id}`} className={`${styles.actionButton} ${styles.editButton}`}>編集</Link>
              <button onClick={handleDelete} className={`${styles.actionButton} ${styles.deleteButton}`}>削除</button>
            </>
          )}
          <button onClick={onLikeToggle} className={`${styles.actionButton} ${entry.isLikedByCurrentUser ? styles.editButton : styles.backButton}`}>
            {entry.isLikedByCurrentUser ? `いいね済み (${entry.likesCount ?? 0})` : `いいね (${entry.likesCount ?? 0})`}
          </button>
        </div>
      </div>
    </div>
  );
}
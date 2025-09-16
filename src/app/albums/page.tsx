'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

// Types should ideally be shared from a central types file
interface BookmarkAlbum {
  id: string;
  name: string;
  _count: { bookmarks: number }; // ブックマーク数を追加
  // 代表画像URLを追加 (APIが返すことを想定)
  representativeImageUrl?: string | null;
}

interface DiaryEntry {
  id: string;
  title: string;
  imageUrl: string | null;
  user: {
    username: string;
  };
}

interface Bookmark {
  id: string;
  diaryEntry: DiaryEntry | null; // diaryEntryがnullの可能性を考慮
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<BookmarkAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<BookmarkAlbum | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [error, setError] = useState('');

  // State for creating a new album
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  // State for inline editing album name
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Fetch all bookmark albums on component mount
  useEffect(() => {
    const fetchAlbums = async () => {
      setLoadingAlbums(true);
      setError('');
      try {
        const response = await fetch('/api/bookmark-albums');
        if (!response.ok) throw new Error('アルバムの取得に失敗しました');
        const data = await response.json();
        setAlbums(data.bookmarkAlbums);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoadingAlbums(false);
      }
    };
    fetchAlbums();
  }, []);

  // Fetch bookmarks when an album is selected
  useEffect(() => {
    if (selectedAlbum) {
      const fetchBookmarks = async () => {
        setLoadingBookmarks(true);
        setError('');
        try {
          const response = await fetch(`/api/bookmarks?albumId=${selectedAlbum.id}`);
          if (!response.ok) throw new Error('ブックマークの取得に失敗しました');
          const data = await response.json();
          setBookmarks(data.bookmarks);
        } catch (err) {
          setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
          setLoadingBookmarks(false);
        }
      };
      fetchBookmarks();
    }
  }, [selectedAlbum]);

  const handleSelectAlbum = (album: BookmarkAlbum) => {
    setSelectedAlbum(album);
    setBookmarks([]); // Clear previous bookmarks
  };

  const handleCreateAlbum = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    setError('');
    try {
      const response = await fetch('/api/bookmark-albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAlbumName.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'アルバムの作成に失敗しました');
      }
      // 新しく作成されたアルバムに_countとrepresentativeImageUrlを追加 (APIが返すことを想定)
      setAlbums(prev => [{ ...data.bookmarkAlbum, _count: { bookmarks: 0 }, representativeImageUrl: null }, ...prev]);
      setNewAlbumName('');
      setIsCreatingAlbum(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    if (!window.confirm('このブックマークをアルバムから削除しますか？')) return;
    setError('');
    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ブックマークの削除に失敗しました');
      }
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const handleStartEditing = (album: BookmarkAlbum) => {
    setEditingAlbumId(album.id);
    setEditingName(album.name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleUpdateName = async (albumId: string) => {
    const currentAlbum = albums.find(a => a.id === albumId);
    if (!editingName || editingName.trim() === '' || editingName === currentAlbum?.name) {
      setEditingAlbumId(null); // キャンセル
      return;
    }

    setError('');
    try {
      const response = await fetch(`/api/bookmark-albums/${albumId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingName.trim() })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '名称の変更に失敗しました');
      }
      const updatedAlbum = data.updatedAlbum;
      setAlbums(prev => prev.map(a => a.id === albumId ? { ...a, name: updatedAlbum.name } : a));
      setSelectedAlbum(prev => prev && prev.id === albumId ? { ...prev, name: updatedAlbum.name } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setEditingAlbumId(null); // 編集モードを終了
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (window.confirm('このアルバムを削除しますか？アルバム内のすべてのブックマークも削除されます。')) {
      setError('');
      try {
        const response = await fetch(`/api/bookmark-albums/${albumId}`, { method: 'DELETE' });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'アルバムの削除に失敗しました');
        }
        setAlbums(prev => prev.filter(a => a.id !== albumId));
        setSelectedAlbum(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      }
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>アルバム一覧</h1>
      </header>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}

      {/* アルバム作成フォーム */}
      <div className={styles.createAlbumForm}>
        {isCreatingAlbum ? (
          <form onSubmit={handleCreateAlbum}>
            <input 
              type="text"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              placeholder="新しいアルバム名"
              className={styles.createAlbumInput}
              autoFocus
            />
            <div className={styles.createAlbumButtons}>
              <button type="submit" className={`${styles.createAlbumButton} ${styles.createAlbumButtonPrimary}`}>作成</button>
              <button type="button" onClick={() => setIsCreatingAlbum(false)} className={`${styles.createAlbumButton} ${styles.createAlbumButtonSecondary}`}>キャンセル</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsCreatingAlbum(true)} className={`${styles.createAlbumButton} ${styles.createAlbumButtonPrimary}`}>
            + 新しいアルバム
          </button>
        )}
      </div>

      {/* アルバム一覧とブックマーク一覧のコンテナ */}
      <div className="flex flex-col md:flex-row md:space-x-8">
        {/* Albums List (Left Pane) */}
        <div className="w-full md:w-1/4 mb-8 md:mb-0">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">アルバム一覧</h2>
          {loadingAlbums ? (
            <p className="text-gray-600">読み込み中...</p>
          ) : (
            <div className={styles.albumGrid}> 
              {albums.map(album => (
                <div key={album.id} className={styles.bookCard} onClick={() => handleSelectAlbum(album)}>
                  {album.representativeImageUrl ? (
                    <Image src={album.representativeImageUrl} alt={album.name} layout="fill" objectFit="cover" className={styles.bookImage} />
                  ) : (
                    null
                  )}
                  <h2 className={styles.bookTitle}>{album.name}</h2>
                  <p className={styles.bookCountBottomRight}>{album._count ? album._count.bookmarks : 0} 枚</p>
                  {/* 背表紙 */}
                  <div className={styles.bookSpine}></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookmarks in Selected Album (Right Pane) */}
        <div className="w-full md:w-3/4">
          {selectedAlbum ? (
            <div>
              <div className={styles.bookmarksHeader}>
                {
                  editingAlbumId === selectedAlbum.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={handleNameChange}
                      onBlur={() => handleUpdateName(selectedAlbum.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(selectedAlbum.id)}
                      className={styles.inlineInput}
                      autoFocus
                    />
                  ) : (
                    <h2 className={styles.bookmarksTitle}>{selectedAlbum.name} の中身</h2>
                  )
                }
                <div className={styles.bookmarksActions}>
                    <button onClick={() => handleStartEditing(selectedAlbum)} className={styles.tapeButton}>名称変更</button>
                    <button onClick={() => handleDeleteAlbum(selectedAlbum.id)} className={`${styles.tapeButton} ${styles.tapeButtonDelete}`}>削除</button>
                </div>
              </div>
              {loadingBookmarks ? (
                <p className="text-gray-600">読み込み中...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {bookmarks.length > 0 ? bookmarks.map(bookmark => (
                    <div key={bookmark.id} className="bg-white rounded-lg shadow overflow-hidden group relative">
                      <Link href={`/entries/${bookmark.diaryEntry?.id}`} className="block hover:bg-gray-50">
                          {bookmark.diaryEntry?.imageUrl && (
                              <Image src={bookmark.diaryEntry.imageUrl} alt={bookmark.diaryEntry.title || ''} width={140} height={180} className="w-full h-40 object-cover" />
                          )}
                          <div className="p-4">
                              <h3 className="font-bold text-gray-900">{bookmark.diaryEntry?.title || 'タイトルなし'}</h3>
                              <p className="text-sm text-gray-500">by {bookmark.diaryEntry?.user?.username || '不明'}</p>
                          </div>
                      </Link>
                      <button onClick={() => handleRemoveBookmark(bookmark.id)} className="absolute top-2 right-2 p-1 bg-white bg-opacity-75 rounded-full text-gray-600 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                      </button>
                    </div>
                  )) : (
                    <p className="text-gray-600">このアルバムにはまだブックマークがありません。</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full bg-gray-100 rounded-md">
              <p className="text-gray-500">アルバムを選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

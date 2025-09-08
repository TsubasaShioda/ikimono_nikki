'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Types should ideally be shared from a central types file
interface BookmarkAlbum {
  id: string;
  name: string;
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
  diaryEntry: DiaryEntry;
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
      setAlbums(prev => [data.bookmarkAlbum, ...prev]);
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

  // Placeholder for other album management functions
  const handleRenameAlbum = (albumId: string) => { alert('今後実装します'); };
  const handleDeleteAlbum = (albumId: string) => { alert('今後実装します'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">アルバム</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            マップに戻る
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
        <div className="flex space-x-8">
          {/* Albums List */}
          <div className="w-1/4">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">アルバム一覧</h2>
            {loadingAlbums ? (
              <p className="text-gray-600">読み込み中...</p>
            ) : (
              <ul className="space-y-2">
                {albums.map(album => (
                  <li key={album.id}>
                    <button 
                      onClick={() => handleSelectAlbum(album)}
                      className={`w-full text-left px-3 py-2 rounded-md ${selectedAlbum?.id === album.id ? 'bg-blue-100 text-blue-700' : 'text-gray-800 hover:bg-gray-100'}`}>
                      {album.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              {isCreatingAlbum ? (
                <form onSubmit={handleCreateAlbum} className="space-y-2">
                  <input 
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="新しいアルバム名"
                    className="w-full p-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button type="submit" className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">作成</button>
                    <button type="button" onClick={() => setIsCreatingAlbum(false)} className="w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">キャンセル</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setIsCreatingAlbum(true)} className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  + 新しいアルバム
                </button>
              )}
            </div>
          </div>

          {/* Bookmarks in Selected Album */}
          <div className="w-3/4">
            {selectedAlbum ? (
              <div>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-gray-800">{selectedAlbum.name} の中身</h2>
                    <div className="flex space-x-2">
                        <button onClick={() => handleRenameAlbum(selectedAlbum.id)} className="text-sm text-blue-600 hover:underline">名称変更</button>
                        <button onClick={() => handleDeleteAlbum(selectedAlbum.id)} className="text-sm text-red-600 hover:underline">削除</button>
                    </div>
                </div>
                {loadingBookmarks ? (
                  <p className="text-gray-600">読み込み中...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {bookmarks.length > 0 ? bookmarks.map(bookmark => (
                      <div key={bookmark.id} className="bg-white rounded-lg shadow overflow-hidden group relative">
                        <Link href={`/entries/${bookmark.diaryEntry.id}`} className="block hover:bg-gray-50">
                            {bookmark.diaryEntry.imageUrl && (
                                <Image src={bookmark.diaryEntry.imageUrl} alt={bookmark.diaryEntry.title} width={300} height={200} className="w-full h-40 object-cover" />
                            )}
                            <div className="p-4">
                                <h3 className="font-bold text-gray-900">{bookmark.diaryEntry.title}</h3>
                                <p className="text-sm text-gray-500">by {bookmark.diaryEntry.user.username}</p>
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
      </main>
    </div>
  );
}

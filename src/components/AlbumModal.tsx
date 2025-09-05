'use client';

import { useState, useEffect, FormEvent } from 'react';

interface BookmarkAlbum {
  id: string;
  name: string;
}

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  diaryEntryId: string | null;
  onBookmark: (albumId: string) => void;
}

export default function AlbumModal({ isOpen, onClose, diaryEntryId, onBookmark }: AlbumModalProps) {
  const [albums, setAlbums] = useState<BookmarkAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchAlbums = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch('/api/bookmark-albums');
          if (!response.ok) {
            throw new Error('アルバムの取得に失敗しました');
          }
          const data = await response.json();
          setAlbums(data.bookmarkAlbums);
          if (data.bookmarkAlbums.length > 0) {
            setSelectedAlbum(data.bookmarkAlbums[0].id);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        } finally {
          setLoading(false);
        }
      };
      fetchAlbums();
    }
  }, [isOpen]);

  const handleCreateAlbum = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    try {
      const response = await fetch('/api/bookmark-albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAlbumName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'アルバムの作成に失敗しました');
      }
      const newAlbum = data.bookmarkAlbum;
      setAlbums(prev => [newAlbum, ...prev]);
      setSelectedAlbum(newAlbum.id);
      setNewAlbumName('');
      setIsCreatingAlbum(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const handleBookmark = () => {
    if (!selectedAlbum || !diaryEntryId) return;
    onBookmark(selectedAlbum);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900">アルバムに追加</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {loading ? (
          <p className="text-gray-600">読み込み中...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="album-select" className="block text-sm font-medium text-gray-700 mb-1">アルバムを選択</label>
              <select
                id="album-select"
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                disabled={albums.length === 0}
              >
                {albums.length > 0 ? (
                  albums.map(album => (
                    <option key={album.id} value={album.id}>{album.name}</option>
                  ))
                ) : (
                  <option>利用可能なアルバムがありません</option>
                )}
              </select>
            </div>

            <button 
              onClick={() => setIsCreatingAlbum(!isCreatingAlbum)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isCreatingAlbum ? 'キャンセル' : '+ 新しいアルバムを作成'}
            </button>

            {isCreatingAlbum && (
              <form onSubmit={handleCreateAlbum} className="flex space-x-2">
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="新しいアルバム名"
                  className="flex-grow p-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">作成</button>
              </form>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">キャンセル</button>
          <button 
            onClick={handleBookmark}
            disabled={!selectedAlbum || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
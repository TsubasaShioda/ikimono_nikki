'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEntryPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !latitude || !longitude || !takenAt) {
      setError('タイトル、緯度、経度、発見日時は必須です。');
      return;
    }

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          takenAt,
          isPublic,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || '日記が正常に投稿されました！');
        // Optionally clear form or redirect
        setTitle('');
        setDescription('');
        setImageUrl('');
        setLatitude('');
        setLongitude('');
        setTakenAt('');
        setIsPublic(false);
        router.push('/'); // Redirect to home or entries list
      } else {
        setError(data.message || '日記の投稿に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">新しい日記を投稿</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">タイトル (必須)</label>
            <input
              type="text"
              id="title"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">説明</label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">画像URL</label>
            <input
              type="url"
              id="imageUrl"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">緯度 (必須)</label>
              <input
                type="number"
                id="latitude"
                step="any"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">経度 (必須)</label>
              <input
                type="number"
                id="longitude"
                step="any"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="takenAt" className="block text-sm font-medium text-gray-700">発見日時 (必須)</label>
            <input
              type="datetime-local"
              id="takenAt"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center">
            <input
              id="isPublic"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">公開する</label>
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              日記を投稿
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

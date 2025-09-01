'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PrivacyLevel } from '@/lib/types';
import { debounce } from 'lodash';
import Link from 'next/link';

const DRAFT_KEY = 'autosave-new-entry';

const NewEntryMap = dynamic(() => import('@/components/NewEntryMap'), { 
  ssr: false, 
  loading: () => <p>地図を読み込み中...</p> 
});

interface DraftData {
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  takenAt: string;
  privacyLevel: PrivacyLevel;
  selectedCategoryId: string;
}

export default function NewEntryPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.PRIVATE);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // --- AUTO-DRAFT SAVE LOGIC ---

  const saveDraft = useCallback(debounce((data: DraftData) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, 1500), []);

  useEffect(() => {
    if (isClient) {
      saveDraft({ title, description, latitude, longitude, takenAt, privacyLevel, selectedCategoryId });
    }
  }, [title, description, latitude, longitude, takenAt, privacyLevel, selectedCategoryId, isClient, saveDraft]);

  useEffect(() => {
    if (isClient) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const draftData: DraftData = JSON.parse(savedDraft);
        if (Object.values(draftData).some(v => v !== '' && v !== PrivacyLevel.PRIVATE)) {
            if (window.confirm('未保存の下書きがあります。復元しますか？')) {
                setTitle(draftData.title);
                setDescription(draftData.description);
                setLatitude(draftData.latitude);
                setLongitude(draftData.longitude);
                setTakenAt(draftData.takenAt);
                setPrivacyLevel(draftData.privacyLevel);
                setSelectedCategoryId(draftData.selectedCategoryId);
            }
        }
        // Always remove after checking to avoid asking again
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [isClient]);

  // --- END AUTO-DRAFT LOGIC ---

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user location for map
  useEffect(() => {
    if (isClient && !latitude && !longitude && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('現在地を取得できませんでした。デフォルトの位置を表示します。');
          setUserLocation([35.6895, 139.6917]);
          setLatitude('35.6895');
          setLongitude('139.6917');
        }
      );
    } else if (isClient && !latitude && !longitude) {
        setUserLocation([35.6895, 139.6917]);
        setLatitude('35.6895');
        setLongitude('139.6917');
    }
  }, [isClient, latitude, longitude]);

  // Fetch categories
  useEffect(() => {
    if (isClient) {
      const fetchCategories = async () => {
        try {
          const response = await fetch('/api/categories');
          const data = await response.json();
          if (response.ok) {
            setCategories(data.categories);
          } else {
            console.error('Failed to fetch categories:', data.message);
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
      };
      fetchCategories();
    }
  }, [isClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !latitude || !longitude || !takenAt) {
      setError('タイトル、緯度、経度、発見日時は必須です。');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('takenAt', takenAt);
    formData.append('privacyLevel', privacyLevel);
    if (selectedCategoryId) {
      formData.append('categoryId', selectedCategoryId);
    }

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.removeItem(DRAFT_KEY);
        setSuccess(data.message || '日記が正常に投稿されました！');
        setTimeout(() => router.push('/'), 1000);
      } else {
        setError(data.message || '日記の投稿に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  if (!isClient || userLocation === null) {
    return <div className="min-h-screen flex items-center justify-center">ページを読み込み中...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">新しい日記を投稿</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields... */}
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
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">画像</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">カテゴリ</label>
            <select
              id="category"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="">選択してください</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
          <div style={{ height: '300px', width: '100%' }}>
            <NewEntryMap 
              userLocation={userLocation} 
              latitude={latitude} 
              longitude={longitude} 
              setLatitude={setLatitude} 
              setLongitude={setLongitude} 
            />
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
          <div>
            <label className="block text-sm font-medium text-gray-700">公開設定</label>
            <div className="mt-2 space-y-2">
              {/* Radio buttons... */}
            </div>
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
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
            キャンセル
          </Link>
        </p>
      </div>
    </div>
  );
}
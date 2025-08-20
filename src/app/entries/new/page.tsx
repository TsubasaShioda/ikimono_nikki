'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { PrivacyLevel } from '@/lib/types'; // Import enum from shared location

// Component to handle map clicks and update coordinates
function MapClickHandler({ setLatitude, setLongitude }: { setLatitude: (lat: string) => void; setLongitude: (lng: string) => void }) {
  useMapEvents({
    click: (e) => {
      setLatitude(e.latlng.lat.toString());
      setLongitude(e.latlng.lng.toString());
    },
  });
  return null;
}

export default function NewEntryPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.PRIVATE); // Changed from isPublic
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]); // カテゴリ一覧のstate
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // 選択されたカテゴリIDのstate
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user location for map
  useEffect(() => {
    if (isClient && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('現在地を取得できませんでした。デフォルトの位置を表示します。');
          setUserLocation([35.6895, 139.6917]); // Default to Tokyo
          setLatitude('35.6895');
          setLongitude('139.6917');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else if (isClient) {
      setError('お使いのブラウザは位置情報に対応していません。デフォルトの位置を表示します。');
      setUserLocation([35.6895, 139.6917]); // Default to Tokyo
      setLatitude('35.6895');
      setLongitude('139.6917');
    }
  }, [isClient]);

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

  // Fix for default marker icon issue with Webpack
  useEffect(() => {
    if (typeof window !== 'undefined') {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    }
  }, []);

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
    if (selectedCategoryId) { // カテゴリが選択されていれば追加
      formData.append('categoryId', selectedCategoryId);
    }

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || '日記が正常に投稿されました！');
        router.push('/');
      } else {
        setError(data.message || '日記の投稿に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  if (!isClient || userLocation === null) {
    return <div className="min-h-screen flex items-center justify-center">地図を読み込み中...</div>;
  }

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
          {userLocation && (
            <div style={{ height: '300px', width: '100%' }}>
              <MapContainer center={userLocation} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {latitude && longitude && (
                  <Marker position={[parseFloat(latitude), parseFloat(longitude)]}></Marker>
                )}
                <MapClickHandler setLatitude={setLatitude} setLongitude={setLongitude} />
              </MapContainer>
            </div>
          )}
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
          {/* Changed from checkbox to radio buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700">公開設定</label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="private"
                  name="privacyLevel"
                  type="radio"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  value={PrivacyLevel.PRIVATE}
                  checked={privacyLevel === PrivacyLevel.PRIVATE}
                  onChange={(e) => setPrivacyLevel(e.target.value as PrivacyLevel)}
                />
                <label htmlFor="private" className="ml-3 block text-sm font-medium text-gray-900">非公開 (自分のみ)</label>
              </div>
              <div className="flex items-center">
                <input
                  id="friends-only"
                  name="privacyLevel"
                  type="radio"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  value={PrivacyLevel.FRIENDS_ONLY}
                  checked={privacyLevel === PrivacyLevel.FRIENDS_ONLY}
                  onChange={(e) => setPrivacyLevel(e.target.value as PrivacyLevel)}
                />
                <label htmlFor="friends-only" className="ml-3 block text-sm font-medium text-gray-900">フレンドのみ</label>
              </div>
              <div className="flex items-center">
                <input
                  id="public"
                  name="privacyLevel"
                  type="radio"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  value={PrivacyLevel.PUBLIC}
                  checked={privacyLevel === PrivacyLevel.PUBLIC}
                  onChange={(e) => setPrivacyLevel(e.target.value as PrivacyLevel)}
                />
                <label htmlFor="public" className="ml-3 block text-sm font-medium text-gray-900">公開 (全員)</label>
              </div>
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
      </div>
    </div>
  );
}
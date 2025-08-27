'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { PrivacyLevel } from '@/lib/types'; // Import enum from shared location
import Image from 'next/image';

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

// Update interface to use PrivacyLevel
interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  privacyLevel: PrivacyLevel; // Changed from isPublic
  takenAt: string;
  createdAt: string;
  userId: string;
  categoryId: string | null; // Add categoryId
}

interface Category {
  id: string;
  name: string;
}

export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.PRIVATE);
  const [categoryId, setCategoryId] = useState(''); // Add categoryId state
  const [categories, setCategories] = useState<Category[]>([]); // Add categories state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Fetch existing entry data
  useEffect(() => {
    if (isClient && entryId) {
      const fetchEntry = async () => {
        try {
          const response = await fetch(`/api/entries/${entryId}`);
          const data = await response.json();

          if (response.ok) {
            const entry: DiaryEntry = data.entry;
            setTitle(entry.title);
            setDescription(entry.description || '');
            setImageUrl(entry.imageUrl);
            setLatitude(entry.latitude.toString());
            setLongitude(entry.longitude.toString());
            setTakenAt(new Date(entry.takenAt).toISOString().slice(0, 16));
            setPrivacyLevel(entry.privacyLevel);
            setCategoryId(entry.categoryId || ''); // Set categoryId
          } else {
            setError(data.message || '日記の取得に失敗しました。');
          }
        } catch (err) {
          console.error('Fetch entry error:', err);
          setError('日記の取得中に予期せぬエラーが発生しました。');
        } finally {
          setLoading(false);
        }
      };
      fetchEntry();
    }
  }, [isClient, entryId]);

  // Fetch user location for map
  useEffect(() => {
    if (isClient && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setUserLocation([35.6895, 139.6917]); // Default to Tokyo
        }
      );
    } else if (isClient) {
      setUserLocation([35.6895, 139.6917]); // Default to Tokyo
    }
  }, [isClient]);

  // Fix for default marker icon issue with Webpack
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-expect-error Leaflet's type definition is missing _getIconUrl, but it's needed for image icons to work correctly.
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
    } else if (imageUrl) {
      formData.append('imageUrl', imageUrl);
    } else {
      formData.append('imageUrl', '');
    }
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('takenAt', takenAt);
    formData.append('privacyLevel', privacyLevel);
    if (categoryId) { // カテゴリが選択されていれば追加
      formData.append('categoryId', categoryId);
    }

    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || '日記が正常に更新されました！');
        router.push('/');
      } else {
        setError(data.message || '日記の更新に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  if (!isClient || loading) {
    return <div className="min-h-screen flex items-center justify-center">日記を読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">エラー: {error}</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">日記を編集</h2>
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
            {imageUrl && !imageFile && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">現在の画像:</p>
                <Image src={imageUrl} alt="Current" width={128} height={128} className="object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="mt-1 text-red-600 hover:text-red-700 text-sm"
                >
                  画像を削除
                </button>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">カテゴリ</label>
            <select
              id="category"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
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
              <MapContainer center={[parseFloat(latitude) || userLocation[0], parseFloat(longitude) || userLocation[1]]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
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
              日記を更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

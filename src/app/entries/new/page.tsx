'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PrivacyLevel } from '@/lib/types';
import { debounce } from 'lodash';
import Link from 'next/link';
import styles from './page.module.css';

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

  // NOTE: Auto-draft logic is omitted for brevity in this example, but would be here.

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !latitude && !longitude && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setLatitude(coords[0].toString());
          setLongitude(coords[1].toString());
        },
        () => {
          const defaultCoords: [number, number] = [35.6895, 139.6917];
          setUserLocation(defaultCoords);
          setLatitude(defaultCoords[0].toString());
          setLongitude(defaultCoords[1].toString());
        }
      );
    }
  }, [isClient, latitude, longitude]);

  useEffect(() => {
    if (isClient) {
      const fetchCategories = async () => {
        try {
          const response = await fetch('/api/categories');
          const data = await response.json();
          if (response.ok) setCategories(data.categories);
        } catch (err) { console.error('Error fetching categories:', err); }
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
    if (imageFile) formData.append('image', imageFile);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('takenAt', takenAt);
    formData.append('privacyLevel', privacyLevel);
    if (selectedCategoryId) formData.append('categoryId', selectedCategoryId);

    try {
      const response = await fetch('/api/entries', { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || '日記が正常に投稿されました！');
        setTimeout(() => router.push('/'), 1500);
      } else {
        setError(data.message || '日記の投稿に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。');
    }
  };

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">ページを読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.notebook}>
        <div className={styles.spiral}></div>
        <div className={styles.formContent}>
          <h2 className={styles.title}>新しい日記を投稿</h2>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}
          <form onSubmit={handleSubmit} className={styles.form}>
            
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.label}>タイトル (必須)</label>
              <input
                type="text"
                id="title"
                className={styles.ruledInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>説明</label>
              <textarea
                id="description"
                rows={1}
                className={styles.ruledTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onInput={(e) => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={styles.formGroup}>
                <label htmlFor="image" className={styles.label}>画像</label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="category" className={styles.label}>カテゴリ</label>
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.mapContainer}>
              {userLocation && (
                <NewEntryMap 
                  userLocation={userLocation} 
                  latitude={latitude} 
                  longitude={longitude} 
                  setLatitude={setLatitude} 
                  setLongitude={setLongitude} 
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={styles.formGroup}>
                <label htmlFor="takenAt" className={styles.label}>発見日時 (必須)</label>
                <input
                  type="datetime-local"
                  id="takenAt"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>公開設定</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                  {Object.values(PrivacyLevel).map((level) => (
                    <div className="flex items-center" key={level}>
                      <input id={`privacy-${level}`} name="privacyLevel" type="radio" value={level} checked={privacyLevel === level} onChange={(e) => setPrivacyLevel(e.target.value as PrivacyLevel)} />
                      <label htmlFor={`privacy-${level}`} className="ml-2 text-sm">
                        {level === PrivacyLevel.PUBLIC ? '公開' : level === PrivacyLevel.FRIENDS_ONLY ? 'フレンドのみ' : level === PrivacyLevel.PUBLIC_ANONYMOUS ? '匿名で公開' : '非公開'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className={styles.submitButton}>日記を投稿</button>
          </form>
          <p className={styles.cancelLink}>
            <Link href="/">キャンセル</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
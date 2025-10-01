'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PrivacyLevel } from '@/lib/types';
import styles from '../../new/page.module.css'; // newのスタイルを流用

const EditEntryMap = dynamic(() => import('@/components/EditEntryMap'), { 
  ssr: false,
  loading: () => <p>地図を読み込み中...</p>
});

export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.PRIVATE);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // カテゴリを取得
        const catResponse = await fetch('/api/categories');
        if (catResponse.ok) {
          const catData = await catResponse.json();
          setCategories(catData.categories);
        } else {
          console.error('Failed to fetch categories');
        }

        // 日記データを取得
        const entryResponse = await fetch(`/api/entries/${id}`);
        if (!entryResponse.ok) {
          const errorData = await entryResponse.json();
          throw new Error(errorData.message || '日記の読み込みに失敗しました。');
        }
        const entryData = await entryResponse.json();
        const entry = entryData.entry;
        
        setTitle(entry.title);
        setDescription(entry.description || '');
        setLatitude(entry.latitude.toString());
        setLongitude(entry.longitude.toString());
        setTakenAt(new Date(entry.takenAt).toISOString().slice(0, 16));
        setPrivacyLevel(entry.privacyLevel);
        setExistingImageUrl(entry.imageUrl);
        setSelectedCategoryId(entry.categoryId || '');

      } catch (err: any) {
        console.error('Fetch initial data error:', err);
        setError(err.message || 'データの読み込み中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);

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
      const response = await fetch(`/api/entries/${id}`, { method: 'PUT', body: formData });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || '日記が正常に更新されました！');
        setTimeout(() => router.push('/entries/my'), 1500);
      } else {
        setError(data.message || '日記の更新に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">ページを読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.notebook}>
        <div className={styles.spiral}></div>
        <div className={styles.formContent}>
          <h2 className={styles.title}>日記を編集</h2>
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
                  const target = e.currentTarget;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={styles.formGroup}>
                <label className={styles.label}>画像</label>
                <div className="flex items-center gap-4">
                  <label htmlFor="image" className="shrink-0 cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                    ファイルを選択
                  </label>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <span className="min-w-0 truncate text-sm text-gray-500">
                    {imageFile ? imageFile.name : (existingImageUrl ? '画像は変更されません' : '選択されていません')}
                  </span>
                </div>
                 {existingImageUrl && !imageFile && (
                    <p className="mt-2 text-sm text-gray-500">現在の画像: <a href={existingImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">表示</a></p>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="category" className={styles.label}>カテゴリ</label>
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  <option value="">選択してください</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.mapContainer}>
              {latitude && longitude && (
                <EditEntryMap 
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
                  className="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>公開設定</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                  {Object.values(PrivacyLevel).map((level) => (
                    <div className="flex items-center" key={level}>
                      <input id={`privacy-${level}`} name="privacyLevel" type="radio" value={level} checked={privacyLevel === level} onChange={(e) => setPrivacyLevel(e.target.value as PrivacyLevel)} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                      <label htmlFor={`privacy-${level}`} className="ml-2 text-sm">
                        {level === PrivacyLevel.PUBLIC ? '公開' : level === PrivacyLevel.FRIENDS_ONLY ? 'フレンドのみ' : level === PrivacyLevel.PUBLIC_ANONYMOUS ? '匿名で公開' : '非公開'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className={styles.submitButton}>日記を更新</button>
          </form>
          <p className={styles.cancelLink}>
            <button type="button" onClick={() => router.back()}>キャンセル</button>
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { debounce } from 'lodash';
import styles from './Settings.module.css';

const DRAFT_KEY = 'autosave-settings-profile';

interface DraftData {
  username: string;
  email: string;
  description: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  // Control state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // --- AUTO-DRAFT SAVE LOGIC ---

  // 1. Save draft to localStorage periodically
  const saveDraft = useCallback(debounce((data: DraftData) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    console.log('Draft saved!');
  }, 1500), []);

  useEffect(() => {
    if (!loading) {
      saveDraft({ username, email, description });
    }
  }, [username, email, description, loading, saveDraft]);

  // 2. Load and offer to restore draft on initial page load
  useEffect(() => {
    const fetchAndRestore = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (response.ok) {
          const user = data.user;
          setUsername(user.username);
          setEmail(user.email);
          setDescription(user.description || '');
          setIconUrl(user.iconUrl || null);

          // Check for a draft after fetching initial data
          const savedDraft = localStorage.getItem(DRAFT_KEY);
          if (savedDraft) {
            const draftData: DraftData = JSON.parse(savedDraft);
            // Ask to restore only if the draft is different from the saved data
            if (draftData.username !== user.username || draftData.email !== user.email || draftData.description !== (user.description || '')) {
              if (window.confirm('未保存の下書きがあります。復元しますか？')) {
                setUsername(draftData.username);
                setEmail(draftData.email);
                setDescription(draftData.description);
              }
            }
            // Clean up the draft if user declines or it's same as saved
            localStorage.removeItem(DRAFT_KEY);
          }
        } else {
          setError(data.message || 'ユーザー情報の取得に失敗しました。');
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('ユーザー情報の取得中に予期せぬエラーが発生しました。');
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    fetchAndRestore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Run only once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    if (password !== '') {
      formData.append('password', password);
    }
    formData.append('description', description);
    if (iconFile) {
      formData.append('icon', iconFile);
    } else if (iconUrl === null) {
      formData.append('iconUrl', '');
    }

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'プロフィールが正常に更新されました！');
        setPassword('');
        setIconFile(null);
        setIconUrl(data.user.iconUrl || null);
        // 3. Clear draft on successful submission
        localStorage.removeItem(DRAFT_KEY);
      } else {
        setError(data.message || 'プロフィールの更新に失敗しました。');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">プロフィールを読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.postItContainer}>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">プロフィール編集</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">ユーザー名</label>
            <input
              type="text"
              id="username"
              className={styles.inlineInput}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              id="email"
              className={styles.inlineInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">新しいパスワード (変更する場合のみ)</label>
            <input
              type="password"
              id="password"
              className={styles.inlineInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを変更しない場合は空欄"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">プロフィール説明</label>
            <textarea
              id="description"
              rows={3}
              className={styles.inlineInput}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          <div>
            <label htmlFor="icon" className="block text-sm font-medium text-gray-700">アイコン</label>
            <input
              type="file"
              id="icon"
              accept="image/*"
              className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={(e) => setIconFile(e.target.files ? e.target.files[0] : null)}
            />
            {iconUrl && !iconFile && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">現在のアイコン:</p>
                <Image src={iconUrl} alt="Current Icon" width={80} height={80} className="object-cover rounded-full" />
                <button
                  type="button"
                  onClick={() => setIconUrl(null)}
                  className={styles.tapeButtonDelete}
                >
                  アイコンを削除
                </button>
              </div>
            )}
          </div>
          <div>
            <button
              type="submit"
              className={styles.tapeButton}
            >
              プロフィールを更新
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
            ホームに戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
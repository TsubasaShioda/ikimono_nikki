'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function SettingsPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState(''); // 追加
  const [iconFile, setIconFile] = useState<File | null>(null); // 追加
  const [iconUrl, setIconUrl] = useState<string | null>(null); // 追加：既存アイコン表示用
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json(); // data の定義を if/else の外に出す
        if (response.ok) {
          setUsername(data.user.username);
          setEmail(data.user.email);
          setDescription(data.user.description || ''); // 追加
          setIconUrl(data.user.iconUrl || null); // 追加
        } else {
          setError(data.message || 'ユーザー情報の取得に失敗しました。');
          router.push('/auth/login'); // Redirect to login if not authenticated
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('ユーザー情報の取得中に予期せぬエラーが発生しました。');
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [router]);

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
        // headers: { 'Content-Type': 'application/json' }, // FormDataを使用するため不要
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'プロフィールが正常に更新されました！');
        setPassword(''); // Clear password field after successful update
        setIconFile(null); // Clear selected file
        setIconUrl(data.user.iconUrl || null); // Update iconUrl from response
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">プロフィール編集</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">ユーザー名</label>
            <input
              type="text"
              id="username"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
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
                  onClick={() => setIconUrl(null)} // アイコンを削除
                  className="mt-1 text-red-600 hover:text-red-700 text-sm"
                >
                  アイコンを削除
                </button>
              </div>
            )}
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" 
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
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !email || !password) {
      setError('すべての項目を入力してください。');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || '登録が成功しました！ログインページに移動します。');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        setError(data.message || '登録に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.post_it}>
        <h1 className={styles.title}>新規登録</h1>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit}>
          <div className={styles.input_group}>
            <input
              type="text"
              id="username"
              className={styles.input}
              placeholder="ユーザー名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className={styles.input_group}>
            <input
              type="email"
              id="email"
              className={styles.input}
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.input_group}>
            <input
              type="password"
              id="password"
              className={styles.input}
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.button_container}>
            <button type="submit" className={styles.login_button}>
              登録する
            </button>
          </div>
        </form>
        <p className={`mt-6 text-center text-sm text-gray-600 ${styles.link_paragraph}`}>
          すでにアカウントをお持ちですか？{' '}
          <Link href="/auth/login" className={styles.register_link}>
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
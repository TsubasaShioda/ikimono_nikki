'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful:', data.user);
        router.push('/');
      } else {
        setError(data.message || 'ログインに失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setError('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  return (
    <div className={styles.container}>
        <div className={styles.post_it}>
            <h1 className={styles.title}>ログイン</h1>
            {error && <p className={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className={styles.input_group}>
                    {/* ラベルを削除し、placeholderを追加 */}
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
                    {/* ラベルを削除し、placeholderを追加 */}
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
                        ログイン
                    </button>
                </div>
            </form>
            <p className={`mt-6 text-center text-sm text-gray-600 ${styles.link_paragraph}`}>
                アカウントをお持ちではありませんか？{' '}
                <Link href="/auth/register" className={styles.register_link}>
                    新規登録
                </Link>
            </p>
        </div>
    </div>
  );
}
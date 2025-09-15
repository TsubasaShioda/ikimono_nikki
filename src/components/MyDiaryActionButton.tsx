'use client';

import Link from 'next/link';
import styles from './MyDiaryActionButton.module.css';

const BookIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
  </svg>
);

export default function MyDiaryActionButton() {
  return (
    // md(768px)以上の画面では非表示にする (Tailwind CSSのクラス)
    <Link href="/entries/my" className={`${styles.fab} md:hidden`} title="自分の日記を見る">
      <BookIcon />
    </Link>
  );
}
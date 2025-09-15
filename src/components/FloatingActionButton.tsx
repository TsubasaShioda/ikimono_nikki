'use client';

import Link from 'next/link';
import styles from './FloatingActionButton.module.css';

const PinPlusIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11a1 1 0 001.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 2a5 5 0 00-5 5c0 2.5 2.5 6.4 5 9.82 2.5-3.42 5-7.32 5-9.82a5 5 0 00-5-5z" />
    <path d="M12.75 7.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
  </svg>
);

export default function FloatingActionButton() {
  return (
    // md(768px)以上の画面では非表示にする (Tailwind CSSのクラス)
    <Link href="/entries/new" className={`${styles.fab} md:hidden`} title="新しい日記を投稿">
      <PinPlusIcon />
    </Link>
  );
}

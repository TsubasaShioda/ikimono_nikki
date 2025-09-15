'use client';

import Link from 'next/link';
import styles from './AlbumActionButton.module.css';

const GridIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z" />
  </svg>
);

export default function AlbumActionButton() {
  return (
    // md(768px)以上の画面では非表示にする (Tailwind CSSのクラス)
    <Link href="/albums" className={`${styles.fab} md:hidden`} title="アルバムを見る">
      <GridIcon />
    </Link>
  );
}

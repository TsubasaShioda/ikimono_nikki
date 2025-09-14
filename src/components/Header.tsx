'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';

// Propsの型定義
interface CurrentUser {
  id: string;
  iconUrl: string | null;
}

interface HeaderProps {
  currentUser: CurrentUser | null;
  onLogout: () => void;
  onOpenSidebar: () => void;
}

// --- アイコンコンポーネント --- //
const LeafIcon = () => (
  <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.61 3.42C15.05 2.2 12.03 2.05 9.26 3.01c-2.03.7-3.89 2.18-5.19 4.15-1.37 2.06-2.01 4.58-1.72 7.13.31 2.75 1.63 5.24 3.69 7.02.2.17.48.22.72.1.24-.12.39-.36.39-.62v-2.13c0-.39-.23-.73-.58-.89-1.3-.6-2.29-1.88-2.67-3.35-.39-1.5.02-3.09 1.08-4.32 1.05-1.23 2.65-1.99 4.35-2.11 2.33-.16 4.5.88 5.83 2.71.13.18.34.28.56.28h2.01c.39 0 .72-.29.78-.68.06-.39-.16-.76-.51-.93z" />
  </svg>
);

const HamburgerIcon = () => (
    <svg className={styles.hamburgerIcon} stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
    </svg>
);

const FilterIcon = () => (
    <svg className={styles.hamburgerIcon} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

// --- ヘッダーコンポーネント本体 --- //
export default function Header({ currentUser, onLogout, onOpenSidebar }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const NavLinks = () => (
    <>
      <Link href="/entries/new" className={`${styles.btn} ${styles.btnPrimary}`}>新しい日記</Link>
      <Link href="/entries/my" className={`${styles.btn} ${styles.btnSecondary}`}>自分の日記</Link>
      <Link href="/friends" className={`${styles.btn} ${styles.btnSecondary}`}>フレンド</Link>
      <Link href="/albums" className={`${styles.btn} ${styles.btnSecondary}`}>アルバム</Link>
      <button onClick={onLogout} className={`${styles.btn} ${styles.btnDanger}`}>ログアウト</button>
    </>
  );

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <LeafIcon />
        <span className={styles.logoText}>生き物日記</span>
      </Link>

      {/* --- 右側のナビゲーションエリア --- */}
      <div className="flex items-center">
        {/* PC用ナビゲーション */}
        <nav className={styles.nav}>
          <button onClick={onOpenSidebar} className={`${styles.btn} ${styles.btnFilter}`}>
            <FilterIcon />
            <span>フィルター</span>
          </button>
          {currentUser ? (
            <>
              <NavLinks />
              <NotificationBell />
              <Link href="/settings" className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center hover:opacity-80 transition-opacity">
                {currentUser.iconUrl ? (
                  <Image src={currentUser.iconUrl} alt="プロフィールアイコン" width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <Image src="/default-avatar.svg" alt="デフォルトアイコン" width={40} height={40} className="w-full h-full object-cover" />
                )}
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={`${styles.btn} ${styles.btnTertiary}`}>ログイン</Link>
              <Link href="/auth/register" className={`${styles.btn} ${styles.btnPrimary}`}>新規登録</Link>
            </>
          )}
        </nav>

        {/* モバイル用ナビゲーション */}
        <div className={styles.mobileNav}>
          <button onClick={onOpenSidebar} className={`${styles.iconButton} ${styles.iconButtonFilter}`}>
            <FilterIcon />
          </button>
          {currentUser ? (
            <>
              <NotificationBell />
              <Link href="/settings">
                {currentUser.iconUrl ? (
                    <Image src={currentUser.iconUrl} alt="プロフィールアイコン" width={32} height={32} className="rounded-full object-cover" />
                  ) : (
                    <Image src="/default-avatar.svg" alt="デフォルトアイコン" width={32} height={32} className="rounded-full object-cover" />
                  )}
              </Link>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={styles.iconButton}>
                <HamburgerIcon />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className={`${styles.btn} ${styles.btnTertiary}`}>ログイン</Link>
              <Link href="/auth/register" className={`${styles.btn} ${styles.btnPrimary}`}>新規登録</Link>
            </div>
          )}
        </div>
      </div>

      {/* モバイル用メニューパネル */}
      {isMenuOpen && currentUser && (
        <div className={styles.mobileMenu}>
          <NavLinks />
        </div>
      )}
    </header>
  );
}

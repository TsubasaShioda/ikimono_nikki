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

// ★ 修正：アイコンの色が親要素に依存するように、クラス指定を削除
const FilterIcon = () => (
    <svg style={{ width: '24px', height: '24px' }} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

const FriendsIcon = () => (
    <svg className={styles.hamburgerIcon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
);

const LogoutIcon = () => (
    <svg className={styles.hamburgerIcon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
);


// --- ヘッダーコンポーネント本体 --- //
export default function Header({ currentUser, onLogout, onOpenSidebar }: HeaderProps) {

  // PC表示用のナビゲーションリンク
  const PcNavLinks = () => (
    <>
      <Link href="/entries/new" className={`${styles.btn} ${styles.btnPrimary}`}>新しい日記</Link>
      <Link href="/entries/my" className={`${styles.btn} ${styles.btnSecondary}`}>自分の日記</Link>
      <Link href="/albums" className={`${styles.btn} ${styles.btnSecondary}`}>アルバム</Link>
      <Link href="/friends" className={`${styles.btn} ${styles.btnSecondary}`}>フレンド</Link>
      <button onClick={onLogout} className={`${styles.btn} ${styles.btnDanger}`}>ログアウト</button>
    </>
  );

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <LeafIcon />
          <span className={styles.logoText}>生き物日記</span>
        </Link>

        {/* --- 右側のナビゲーションエリア --- */}
        <div className="flex items-center">
          {/* PC用ナビゲーション */}
          <nav className={styles.nav}>
            {/* ★ 修正：ヘッダー内のフィルターボタンを削除 */}
            {currentUser ? (
              <>
                <PcNavLinks />
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
            {currentUser ? (
              <>
                {/* ★ 修正：ヘッダー内のフィルターアイコンを削除 */}
                <Link href="/friends" className={styles.iconButton} title="フレンド">
                    <FriendsIcon />
                </Link>
                <NotificationBell />
                <Link href="/settings" title="設定">
                  {currentUser.iconUrl ? (
                      <Image src={currentUser.iconUrl} alt="プロフィールアイコン" width={32} height={32} className="rounded-full object-cover" />
                    ) : (
                      <Image src="/default-avatar.svg" alt="デフォルトアイコン" width={32} height={32} className="rounded-full object-cover" />
                    )}
                </Link>
                <button onClick={onLogout} className={styles.iconButton} title="ログアウト">
                    <LogoutIcon />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {/* ★ 修正：ヘッダー内のフィルターアイコンを削除 */}
                <Link href="/auth/login" className={`${styles.btn} ${styles.btnTertiary}`}>ログイン</Link>
                <Link href="/auth/register" className={`${styles.btn} ${styles.btnPrimary}`}>新規登録</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* フィルタータブボタン (これが唯一のフィルターボタン) */}
      <button onClick={onOpenSidebar} className={styles.filterTab} title="フィルター">
        <FilterIcon />
      </button>
    </>
  );
}
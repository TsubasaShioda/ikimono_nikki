'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// --- TYPE DEFINITIONS ---
interface Actor {
  id: string;
  username: string;
  iconUrl: string | null;
}

interface DiaryEntry {
  id: string;
  title: string;
}

interface Notification {
  id: string;
  type: 'FRIEND_REQUEST' | 'NEW_LIKE' | 'NEW_COMMENT';
  isRead: boolean;
  createdAt: string;
  actor: Actor;
  diaryEntry: DiaryEntry | null;
}

// --- HELPER FUNCTION ---
function renderNotificationText(notification: Notification) {
  const actorLink = <Link href={`/entries/user/${notification.actor.id}`} className="font-bold hover:underline">{notification.actor.username}</Link>;
  const entryLink = notification.diaryEntry ? <Link href={`/entries/${notification.diaryEntry.id}`} className="font-bold hover:underline">{notification.diaryEntry.title}</Link> : null;

  switch (notification.type) {
    case 'FRIEND_REQUEST':
      return <>{actorLink}さんからフレンド申請が届きました。</>;
    case 'NEW_LIKE':
      return <>{actorLink}さんがあなたの投稿「{entryLink}」にいいねしました。</>;
    case 'NEW_COMMENT':
      return <>{actorLink}さんがあなたの投稿「{entryLink}」にコメントしました。</>;
    default:
      return '新しい通知があります。';
  }
}

// --- MAIN COMPONENT ---
export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = async () => {
    setIsOpen(prev => !prev);
    if (!isOpen && unreadCount > 0) {
      try {
        await fetch('/api/notifications/mark-as-read', { method: 'POST' });
        setUnreadCount(0);
      } catch (err) {
        console.error('Failed to mark notifications as read', err);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleBellClick} className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-md shadow-lg z-20 ring-1 ring-black ring-opacity-5">
          <div className="p-2 font-bold text-gray-900 border-b">通知</div>
          {error && <div className="p-4 text-red-500">{error}</div>}
          {notifications.length > 0 ? (
            <ul>
              {notifications.map(notification => (
                <li key={notification.id} className={`p-3 text-sm border-b border-gray-100 ${!notification.isRead ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start space-x-3">
                    <Image src={notification.actor.iconUrl || '/default-avatar.svg'} alt={notification.actor.username} width={32} height={32} className="rounded-full w-8 h-8 object-cover" />
                    <div className="flex-1 text-gray-700">
                      {renderNotificationText(notification)}
                      <p className="text-xs text-gray-400 mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">通知はまだありません。</div>
          )}
        </div>
      )}
    </div>
  );
}

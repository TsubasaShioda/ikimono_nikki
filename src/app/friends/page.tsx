'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { debounce } from 'lodash';

interface SearchUser {
  id: string;
  username: string;
  iconUrl: string | null;
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestStatus, setRequestStatus] = useState<Record<string, string>>({}); // To track request status for each user

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok) {
          setSearchResults(data.users);
        } else {
          setError(data.message || '検索に失敗しました。');
          setSearchResults([]);
        }
      } catch (err) {
        setError('検索中にエラーが発生しました。');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 500), // 500ms delay
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleSendRequest = async (addresseeId: string) => {
    setRequestStatus((prev) => ({ ...prev, [addresseeId]: 'loading' }));
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresseeId }),
      });

      const data = await response.json();

      if (response.ok) {
        setRequestStatus((prev) => ({ ...prev, [addresseeId]: 'sent' }));
      } else {
        setRequestStatus((prev) => ({ ...prev, [addresseeId]: 'error' }));
        alert(`申請エラー: ${data.message || '不明なエラー'}`);
      }
    } catch (err) {
      setRequestStatus((prev) => ({ ...prev, [addresseeId]: 'error' }));
      alert('申請中に予期せぬエラーが発生しました。');
    }
  };

  const getButtonState = (userId: string) => {
    const status = requestStatus[userId];
    if (status === 'loading') {
      return { text: '送信中...', disabled: true, className: 'bg-gray-400' };
    }
    if (status === 'sent') {
      return { text: '申請済み', disabled: true, className: 'bg-green-600' };
    }
    if (status === 'error') {
      return { text: '再試行', disabled: false, className: 'bg-red-600 hover:bg-red-700' };
    }
    return { text: 'フレンド申請', disabled: false, className: 'bg-indigo-600 hover:bg-indigo-700' };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">フレンド管理</h1>
          <p className="text-gray-600 mt-1">ユーザーを検索してフレンド申請を送ったり、受信した申請を確認したりできます。</p>
          <div className="mt-4">
            <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
              &larr; ホームに戻る
            </Link>
          </div>
        </header>

        {/* User Search Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">ユーザーを探す</h2>
          <div className="relative">
            <input
              type="search"
              placeholder="ユーザー名で検索..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-gray-500">検索中...</p>
            ) : (
              searchResults.length > 0 ? (
                searchResults.map((user) => {
                  const buttonState = getButtonState(user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                          {user.iconUrl ? (
                            <img src={user.iconUrl} alt={`${user.username}のアイコン`} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                          )}
                        </div>
                        <span className="ml-4 font-medium text-gray-800">{user.username}</span>
                      </div>
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        disabled={buttonState.disabled}
                        className={`px-4 py-1.5 text-white text-sm font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${buttonState.className}`}
                      >
                        {buttonState.text}
                      </button>
                    </div>
                  )
                })
              ) : (
                searchQuery.length >= 2 && <p className="text-gray-500">該当するユーザーが見つかりません。</p>
              )
            )}
          </div>
        </section>

        {/* Friend Requests Section (Placeholder) */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">受信したフレンド申請</h2>
          <div className="text-gray-500 italic">（ここにフレンド申請が表示されます）</div>
        </section>

        {/* Friends List Section (Placeholder) */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">あなたのフレンド</h2>
          <div className="text-gray-500 italic">（ここにフレンドリストが表示されます）</div>
        </section>
      </div>
    </div>
  );
}
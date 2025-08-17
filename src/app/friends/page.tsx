'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { debounce } from 'lodash';

// --- TYPE DEFINITIONS ---
interface UserProfile {
  id: string;
  username: string;
  iconUrl: string | null;
}

interface FriendRequest {
  id: string; // Friendship ID
  requester: UserProfile;
}

interface Friend extends UserProfile {
  friendshipId: string;
}

export default function FriendsPage() {
  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [requestStatus, setRequestStatus] = useState<Record<string, string>>({});

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // --- DATA FETCHING ---
  const fetchFriendRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      if (response.ok) setFriendRequests(data.friendRequests);
    } catch (err) { console.error('Failed to fetch friend requests', err); }
    finally { setLoadingRequests(false); }
  }, []);

  const fetchFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      if (response.ok) setFriends(data.friends);
    } catch (err) { console.error('Failed to fetch friends', err); }
    finally { setLoadingFriends(false); }
  }, []);

  useEffect(() => {
    fetchFriendRequests();
    fetchFriends();
  }, [fetchFriendRequests, fetchFriends]);

  // --- SEARCH LOGIC ---
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setLoadingSearch(false);
        return;
      }
      setLoadingSearch(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok) setSearchResults(data.users);
        else setSearchError(data.message || '検索に失敗しました。');
      } catch (err) { setSearchError('検索中にエラーが発生しました。'); }
      finally { setLoadingSearch(false); }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // --- ACTION HANDLERS ---
  const handleSendRequest = async (addresseeId: string) => {
    setRequestStatus((prev) => ({ ...prev, [addresseeId]: 'loading' }));
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleRespondToRequest = async (friendshipId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const response = await fetch(`/api/friends/requests/${friendshipId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      if (response.ok) {
        setFriendRequests((prev) => prev.filter((req) => req.id !== friendshipId));
        if (status === 'ACCEPTED') {
          // Refresh friends list after accepting a request
          fetchFriends();
        }
      } else {
        const data = await response.json();
        alert(`応答エラー: ${data.message || '不明なエラー'}`);
      }
    } catch (err) {
      alert('応答中に予期せぬエラーが発生しました。');
    }
  };
  
  const handleRemoveFriend = (friendshipId: string) => {
    // TODO: Implement friend removal logic
    alert(`フレンドを解除しました (Friendship ID: ${friendshipId})`);
  };

  const getButtonState = (userId: string) => {
    const status = requestStatus[userId];
    if (status === 'loading') return { text: '送信中...', disabled: true, className: 'bg-gray-400' };
    if (status === 'sent') return { text: '申請済み', disabled: true, className: 'bg-green-600' };
    if (status === 'error') return { text: '再試行', disabled: false, className: 'bg-red-600 hover:bg-red-700' };
    return { text: 'フレンド申請', disabled: false, className: 'bg-indigo-600 hover:bg-indigo-700' };
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">フレンド管理</h1>
          <p className="text-gray-600 mt-1">ユーザーを検索してフレンド申請を送ったり、受信した申請を確認したりできます。</p>
          <div className="mt-4"><Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">&larr; ホームに戻る</Link></div>
        </header>

        {/* Friend Requests Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">受信したフレンド申請</h2>
          {loadingRequests ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : friendRequests.length > 0 ? (
            <div className="space-y-3">
              {friendRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {req.requester.iconUrl ? <img src={req.requester.iconUrl} alt="" className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>}
                    </div>
                    <span className="ml-4 font-medium text-gray-800">{req.requester.username}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleRespondToRequest(req.id, 'ACCEPTED')} className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700">承認</button>
                    <button onClick={() => handleRespondToRequest(req.id, 'DECLINED')} className="px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700">拒否</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">受信したフレンド申請はありません。</p>
          )}
        </section>

        {/* Friends List Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">あなたのフレンド</h2>
          {loadingFriends ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : friends.length > 0 ? (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.friendshipId} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {friend.iconUrl ? <img src={friend.iconUrl} alt="" className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>}
                    </div>
                    <span className="ml-4 font-medium text-gray-800">{friend.username}</span>
                  </div>
                  <button onClick={() => handleRemoveFriend(friend.friendshipId)} className="px-3 py-1.5 bg-gray-500 text-white text-sm font-semibold rounded-md hover:bg-gray-600">フレンド解除</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">まだフレンドはいません。</p>
          )}
        </section>

        {/* User Search Section */}
        <section>
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
          {searchError && <p className="text-red-500 mt-2">{searchError}</p>}
          <div className="mt-4 space-y-3">
            {loadingSearch ? (
              <p className="text-gray-500">検索中...</p>
            ) : (
              searchResults.map((user) => {
                const buttonState = getButtonState(user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                        {user.iconUrl ? <img src={user.iconUrl} alt="" className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>}
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
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
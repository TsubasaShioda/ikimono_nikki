'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// --- TYPE DEFINITIONS ---
interface Commenter {
  id: string;
  username: string;
  iconUrl: string | null;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: Commenter;
  userId: string;
}

interface CommentSectionProps {
  entryId: string;
  currentUserId: string | null;
  entryAuthorId: string;
}

// --- MAIN COMPONENT ---
export default function CommentSection({ entryId, currentUserId, entryAuthorId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entryId) return;
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/entries/${entryId}/comments`);
        if (!res.ok) throw new Error('コメントの読み込みに失敗しました。');
        const data = await res.json();
        setComments(data.comments);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [entryId]);

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    try {
      const res = await fetch(`/api/entries/${entryId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'コメントの投稿に失敗しました。');
      }
      setComments(prev => [...prev, data.comment]); // Add new comment to the list
      setNewComment(''); // Clear textarea
    } catch (err) {
      alert(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('本当にこのコメントを削除しますか？')) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'コメントの削除に失敗しました。');
      }
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  return (
    <div className="mt-8 pt-6 border-t">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">コメント</h3>
      {/* Comment Submission Form */}
      {currentUserId && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
            rows={3}
            placeholder="コメントを追加..."
            required
          />
          <div className="flex justify-end mt-2">
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={!newComment.trim()}>
              投稿する
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-600">コメントを読み込み中...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="flex items-start space-x-3">
              <Link href={`/entries/user/${comment.user.id}`}>
                <Image 
                  src={comment.user.iconUrl || '/default-avatar.svg'} 
                  alt={comment.user.username} 
                  width={40} 
                  height={40} 
                  className="rounded-full w-10 h-10 object-cover bg-gray-200"
                />
              </Link>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href={`/entries/user/${comment.user.id}`} className="font-semibold text-gray-800 hover:underline">{comment.user.username}</Link>
                        <span className="text-gray-500 text-xs ml-2">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    {(currentUserId === comment.userId || currentUserId === entryAuthorId) && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-400 hover:text-red-600 text-xs">削除</button>
                    )}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">まだコメントはありません。</p>
        )}
      </div>
    </div>
  );
}

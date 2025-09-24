'use client';

import React from 'react';
import styles from './InfoModalContent.module.css';

const InfoModalContent: React.FC = () => {
  return (
    <div className={`${styles.post_it} space-y-4`}>
      <p>このアプリは、あなたの周りの生き物との出会いを記録し、共有するためのものです。</p>
      
      <h3 className="text-xl font-semibold">主な機能</h3>
      <ul className="list-disc list-inside">
        <li>新規投稿: 見つけた生き物の写真、場所、説明などを記録できます。</li>
        <li>地図表示: 投稿された生き物の場所を地図上で確認できます。</li>
        <li>プロフィール編集: ユーザー名やアイコン、自己紹介文を変更できます。</li>
        <li>フレンド機能: 他のユーザーとフレンドになり、限定公開の日記を共有できます。</li>
        <li>アルバム機能: 気に入った日記をアルバムに保存し、後で見返すことができます。</li>
        <li>検索・フィルター: キーワード、カテゴリ、場所、日付などで日記を絞り込めます。</li>
      </ul>

      <h3 className="text-xl font-semibold">使い方</h3>
      <ul className="list-disc list-inside">
        <li>ログイン: アプリの全機能を利用するにはログインが必要です。</li>
        <li>投稿: 地図上の「+」ボタンから新しい日記を投稿できます。</li>
        <li>閲覧: 地図上のピンをクリックすると、日記の詳細が表示されます。</li>
        <li>編集・削除: 自分の投稿は、詳細ページから編集・削除できます。</li>
        <li>プライバシー設定: 日記の公開範囲を「公開」「フレンドのみ」「非公開」から選べます。</li>
      </ul>
    </div>
  );
};

export default InfoModalContent;

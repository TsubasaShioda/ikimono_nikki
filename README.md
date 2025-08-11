This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# 基本設計書：生き物日記アプリ

## 1. 概要

### 1.1. アプリケーション名
生き物日記 (Ikimono Nikki)

### 1.2. コンセプト
発見した生き物の情報を、写真や場所と紐づけて記録し、地図上で可視化する。また、その記録を他のユーザーと共有し、生き物に関するコミュニケーションを促進する。

## 2. ターゲットユーザー
-   自然観察が趣味の人

## 3. 機能要件

| 大項目 | 機能 | 詳細 |
| :--- | :--- | :--- |
| ユーザー管理 | ユーザー認証 | - メールアドレスとパスワードによる新規登録・ログイン機能<br>- ログアウト機能 |
| 日記管理 | 日記投稿機能 | - 生き物の名前、説明、写真、発見日時を記録できる<br>- 地図上をクリックして場所を指定できる<br>- GPSを使用して現在地を取得する機能 |
| | 日記編集・削除機能 | - 投稿した日記の内容を後から編集・削除できる |
| 表示機能 | 地図表示機能 | - 投稿した日記を地図上にピンで表示する<br>- ピンをクリックすると日記の概要（写真、名前）を表示する |
| | 一覧表示機能 | - 投稿した日記を時系列やリスト形式で表示する |
| | 詳細表示機能 | - 日記の全ての情報（写真、説明、地図など）を表示する |
| 共有機能 | 公開設定機能 | - 日記を「公開」または「非公開」に設定できる |
| | 他ユーザーの記録表示 | - 「公開」に設定された他のユーザーの日記を地図上や一覧で閲覧できる |
| 検索機能 | キーワード検索 | - 生き物の名前や説明文に含まれるキーワードで日記を検索できる |
| | エリア検索 | - 地図上で範囲を指定し、その中の記録を検索できる |

## 4. 画面設計

1.  トップページ: アプリケーションの紹介、ログイン・新規登録への導線。
2.  ログイン/新規登録ページ: 認証フォーム。
3.  メインページ（地図）: ユーザー自身の、または公開されている日記が地図上に表示される。
4.  日記投稿/編集ページ: 日記情報を入力するフォーム。
5.  日記一覧ページ: 投稿を時系列リストで表示する。
6.  日記詳細ページ: 個別の日記の全情報を表示する。
7.  設定ページ: プロフィール編集、公開設定の変更など。

## 5. データ設計（データベーススキーマ案）

### 5.1. `users` テーブル
| カラム名 | データ型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` | ユーザーID (主キー) |
| `username` | `varchar(255)` | ユーザー名 |
| `email` | `varchar(255)` | メールアドレス (ユニーク) |
| `password_hash` | `varchar(255)` | ハッシュ化されたパスワード |
| `created_at` | `timestamp` | 登録日時 |

### 5.2. `diary_entries` テーブル
| カラム名 | データ型 | 説明 |
| :--- | :--- | :--- |
| `id` | `uuid` | 日記ID (主キー) |
| `user_id` | `uuid` | 投稿したユーザーのID (外部キー) |
| `title` | `varchar(255)` | 生き物の名前・タイトル |
| `description` | `text` | 説明文 |
| `image_url` | `varchar(255)` | アップロードした画像のURL |
| `latitude` | `double precision` | 緯度 |
| `longitude` | `double precision` | 経度 |
| `is_public` | `boolean` | 公開設定 (true: 公開) |
| `taken_at` | `timestamp` | 発見日時 |
| `created_at` | `timestamp` | 投稿日時 |

## 6. 技術スタック

-   フレームワーク: Next.js
-   言語: TypeScript
-   スタイリング: Tailwind CSS
-   ORM: Prisma
-   地図ライブラリ: Leaflet
-   データベース: MySQL
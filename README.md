# RoomPlanner

部屋のレイアウトを検討するためのWebアプリです。部屋のサイズを設定し、キャンバス上で家具や設備を配置・編集できます。

## 機能

- 部屋（複数可）のサイズ設定と、家具・設備の配置編集
- 家具リストからの選択・編集、キーボードショートカット、操作の取り消し／やり直し
- レイアウトのテンプレート保存、JSON形式のインポート／エクスポート
- ログインしたユーザーは、レイアウトとテンプレートがクラウドに保存されます

## 技術構成

- React 18 + Vite 5
- Firebase 12（Authentication：メールアドレス／Google、Realtime Database）

Firebase の接続情報は環境変数で渡します。`.env` に `VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_AUTH_DOMAIN`、`VITE_FIREBASE_DATABASE_URL`、`VITE_FIREBASE_PROJECT_ID`、`VITE_FIREBASE_STORAGE_BUCKET`、`VITE_FIREBASE_MESSAGING_SENDER_ID`、`VITE_FIREBASE_APP_ID` を設定してください。

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # ビルド
npm run preview  # ビルド結果のプレビュー
```

## 構成

- `src/components/`：キャンバス、編集パネル、設定モーダルなどのUI
- `src/state/`：レイアウトの状態管理（reducerと履歴）
- `src/hooks/`、`src/utils/`：ショートカットやレイアウト計算の補助
- `src/firebase.js`：認証とデータ保存

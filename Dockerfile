# Node.js LTS
FROM node:20-alpine

# 作業ディレクトリ
WORKDIR /app

# package.json だけ先にコピー（キャッシュ効かせる）
COPY package*.json ./

# 依存関係インストール
RUN npm install

# ソース全部コピー
COPY . .

# Vite の開発サーバポート
EXPOSE 5173

# 起動コマンド
CMD ["npm", "run", "dev", "--", "--host"]

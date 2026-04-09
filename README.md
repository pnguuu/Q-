# Valorant Masters Santiago Schedule App

This application provides a real-time schedule for Valorant and League of Legends matches, with a focus on major international and regional events.

## 静态站架构说明

本项目已重构为“静态站 + 定时生成数据”架构，适合部署到 GitHub Pages。

- **前端**：纯静态 React 应用，读取 `public/matches.json`。
- **数据更新**：通过 GitHub Actions 每小时运行一次抓取脚本，更新 `public/matches.json` 并提交回仓库。

## 环境配置

需要在 GitHub 仓库中配置以下 Secret：
- `PANDASCORE_ACCESS_TOKEN`: 你的 PandaScore API 访问令牌。

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```
2. 在 `.env` 中设置 `PANDASCORE_ACCESS_TOKEN`。
3. 运行开发服务器（会自动先抓取一次数据）：
   ```bash
   npm run dev
   ```

## 部署说明 (GitHub Pages)

1. 确保已在 GitHub Settings > Secrets > Actions 中添加 `PANDASCORE_ACCESS_TOKEN`。
2. GitHub Actions 会自动定时更新数据。
3. 部署时，运行 `npm run build` 即可生成包含最新数据的静态文件。

## Features

- **Real-time Schedule**: Fetches the latest matches from PandaScore.
- **Intelligent Categorization**: Automatically identifies Primary Leagues, International Events, and Regional Extensions.
- **Valorant Focus**: Specialized logic for identifying Valorant Masters and Champions events.
- **Deep History**: Fetches up to 5000 past matches to ensure comprehensive coverage of the current year.

#!/usr/bin/env bash
# 一键部署到 GitHub Pages（请在本机终端运行，不要在 WorkBuddy 沙箱内运行）
set -e
cd "$(dirname "$0")"

echo "==> 推送 main 分支（源码）..."
git push -u origin main

echo "==> 推送 gh-pages 分支（构建产物）..."
git push -u origin gh-pages

echo ""
echo "=================================================="
echo " 推送完成！请到 GitHub 仓库开启 Pages："
echo "   Settings → Pages → Source 选 'Deploy from a branch'"
echo "   分支选 'gh-pages' / 目录选 '/ (root)' → Save"
echo ""
echo "   几分钟后访问："
echo "   https://DanielDong1026.github.io/order-tracking/"
echo "=================================================="

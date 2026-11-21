#!/usr/bin/env bash
# 星光谷 · 发布到 GitHub Pages
# 用法：bash deploy.sh "这次改了什么"
# 说明：这台机器直连 github.com:443 不通（ssh 也没配 key），所以走 api.github.com 发布，
#       实现在 tools/push_api.py。远端树是唯一真相。
set -e
cd "$(dirname "$0")"
MSG="${1:-update game}"
echo "[deploy] 上传变动的文件 ..."
python tools/push_api.py "$MSG"
echo "[deploy] Pages 大约 30~60 秒重建"
echo "[deploy] 网址：https://luciaxxsun.github.io/"

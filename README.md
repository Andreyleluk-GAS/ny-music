# Новогодний вайб 🎄 — музыкальный плеер по QR

Структура: `index.html`, `style.css`, `app.js`, `tracks.json`, `audio/`.

Локальный запуск (fetch не работает с `file://`): `python -m http.server 8000` → http://localhost:8000

## Песни
1. Положите mp3 в `audio/`.
2. Добавьте/удалите объект в `tracks.json` (после последнего элемента запятой быть не должно):
```json
{ "id": "t6", "title": "Название", "artist": "Исполнитель", "file": "audio/song.mp3", "emoji": "🎁" }
```
`id` должен быть уникальным (по нему хранятся реакции). Рекомендуется 15–20 треков.

### Сжатие mp3 (ffmpeg)
```
ffmpeg -i in.mp3 -b:a 128k -ac 2 -map_metadata -1 audio/song.mp3
```
128 kbps ≈ 1 МБ/мин; для слабого интернета — `-b:a 96k`. Обрезать до 2–3 минут: добавьте `-t 150`.

## GitHub Pages за 5 минут
1. Создайте публичный репозиторий на github.com.
2. Загрузите все файлы (Add file → Upload files) или `git init && git add . && git commit -m init && git remote add origin <url> && git push -u origin main`.
3. Settings → Pages → Source: *Deploy from a branch*, ветка `main`, папка `/ (root)` → Save.
4. Через 1–2 минуты ссылка: `https://<логин>.github.io/<репозиторий>/`.

Лимиты: репозиторий до ~1 ГБ, файл до 100 МБ.

## Nginx
```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/newyear;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json;

    location /audio/ {
        add_header Cache-Control "public, max-age=2592000";
        add_header Accept-Ranges bytes;   # нужно для перемотки
    }
    location = /tracks.json { add_header Cache-Control "no-cache"; }
}
```
HTTPS: `certbot --nginx -d example.com`.

## QR-код
- Онлайн: qrcode-monkey.com или qr-code-generator.com — вставьте ссылку, скачайте SVG/PNG высокого разрешения.
- Через Python: `pip install qrcode[pil]` → `qr "https://login.github.io/repo/" > qr.png`.
- Печать: не меньше 8×8 см, чёрное на белом, с полем вокруг; проверьте сканирование с iPhone и Android.

## Реакции на сервере
Все обращения к хранилищу — в объекте `Store` в начале `app.js` (`loadCounts`, `sendReaction`). Замените на `fetch` к вашему API. Сейчас счётчики только локальные (на одном телефоне).

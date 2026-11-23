# Реакции на Yandex Cloud (YDB + Cloud Functions)

Схема: сайт → HTTPS-функция (`index.js`) → YDB Serverless. Один голос на трек на устройство (UUID в localStorage).

## 1. База (у вас уже создана `ydb351`)
Консоль → YDB → ваша база → **Навигация** → **Новый SQL-запрос** → выполните содержимое `schema.sql`.
На вкладке «Обзор» скопируйте **Эндпоинт** (`grpcs://ydb.serverless.yandexcloud.net:2135`) и **Базу данных** (`/ru-central1/b1g…/etn…`).

> Если база «Dedicated», а не Serverless, эндпоинт будет другим — копируйте с вкладки «Обзор».

## 2. Сервисный аккаунт
IAM → Сервисные аккаунты → Создать, например `ny-func`, роли: **ydb.editor** (на каталог/базу) и **functions.functionInvoker**.

## 3. Функция
Cloud Functions → Создать функцию `ny-reactions` → Редактор:
- Среда выполнения: **nodejs18** (или новее), точка входа: `index.handler`
- Загрузите `index.js` и `package.json` (можно ZIP-архивом из папки `backend`; зависимости поставятся из package.json)
- Сервисный аккаунт: `ny-func`
- Переменные окружения: `YDB_ENDPOINT`, `YDB_DATABASE` (из шага 1)
- Включите **публичную функцию** (Обзор → «Публичная функция»)
- Таймаут 10–30 с, память 128 МБ

## 4. Подключение к сайту
Скопируйте **ссылку для вызова** функции (`https://functions.yandexcloud.net/d4e...`) в `config.js`:
```js
window.API_URL = 'https://functions.yandexcloud.net/...';
```
Затем `git commit` и `git push` — GitHub Pages обновится.

## Проверка
`curl "<URL>?client=test"` → `{"counts":{},"mine":{}}`.

Без `API_URL` (или при ошибке сервера) сайт работает в локальном режиме.

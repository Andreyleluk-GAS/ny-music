# ============================================================
#  🎄 NY Music — Загрузка и Обновление Треков
#  Работает СТРОГО с tracks.json и папкой audio/
#  Остальные файлы проекта (HTML, CSS, JS, скрипты и т.д.) НЕ затрагиваются!
# ============================================================

$Host.UI.RawUI.WindowTitle = "🎄 NY Music — Обновление Треков"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Header {
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║       🎄  NY Music — Загрузка и Обновление Треков  🎄     ║" -ForegroundColor Cyan
    Write-Host "  ║       (Работает ИСКЛЮЧИТЕЛЬНО с tracks.json и audio/)     ║" -ForegroundColor DarkCyan
    Write-Host "  ╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step { param($msg) Write-Host "  ▶ $msg" -ForegroundColor Yellow }
function Write-OK   { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor DarkYellow }
function Write-Fail { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "    $msg" -ForegroundColor Gray }

function Format-Size {
    param([long]$bytes)
    if ($bytes -ge 1GB) { return "{0:N2} GB" -f ($bytes / 1GB) }
    if ($bytes -ge 1MB) { return "{0:N2} MB" -f ($bytes / 1MB) }
    if ($bytes -ge 1KB) { return "{0:N0} KB" -f ($bytes / 1KB) }
    return "$bytes B"
}

function Exit-WithError {
    param($msg)
    Write-Host ""
    Write-Fail $msg
    # Снимаем индексацию, чтобы не оставлять staged файлы
    git restore --staged . 2>$null | Out-Null
    Write-Host ""
    Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Set-Location $PSScriptRoot
Write-Header

# ── 1. Проверка репозитория ──────────────────────────────
Write-Step "Проверка git-репозитория..."
if (-not (Test-Path ".git")) {
    Exit-WithError "Папка не является git-репозиторием!"
}
Write-OK "Git репозиторий OK"

# ── 2. Валидация tracks.json ──────────────────────────────
Write-Step "Проверка файла tracks.json..."
if (-not (Test-Path "tracks.json")) {
    Exit-WithError "Файл tracks.json не найден в корне проекта!"
}

$tracks = $null
try {
    $tracksContent = [System.IO.File]::ReadAllText("$PSScriptRoot\tracks.json", [System.Text.Encoding]::UTF8)
    $tracks = $tracksContent | ConvertFrom-Json
    $trackCount = if ($tracks -is [Array]) { $tracks.Count } else { 1 }
    Write-OK "tracks.json корректен (всего записей: $trackCount)"
} catch {
    Exit-WithError "ОШИБКА СИНТАКСИСА в tracks.json:`n    $_`n  Проверьте пропущенные или лишние запятые!"
}

# ── 3. Двойная проверка аудио файлов ─────────────────────
Write-Step "Проверка наличия и соответствия аудиофайлов..."
$missingAudio = @()
$referencedFiles = @{}

foreach ($track in $tracks) {
    if (-not $track.file) { continue }
    $normPath = $track.file.Replace("/", "\")
    $referencedFiles[$normPath] = $track
    $fullPath = Join-Path $PSScriptRoot $normPath

    if (-not (Test-Path $fullPath)) {
        $missingAudio += "  ✗ $normPath  ← указан для '$($track.title)' ($($track.artist))"
    }
}

if ($missingAudio.Count -gt 0) {
    Write-Host ""
    Write-Fail "Указанные в tracks.json файлы отсутствуют на диске:"
    $missingAudio | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
    $confirm = Read-Host "  Продолжить всё равно? (y/n)"
    if ($confirm -ne "y") {
        Exit-WithError "Операция отменена. Добавьте недостающие файлы или удалите их из tracks.json."
    }
} else {
    Write-OK "Все файлы из tracks.json присутствуют на диске"
}

# Дополнительно: есть ли файлы в audio/, не упомянутые в tracks.json?
if (Test-Path "audio") {
    $diskAudio = Get-ChildItem -Path "audio" -File | Where-Object { $_.Extension -match '^\.(mp3|wav|ogg|m4a|aac|flac)$' }
    $unregistered = @()
    foreach ($f in $diskAudio) {
        $rel = "audio\$($f.Name)"
        if (-not $referencedFiles.ContainsKey($rel) -and -not $referencedFiles.ContainsKey("audio/$($f.Name)")) {
            $unregistered += $f.Name
        }
    }
    if ($unregistered.Count -gt 0) {
        Write-Warn "В папке audio/ есть файлы, которых ещё нет в tracks.json:"
        $unregistered | ForEach-Object { Write-Info "• $_" }
        Write-Info "(Если хотите их добавить в плеер — пропишите их в tracks.json)"
        Write-Host ""
    }
}

# ── 4. Проверка других файлов проекта (информационно) ────
# Проверяем, есть ли изменения в других файлах, чтобы уведомить пользователя,
# что этот скрипт их сознательно НЕ трогает.
$allStatus = git status --porcelain 2>&1
$otherChanges = @()
foreach ($line in $allStatus) {
    if ($line.Length -gt 3) {
        $filePath = $line.Substring(3).Trim('"', ' ')
        if ($filePath -ne "tracks.json" -and -not $filePath.StartsWith("audio/") -and -not $filePath.StartsWith("audio\")) {
            $otherChanges += $filePath
        }
    }
}

if ($otherChanges.Count -gt 0) {
    Write-Info "ℹ️  Файлы вне треков (пропускаются скриптом):"
    $shown = 0
    foreach ($f in $otherChanges) {
        if ($shown -lt 5) { Write-Info "   [пропущен] $f" }
        $shown++
    }
    if ($shown -gt 5) {
        Write-Info "   ... и ещё $($shown - 5) файл(ов)"
    }
    Write-Info "   (Этот скрипт обновляет ТОЛЬКО треки; всё остальное загружается отдельно)"
    Write-Host ""
}

# ── 5. ИЗОЛИРОВАННАЯ индексация ТОЛЬКО tracks.json и audio/ ───
Write-Step "Анализ изменений в tracks.json и audio/..."

# 1) Сбрасываем любой ранее созданный индекс, чтобы чужие файлы не попали случайно
git restore --staged . 2>$null | Out-Null

# 2) Индексируем СТРОГО tracks.json и папку audio/
git add -- tracks.json audio 2>&1 | Out-Null

# 3) Смотрим изменения ТОЛЬКО среди проиндексированных файлов
$staged = git diff --cached --name-status 2>&1

$newAudio      = @()
$replacedAudio = @()
$deletedAudio  = @()
$tracksJsonStatus = $null

foreach ($line in $staged) {
    if ($line -match '^([AMDRT])\s+(.+)$') {
        $flag = $Matches[1]
        $file = $Matches[2].Trim('"', ' ')

        if ($file -eq "tracks.json") {
            $tracksJsonStatus = $flag
            continue
        }

        # Файлы из папки audio
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $isAudio = ($ext -in @(".mp3", ".ogg", ".wav", ".aac", ".flac", ".m4a"))
        $fileName = [System.IO.Path]::GetFileName($file)

        switch ($flag) {
            "A" {
                $size = if (Test-Path $file) { (Get-Item $file).Length } else { 0 }
                $newAudio += [PSCustomObject]@{
                    Path = $file
                    Name = $fileName
                    Size = $size
                    SizeStr = Format-Size $size
                }
            }
            "M" {
                # Двойная проверка размера в байтах до и после
                $sizeBefore = git cat-file -s "HEAD:$file" 2>$null
                $sizeAfter  = if (Test-Path $file) { (Get-Item $file).Length } else { 0 }
                $beforeStr  = if ($sizeBefore) { Format-Size ([long]$sizeBefore) } else { "новый" }
                $afterStr   = Format-Size ([long]$sizeAfter)

                $replacedAudio += [PSCustomObject]@{
                    Path = $file
                    Name = $fileName
                    SizeBefore = $sizeBefore
                    SizeAfter  = $sizeAfter
                    DiffStr    = "$beforeStr → $afterStr"
                }
            }
            "D" {
                $deletedAudio += [PSCustomObject]@{
                    Path = $file
                    Name = $fileName
                }
            }
        }
    }
}

# Проверяем: есть ли изменения в треках?
$hasChanges = ($newAudio.Count -gt 0) -or ($replacedAudio.Count -gt 0) -or ($deletedAudio.Count -gt 0) -or ($tracksJsonStatus -ne $null)

if (-not $hasChanges) {
    # Снимаем индексацию
    git restore --staged . 2>$null | Out-Null
    Write-Host ""
    Write-OK "Изменений в треках не обнаружено (tracks.json и audio/ без изменений)."
    Write-Info "Скрипт завершил работу без изменений в репозитории."
    Write-Host ""
    Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

# ── 6. Подробный отчет об изменениях ─────────────────────
Write-Host ""
Write-Host "  ┌────────────────────────────────────────────────────────────┐" -ForegroundColor DarkCyan
Write-Host "  │           СПИСОК ИЗМЕНЕНИЙ ТРЕКОВ ДЛЯ ЗАГРУЗКИ             │" -ForegroundColor DarkCyan
Write-Host "  └────────────────────────────────────────────────────────────┘" -ForegroundColor DarkCyan

if ($newAudio.Count -gt 0) {
    Write-Host ""
    Write-Host "  🆕 НОВЫЕ ТРЕКИ ($($newAudio.Count)):" -ForegroundColor Green
    foreach ($item in $newAudio) {
        Write-Host "     + $($item.Name)  $($item.SizeStr)" -ForegroundColor Green
    }
}

if ($replacedAudio.Count -gt 0) {
    Write-Host ""
    Write-Host "  🔄 ЗАМЕНЕННЫЕ МЕЛОДИИ ($($replacedAudio.Count)):" -ForegroundColor Magenta
    foreach ($item in $replacedAudio) {
        Write-Host "     ↺ $($item.Name)  (размер: $($item.DiffStr))" -ForegroundColor Magenta
    }
}

if ($deletedAudio.Count -gt 0) {
    Write-Host ""
    Write-Host "  🗑️  УДАЛЁННЫЕ ТРЕКИ ($($deletedAudio.Count)):" -ForegroundColor Red
    foreach ($item in $deletedAudio) {
        Write-Host "     - $($item.Name)" -ForegroundColor Red
    }
}

if ($tracksJsonStatus) {
    Write-Host ""
    Write-Host "  📝 ПЛЕЙЛИСТ: tracks.json изменён (всего треков: $trackCount)" -ForegroundColor Cyan
}

# Подсчёт общего объёма аудио для загрузки
$uploadBytes = 0
foreach ($item in $newAudio) { $uploadBytes += $item.Size }
foreach ($item in $replacedAudio) { $uploadBytes += $item.SizeAfter }

Write-Host ""
if ($uploadBytes -gt 0) {
    Write-Host "  📦 Примерный объём загружаемых аудиоданных: $(Format-Size $uploadBytes)" -ForegroundColor Yellow
    Write-Host ""
}

# ── 7. Формирование понятного сообщения коммита ──────────
$msgParts = @()
if ($newAudio.Count -gt 0) {
    $names = ($newAudio | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) }) -join ", "
    $msgParts += "Add $names"
}
if ($replacedAudio.Count -gt 0) {
    $names = ($replacedAudio | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) }) -join ", "
    $msgParts += "Replace $names"
}
if ($deletedAudio.Count -gt 0) {
    $names = ($deletedAudio | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) }) -join ", "
    $msgParts += "Delete $names"
}
if ($tracksJsonStatus) {
    $msgParts += "update tracks.json"
}
if ($msgParts.Count -eq 0) {
    $msgParts += "Update tracks"
}

$commitMsg = $msgParts -join " | "
Write-Host "  💬 Коммит: ""$commitMsg""" -ForegroundColor DarkYellow
Write-Host ""

# ── 8. Запрос подтверждения у пользователя ───────────────
Write-Host "  Только эти файлы будут отправлены на GitHub." -ForegroundColor White
$confirm = Read-Host "  Загрузить на GitHub? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y" -and $confirm -ne "д" -and $confirm -ne "Д") {
    # Снимаем индексацию
    git restore --staged . 2>$null | Out-Null
    Write-Host ""
    Write-Info "Загрузка отменена пользователем. Файлы остались нетронутыми."
    Write-Host ""
    Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host ""

# ── 9. git commit ─────────────────────────────────────────
Write-Step "Создание коммита (только треки)..."
git commit -m $commitMsg 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) {
    Exit-WithError "Ошибка при создании git commit!"
}
Write-OK "Коммит успешно создан"

# ── 10. git push ──────────────────────────────────────────
Write-Step "Отправка на GitHub (git push origin main)..."
Write-Info "Идёт передача данных. Если загружаются тяжёлые MP3, это займёт немного времени..."
Write-Host ""

git push origin main 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Exit-WithError "Ошибка git push. Проверьте интернет-соединение или доступ к GitHub."
}

Write-OK "Данные успешно доставлены на GitHub!"

# ── 11. Финал ─────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   🎉  Треки успешно обновлены и развёрнуты!                ║" -ForegroundColor Green
Write-Host "  ╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl -match "github\.com[:/](.+?)(?:\.git)?$") {
    $repoPath = $Matches[1]
    $user     = $repoPath.Split('/')[0]
    $repo     = $repoPath.Split('/')[1]
    Write-Host "  🌐 Сайт плеера:  https://$user.github.io/$repo/" -ForegroundColor Cyan
    Write-Host "  📦 Репозиторий:  https://github.com/$repoPath" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  (Сайт на GitHub Pages обновится в течение 1-2 минут)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

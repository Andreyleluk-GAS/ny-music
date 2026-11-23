# ============================================================
#  🎄 NY Music — Deploy Script
#  Добавляет новые треки и пушит на GitHub Pages
# ============================================================

$Host.UI.RawUI.WindowTitle = "🎄 NY Music Deploy"

function Write-Header {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║       🎄  NY Music — Deploy Tool  🎄      ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step { param($msg) Write-Host "  ▶ $msg" -ForegroundColor Yellow }
function Write-OK   { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  · $msg" -ForegroundColor Gray }

function Exit-WithError {
    param($msg)
    Write-Host ""
    Write-Fail $msg
    Write-Host ""
    Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ── Переходим в папку скрипта ─────────────────────────────
Set-Location $PSScriptRoot

Write-Header

# ── 1. Проверка: это git-репозиторий? ────────────────────
Write-Step "Проверка репозитория..."
if (-not (Test-Path ".git")) {
    Exit-WithError "Папка не является git-репозиторием. Запустите скрипт из корня проекта."
}
Write-OK "Git репозиторий найден"

# ── 2. Валидация tracks.json ──────────────────────────────
Write-Step "Проверка tracks.json..."
if (-not (Test-Path "tracks.json")) {
    Exit-WithError "Файл tracks.json не найден!"
}

try {
    $tracksContent = [System.IO.File]::ReadAllText("$PSScriptRoot\tracks.json", [System.Text.Encoding]::UTF8)
    $tracks = $tracksContent | ConvertFrom-Json
    $trackCount = if ($tracks -is [Array]) { $tracks.Count } else { 1 }
    Write-OK "tracks.json валиден — $trackCount трек(ов)"
} catch {
    Exit-WithError "ОШИБКА в tracks.json: $_`n  Проверьте запятые между записями!"
}

# ── 3. Аудио файлы ───────────────────────────────────────
Write-Step "Проверка аудио файлов..."
$missingAudio = @()
foreach ($track in $tracks) {
    $audioPath = Join-Path $PSScriptRoot $track.file
    if (-not (Test-Path $audioPath)) {
        $missingAudio += $track.file
    }
}
if ($missingAudio.Count -gt 0) {
    Write-Host ""
    Write-Fail "Аудио файлы из tracks.json отсутствуют на диске:"
    $missingAudio | ForEach-Object { Write-Info $_ }
    Write-Host ""
    $confirm = Read-Host "  Продолжить всё равно? (y/n)"
    if ($confirm -ne "y") { exit 1 }
} else {
    Write-OK "Все аудио файлы на месте"
}

# ── 4. Смотрим что изменилось ─────────────────────────────
Write-Step "Анализ изменений..."
$statusLines = git status --short 2>&1
if ($statusLines) {
    Write-Host ""
    Write-Host "  Изменения:" -ForegroundColor Cyan
    $newFiles     = @()
    $modifiedFiles = @()
    foreach ($line in $statusLines) {
        $flag    = $line.Substring(0, 2).Trim()
        $file    = $line.Substring(3).Trim()
        $marker  = switch ($flag) {
            "??" { "🆕 Новый";     $newFiles += $file }
            "M"  { "✏️  Изменён";  $modifiedFiles += $file }
            "A"  { "✅ Добавлен";  $newFiles += $file }
            "D"  { "🗑️  Удалён";   $newFiles += $file }
            default { "·  $_" }
        }
        Write-Info "  $marker  — $file"
    }
    Write-Host ""
} else {
    Write-Host ""
    Write-OK "Нет изменений для коммита."
    Write-Host ""
    Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

# ── 5. Формируем сообщение коммита ───────────────────────
$newTracks = @()
foreach ($t in $tracks) {
    $audioPath = Join-Path $PSScriptRoot $t.file
    $gitCheck  = git ls-files --error-unmatch $t.file 2>$null
    if ($LASTEXITCODE -ne 0) {
        $newTracks += "$($t.emoji) $($t.title) — $($t.artist)"
    }
}

if ($newTracks.Count -gt 0) {
    $commitMsg = "Add track(s): " + ($newTracks -join " | ")
} else {
    $commitMsg = "Update tracks.json and audio"
}

Write-Info "Сообщение коммита: $commitMsg"
Write-Host ""

# ── 6. Подтверждение ─────────────────────────────────────
$ok = Read-Host "  Запустить git add → commit → push? (y/n)"
if ($ok -ne "y") {
    Write-Info "Отменено."
    Write-Host ""
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host ""

# ── 7. git add ────────────────────────────────────────────
Write-Step "git add ."
git add . 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) { Exit-WithError "git add завершился с ошибкой" }
Write-OK "Файлы добавлены в индекс"

# ── 8. git commit ─────────────────────────────────────────
Write-Step "git commit..."
git commit -m $commitMsg 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) { Exit-WithError "git commit завершился с ошибкой" }
Write-OK "Коммит создан"

# ── 9. git push ───────────────────────────────────────────
Write-Step "git push origin main..."
Write-Info "(Идёт загрузка, подождите...)"
git push origin main 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) { Exit-WithError "git push завершился с ошибкой. Проверьте интернет и права доступа." }
Write-OK "Загружено на GitHub!"

# ── 10. Финал ─────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   ✅  Деплой завершён успешно! 🎉        ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Получаем URL репозитория
$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl -match "github\.com[:/](.+?)(?:\.git)?$") {
    $repoPath = $Matches[1]
    Write-Host "  🌐 Сайт: https://$($repoPath.Split('/')[0]).github.io/$($repoPath.Split('/')[1])/" -ForegroundColor Cyan
    Write-Host "  📦 Репо: https://github.com/$repoPath" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

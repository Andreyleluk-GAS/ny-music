# ============================================================
#  🎄 NY Music — Deploy Script
#  Добавляет/заменяет треки и пушит на GitHub Pages
# ============================================================

$Host.UI.RawUI.WindowTitle = "🎄 NY Music Deploy"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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
function Write-Info { param($msg) Write-Host "    $msg" -ForegroundColor Gray }

function Exit-WithError {
    param($msg)
    Write-Host ""
    Write-Fail $msg
    Write-Host ""
    Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Set-Location $PSScriptRoot
Write-Header

# ── 1. Git репозиторий? ───────────────────────────────────
Write-Step "Проверка репозитория..."
if (-not (Test-Path ".git")) {
    Exit-WithError "Папка не является git-репозиторием!"
}
Write-OK "Git репозиторий OK"

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

# ── 3. Проверка аудио файлов ──────────────────────────────
Write-Step "Проверка аудио файлов..."
$missingAudio = @()
foreach ($track in $tracks) {
    $audioPath = Join-Path $PSScriptRoot $track.file
    if (-not (Test-Path $audioPath)) {
        $missingAudio += "  ✗ $($track.file)  ← '$($track.title)' ($($track.artist))"
    }
}
if ($missingAudio.Count -gt 0) {
    Write-Host ""
    Write-Fail "Файлы из tracks.json отсутствуют на диске:"
    $missingAudio | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
    $confirm = Read-Host "  Продолжить всё равно? (y/n)"
    if ($confirm -ne "y") { exit 1 }
} else {
    Write-OK "Все $trackCount аудио файлов на месте"
}

# ── 4. Анализ изменений через git ─────────────────────────
Write-Step "Анализ изменений..."

# git add всё чтобы git мог сравнить размеры/хеши бинарников
git add . 2>&1 | Out-Null

$staged = git diff --cached --name-status 2>&1

$newAudio      = @()
$replacedAudio = @()
$deletedAudio  = @()
$otherChanges  = @()

foreach ($line in $staged) {
    if ($line -match '^([AMDRT])\s+(.+)$') {
        $flag = $Matches[1]
        $file = $Matches[2]
        $ext  = [System.IO.Path]::GetExtension($file).ToLower()
        $isAudio = ($ext -in @(".mp3", ".ogg", ".wav", ".aac", ".flac", ".m4a"))

        # Узнаём размер файла если он есть
        $sizeStr = ""
        if (Test-Path $file) {
            $bytes = (Get-Item $file).Length
            $sizeStr = if ($bytes -ge 1MB) { " ({0:N1} MB)" -f ($bytes / 1MB) }
                       else { " ({0:N0} KB)" -f ($bytes / 1KB) }
        }

        switch ($flag) {
            "A" {
                if ($isAudio) { $newAudio      += "$file$sizeStr" }
                else          { $otherChanges  += "🆕 Новый      $file" }
            }
            "M" {
                if ($isAudio) {
                    # Показываем размер до и после
                    $sizeBefore = git cat-file -s "HEAD:$file" 2>$null
                    $sizeAfter  = if (Test-Path $file) { (Get-Item $file).Length } else { 0 }
                    $beforeStr  = if ($sizeBefore) { "{0:N1} MB" -f ($sizeBefore / 1MB) } else { "?" }
                    $afterStr   = "{0:N1} MB" -f ($sizeAfter / 1MB)
                    $replacedAudio += "$file  ($beforeStr → $afterStr)"
                } else {
                    $otherChanges += "✏️  Изменён    $file"
                }
            }
            "D" {
                if ($isAudio) { $deletedAudio  += $file }
                else          { $otherChanges  += "🗑️  Удалён     $file" }
            }
        }
    }
}

# Нет изменений?
if ($staged.Count -eq 0 -or ($staged -join "") -eq "") {
    # Возможно уже unstaged (после git add всё staged, но проверим ещё раз)
    $check = git status --short 2>&1
    if (-not $check) {
        git restore --staged . 2>&1 | Out-Null
        Write-Host ""
        Write-OK "Нет изменений для коммита — всё уже на GitHub!"
        Write-Host ""
        Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 0
    }
}

# ── 5. Показываем итоговый отчёт ──────────────────────────
Write-Host ""
Write-Host "  ┌─────────────────────────────────────────────┐" -ForegroundColor DarkCyan
Write-Host "  │            Изменения для загрузки            │" -ForegroundColor DarkCyan
Write-Host "  └─────────────────────────────────────────────┘" -ForegroundColor DarkCyan

if ($newAudio.Count -gt 0) {
    Write-Host ""
    Write-Host "  🆕 НОВЫЕ ТРЕКИ ($($newAudio.Count)):" -ForegroundColor Green
    $newAudio | ForEach-Object { Write-Host "     + $_" -ForegroundColor Green }
}
if ($replacedAudio.Count -gt 0) {
    Write-Host ""
    Write-Host "  🔄 ЗАМЕНА МЕЛОДИЙ ($($replacedAudio.Count)):" -ForegroundColor Magenta
    $replacedAudio | ForEach-Object { Write-Host "     ↺ $_" -ForegroundColor Magenta }
}
if ($deletedAudio.Count -gt 0) {
    Write-Host ""
    Write-Host "  🗑️  УДАЛЁННЫЕ ТРЕКИ ($($deletedAudio.Count)):" -ForegroundColor Red
    $deletedAudio | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
}
if ($otherChanges.Count -gt 0) {
    Write-Host ""
    Write-Host "  📝 ПРОЧИЕ ФАЙЛЫ:" -ForegroundColor Cyan
    $otherChanges | ForEach-Object { Write-Host "     $_" -ForegroundColor Cyan }
}

Write-Host ""

# Считаем размер загрузки
$totalBytes = 0
foreach ($f in $newAudio + $replacedAudio) {
    $fname = ($f -split " ")[0]
    if (Test-Path $fname) { $totalBytes += (Get-Item $fname).Length }
}
if ($totalBytes -gt 0) {
    $totalStr = if ($totalBytes -ge 1MB) { "{0:N1} MB" -f ($totalBytes / 1MB) } else { "{0:N0} KB" -f ($totalBytes / 1KB) }
    Write-Host "  📦 Объём загрузки: ~$totalStr" -ForegroundColor Yellow
    Write-Host ""
}

# ── 6. Формируем сообщение коммита ───────────────────────
$parts = @()
if ($newAudio.Count -gt 0) {
    $newNames = $newAudio | ForEach-Object {
        $fname = ($_ -split " ")[0]  # убираем "(X MB)"
        $fname = [System.IO.Path]::GetFileNameWithoutExtension($fname)
        $fname
    }
    $parts += "Add " + ($newNames -join ", ")
}
if ($replacedAudio.Count -gt 0) {
    $replNames = $replacedAudio | ForEach-Object { ($_ -split " ")[0] }
    $replNames  = $replNames | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) }
    $parts += "Replace " + ($replNames -join ", ")
}
if ($otherChanges -match "tracks.json") { $parts += "update tracks.json" }
if ($parts.Count -eq 0) { $parts += "Update files" }

$commitMsg = $parts -join " | "
Write-Host "  💬 Коммит: ""$commitMsg""" -ForegroundColor DarkYellow
Write-Host ""

# ── 7. Подтверждение ─────────────────────────────────────
$ok = Read-Host "  Загрузить на GitHub? (y/n)"
if ($ok -ne "y") {
    # Отменяем git add
    git restore --staged . 2>&1 | Out-Null
    Write-Info "Отменено. Файлы не тронуты."
    Write-Host ""
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host ""

# ── 8. git commit (add уже сделан выше) ──────────────────
Write-Step "git commit..."
git commit -m $commitMsg 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) { Exit-WithError "git commit завершился с ошибкой" }
Write-OK "Коммит создан"

# ── 9. git push ───────────────────────────────────────────
Write-Step "git push origin main..."
Write-Info "Идёт загрузка, подождите (MP3 файлы могут грузиться долго)..."
Write-Host ""
git push origin main 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Exit-WithError "git push завершился с ошибкой. Проверьте интернет и попробуйте снова."
}
Write-OK "Загружено на GitHub!"

# ── 10. Финал ─────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   ✅  Деплой завершён успешно! 🎉        ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl -match "github\.com[:/](.+?)(?:\.git)?$") {
    $repoPath = $Matches[1]
    $user     = $repoPath.Split('/')[0]
    $repo     = $repoPath.Split('/')[1]
    Write-Host "  🌐 Сайт: https://$user.github.io/$repo/" -ForegroundColor Cyan
    Write-Host "  📦 Репо: https://github.com/$repoPath" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Нажмите любую клавишу для выхода..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

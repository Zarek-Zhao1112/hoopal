param([string]$ProjectRoot = (Join-Path $PSScriptRoot '..'))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectPath = [IO.Path]::GetFullPath($ProjectRoot)
$sourcePath = Join-Path $projectPath 'resources/app-icon/curry-approved.png'
$expectedHash = '92F00107B9A45174DC425F56306EEBEA68DDA326AF70BD6F5C6138F8815A0BB3'
$originalHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
if ($originalHash -ne $expectedHash) { throw 'Approved icon master hash does not match. Refusing to generate.' }
$previewPath = Join-Path $projectPath 'artifacts/design/app-icon'
[IO.Directory]::CreateDirectory($previewPath) | Out-Null
$background = [Drawing.Color]::FromArgb(255, 73, 107, 131)
$master = [Drawing.Bitmap]::FromFile($sourcePath)
if ($master.Width -ne $master.Height) { $master.Dispose(); throw 'Approved master must be square.' }

function New-ArgbBitmap([int]$Size) {
    return [Drawing.Bitmap]::new($Size, $Size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
}
function Get-QualityGraphics([Drawing.Bitmap]$Bitmap) {
    $graphics = [Drawing.Graphics]::FromImage($Bitmap)
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    return $graphics
}
function Draw-ImageRect($Graphics, [Drawing.Image]$Image, [Drawing.Rectangle]$Target) {
    $attributes = [Drawing.Imaging.ImageAttributes]::new()
    try {
        $attributes.SetWrapMode([Drawing.Drawing2D.WrapMode]::TileFlipXY)
        $Graphics.DrawImage($Image, $Target, 0, 0, $Image.Width, $Image.Height, [Drawing.GraphicsUnit]::Pixel, $attributes)
    } finally { $attributes.Dispose() }
}
function Resize-Square([Drawing.Image]$Image, [int]$Size) {
    $bitmap = New-ArgbBitmap $Size
    $graphics = Get-QualityGraphics $bitmap
    try {
        $graphics.Clear([Drawing.Color]::Transparent)
        Draw-ImageRect $graphics $Image ([Drawing.Rectangle]::new(0, 0, $Size, $Size))
    } finally { $graphics.Dispose() }
    return $bitmap
}
function Get-RoundedPath([single]$Size, [single]$Radius) {
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $Radius * 2
    $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $path.AddArc($Size-$diameter, 0, $diameter, $diameter, 270, 90)
    $path.AddArc($Size-$diameter, $Size-$diameter, $diameter, $diameter, 0, 90)
    $path.AddArc(0, $Size-$diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}
function Mask-Square([Drawing.Image]$Image, [int]$Size, [string]$Shape) {
    # Supersampling only antialiases the mask. It never redraws the character.
    $largeSize = $Size * 4
    $large = New-ArgbBitmap $largeSize
    $graphics = Get-QualityGraphics $large
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    try {
        $graphics.Clear([Drawing.Color]::Transparent)
        if ($Shape -eq 'circle') { $path.AddEllipse(0, 0, $largeSize, $largeSize) }
        else { $path.Dispose(); $path = Get-RoundedPath $largeSize ($largeSize * 0.22) }
        $graphics.SetClip($path)
        Draw-ImageRect $graphics $Image ([Drawing.Rectangle]::new(0, 0, $largeSize, $largeSize))
    } finally { $graphics.Dispose(); $path.Dispose() }
    try { return Resize-Square $large $Size } finally { $large.Dispose() }
}
function New-Foreground([Drawing.Image]$Image, [int]$Size) {
    $bitmap = New-ArgbBitmap $Size
    $graphics = Get-QualityGraphics $bitmap
    try {
        $graphics.Clear($background)
        $contentSize = [int]($Size * 2 / 3)
        $inset = [int](($Size - $contentSize) / 2)
        Draw-ImageRect $graphics $Image ([Drawing.Rectangle]::new($inset, $inset, $contentSize, $contentSize))
    } finally { $graphics.Dispose() }
    return $bitmap
}
function Crop-AdaptiveCenter([Drawing.Bitmap]$Image) {
    $size = [int]($Image.Width * 2 / 3)
    $inset = [int](($Image.Width - $size) / 2)
    return $Image.Clone([Drawing.Rectangle]::new($inset, $inset, $size, $size), [Drawing.Imaging.PixelFormat]::Format32bppArgb)
}
function Save-Png([Drawing.Bitmap]$Bitmap, [string]$Path) {
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($Path)) | Out-Null
    $Bitmap.Save($Path, [Drawing.Imaging.ImageFormat]::Png)
}
function Check-Png([string]$Path, [int]$Size, [string]$Kind) {
    $image = [Drawing.Bitmap]::FromFile($Path)
    try {
        if ($image.Width -ne $Size -or $image.Height -ne $Size) { throw "Wrong PNG size: $Path" }
        $corner = $image.GetPixel(0, 0)
        $center = $image.GetPixel([int]($Size / 2), [int]($Size / 2))
        if ($center.A -ne 255) { throw "Unexpected transparent center: $Path" }
        if ($Kind -eq 'round') {
            $last = $Size - 1
            foreach ($point in @(@(0,0), @($last,0), @(0,$last), @($last,$last))) {
                if ($image.GetPixel($point[0], $point[1]).A -ne 0) { throw "Round PNG lacks transparent corner: $Path" }
            }
            $partialAlpha = $false
            for ($y = 0; $y -lt $Size -and -not $partialAlpha; $y++) {
                for ($x = 0; $x -lt $Size; $x++) {
                    $alpha = $image.GetPixel($x,$y).A
                    if ($alpha -gt 0 -and $alpha -lt 255) { $partialAlpha = $true; break }
                }
            }
            if (-not $partialAlpha) { throw "Round PNG edge is not antialiased: $Path" }
        } elseif ($corner.A -ne 255) { throw "Square icon unexpectedly transparent: $Path" }
        if ($Kind -eq 'foreground' -and $corner.ToArgb() -ne $background.ToArgb()) { throw "Foreground outer background differs: $Path" }
        return [ordered]@{ path=$Path.Substring($projectPath.Length+1).Replace('\','/'); width=$Size; height=$Size; kind=$Kind; cornerAlpha=$corner.A; centerAlpha=$center.A; sha256=(Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
    } finally { $image.Dispose() }
}

$report = [Collections.Generic.List[object]]::new()
$densities = @(
    @{ Name='mdpi'; Launcher=48; Foreground=108 },
    @{ Name='hdpi'; Launcher=72; Foreground=162 },
    @{ Name='xhdpi'; Launcher=96; Foreground=216 },
    @{ Name='xxhdpi'; Launcher=144; Foreground=324 },
    @{ Name='xxxhdpi'; Launcher=192; Foreground=432 }
)
try {
    foreach ($density in $densities) {
        $directory = Join-Path $projectPath "android/app/src/main/res/mipmap-$($density.Name)"
        $square = Resize-Square $master $density.Launcher
        $round = Mask-Square $master $density.Launcher 'circle'
        $foreground = New-Foreground $master $density.Foreground
        try {
            Save-Png $square (Join-Path $directory 'ic_launcher.png')
            Save-Png $round (Join-Path $directory 'ic_launcher_round.png')
            Save-Png $foreground (Join-Path $directory 'ic_launcher_foreground.png')
        } finally { $square.Dispose(); $round.Dispose(); $foreground.Dispose() }
        $report.Add((Check-Png (Join-Path $directory 'ic_launcher.png') $density.Launcher 'square'))
        $report.Add((Check-Png (Join-Path $directory 'ic_launcher_round.png') $density.Launcher 'round'))
        $report.Add((Check-Png (Join-Path $directory 'ic_launcher_foreground.png') $density.Foreground 'foreground'))
    }
    $web = Resize-Square $master 256
    try { Save-Png $web (Join-Path $projectPath 'frontend/assets/app-icon.png') } finally { $web.Dispose() }
    $report.Add((Check-Png (Join-Path $projectPath 'frontend/assets/app-icon.png') 256 'web'))

    $sheet = [Drawing.Bitmap]::new(1200, 900, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = Get-QualityGraphics $sheet
    $ink = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(38,63,80))
    $muted = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(104,130,149))
    $white = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(247,251,254))
    $line = [Drawing.Pen]::new([Drawing.Color]::FromArgb(193,211,224), 1)
    $titleFont = [Drawing.Font]::new('Microsoft YaHei', 23, [Drawing.FontStyle]::Bold)
    $labelFont = [Drawing.Font]::new('Microsoft YaHei', 12, [Drawing.FontStyle]::Bold)
    $smallFont = [Drawing.Font]::new('Microsoft YaHei', 10)
    $legacyPath = Join-Path $projectPath 'android/app/src/main/res/mipmap-xxxhdpi'
    $legacy = [Drawing.Bitmap]::FromFile((Join-Path $legacyPath 'ic_launcher.png'))
    $roundLarge = [Drawing.Bitmap]::FromFile((Join-Path $legacyPath 'ic_launcher_round.png'))
    $foregroundLarge = [Drawing.Bitmap]::FromFile((Join-Path $legacyPath 'ic_launcher_foreground.png'))
    $adaptiveCenter = Crop-AdaptiveCenter $foregroundLarge
    $rounded = Mask-Square $legacy 160 'rounded'
    $adaptiveRound = Mask-Square $adaptiveCenter 128 'circle'
    $adaptiveSquare = Mask-Square $adaptiveCenter 128 'rounded'
    try {
        $g.Clear([Drawing.Color]::FromArgb(228,238,245))
        $g.DrawString('批准头像 · Android 图标资源', $titleFont, $ink, 34, 23)
        $g.DrawString('同一母版确定性缩放 · 原人物未重绘 · 离线遮罩对比', $smallFont, $muted, 37, 66)
        foreach ($y in @(110,435)) { foreach ($x in @(30,420,810)) { $g.FillRectangle($white,$x,$y,360,305); $g.DrawRectangle($line,$x,$y,360,305) } }
        $g.DrawString('传统图标 / 圆角遮罩', $labelFont, $ink, 49, 129)
        Draw-ImageRect $g $rounded ([Drawing.Rectangle]::new(130,172,160,160))
        $g.DrawString('192px PNG · 平台圆角示意', $smallFont, $muted, 84, 365)
        $g.DrawString('圆形图标 / 真实透明边角', $labelFont, $ink, 439, 129)
        # Checkerboard makes real alpha visible without altering the icon.
        $checker = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(222,234,242))
        try { for ($cy=0;$cy -lt 10;$cy++) { for($cx=0;$cx -lt 10;$cx++) { if(($cx+$cy)%2 -eq 0){$g.FillRectangle($checker,520+$cx*16,172+$cy*16,16,16)} } } } finally { $checker.Dispose() }
        Draw-ImageRect $g $roundLarge ([Drawing.Rectangle]::new(520,172,160,160))
        $g.DrawString('192px PNG · 边角真实透明', $smallFont, $muted, 473, 365)
        $g.DrawString('自适应 / 108dp 中央 72dp', $labelFont, $ink, 829, 129)
        Draw-ImageRect $g $adaptiveSquare ([Drawing.Rectangle]::new(836,189,128,128))
        Draw-ImageRect $g $adaptiveRound ([Drawing.Rectangle]::new(1010,189,128,128))
        $g.DrawString('圆角遮罩', $smallFont, $muted, 866, 341)
        $g.DrawString('圆形遮罩', $smallFont, $muted, 1040, 341)
        $g.DrawString('从生成的前景资源截取中心区', $smallFont, $muted, 864, 374)
        $g.DrawString('自适应前景 / 完整 108dp 画布', $labelFont, $ink, 49, 454)
        Draw-ImageRect $g $foregroundLarge ([Drawing.Rectangle]::new(120,497,180,180))
        $safePen = [Drawing.Pen]::new([Drawing.Color]::FromArgb(220,241,251),1)
        try { $safePen.DashStyle=[Drawing.Drawing2D.DashStyle]::Dash; $g.DrawRectangle($safePen,150,527,120,120) } finally { $safePen.Dispose() }
        $g.DrawString('虚线 = 原图完整布局区域 72dp', $smallFont, $muted, 75, 701)
        $g.DrawString('小尺寸 / 实际像素 1:1', $labelFont, $ink, 439, 454)
        $g.DrawString('圆角', $smallFont, $muted, 529, 504);$g.DrawString('圆形', $smallFont, $muted, 613, 504);$g.DrawString('自适应', $smallFont, $muted, 690, 504)
        foreach($size in @(48,32)) {
            $smallSquare=Mask-Square $master $size 'rounded';$smallRound=Mask-Square $master $size 'circle';$smallAdaptive=Mask-Square $adaptiveCenter $size 'circle'
            try { $sy=if($size -eq 48){542}else{625};$g.DrawString("${size}px",$smallFont,$muted,445,$sy+8);Draw-ImageRect $g $smallSquare ([Drawing.Rectangle]::new(526,$sy,$size,$size));Draw-ImageRect $g $smallRound ([Drawing.Rectangle]::new(610,$sy,$size,$size));Draw-ImageRect $g $smallAdaptive ([Drawing.Rectangle]::new(694,$sy,$size,$size)) } finally { $smallSquare.Dispose();$smallRound.Dispose();$smallAdaptive.Dispose() }
        }
        $g.DrawString('仅技术缩放、留白与遮罩', $smallFont, $muted, 474, 701)
        $g.DrawString('项目母版 / 内容保留', $labelFont, $ink, 829, 454)
        Draw-ImageRect $g $master ([Drawing.Rectangle]::new(910,497,160,160))
        $g.DrawString('curry-approved.png', $smallFont, $muted, 892, 678)
        $g.DrawString('SHA-256  92f00107…15a0bb3', $smallFont, $muted, 853, 705)
        $g.DrawString('资源与遮罩模拟，非设备截图。启动器可采用不同外形；五官没有重新绘制。', $smallFont, $muted, 36, 785)
        $g.DrawString('传统 48 / 72 / 96 / 144 / 192 px    自适应前景 108 / 162 / 216 / 324 / 432 px', $smallFont, $muted, 36, 819)
        Save-Png $sheet (Join-Path $previewPath 'contact-sheet.png')
    } finally {
        foreach($item in @($g,$ink,$muted,$white,$line,$titleFont,$labelFont,$smallFont,$legacy,$roundLarge,$foregroundLarge,$adaptiveCenter,$rounded,$adaptiveRound,$adaptiveSquare,$sheet)) { $item.Dispose() }
    }
    $finalHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
    if($finalHash -ne $originalHash) { throw 'Master unexpectedly changed.' }
    [ordered]@{ source='resources/app-icon/curry-approved.png'; sourceSha256=$finalHash.ToLowerInvariant(); sourceUnchanged=$true; generator='Windows System.Drawing; deterministic resize and technical masks only'; adaptiveContentFraction='72/108'; adaptiveOuterColor='#496B83'; generated=$report.ToArray(); preview='artifacts/design/app-icon/contact-sheet.png'; previewIsDeviceScreenshot=$false } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $previewPath 'validation.json') -Encoding utf8
    Write-Output "Generated 15 Android PNGs + 256px web PNG; dimensions/round alpha/master hash verified. Preview: artifacts/design/app-icon/contact-sheet.png"
} finally { $master.Dispose() }

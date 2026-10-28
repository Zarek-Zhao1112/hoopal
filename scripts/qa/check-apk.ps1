param([Parameter(Mandatory=$true)][string]$ApkPath,[string]$CompareApkPath,[string]$ReportDirectory='artifacts/qa/apk')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$apkAbsolute=(Resolve-Path -LiteralPath $ApkPath).Path
$archive=[IO.Compression.ZipFile]::OpenRead($apkAbsolute)
$prior=if($CompareApkPath){[IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $CompareApkPath).Path)}else{$null}
New-Item -ItemType Directory -Force -Path $ReportDirectory | Out-Null
function EntryHash($entry){$stream=$entry.Open();try{$sha=[Security.Cryptography.SHA256]::Create();try{[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}}finally{$stream.Dispose()}}
try{
 $distRoot=(Resolve-Path -LiteralPath (Join-Path $projectPath 'dist')).Path;$webCount=0;$icons=0
 foreach($file in Get-ChildItem -LiteralPath $distRoot -Recurse -File){
  $relative=$file.FullName.Substring($distRoot.Length+1).Replace('\','/');$entry=$archive.GetEntry("assets/public/$relative")
  if(!$entry -or (EntryHash $entry) -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()){throw "dist mismatch: $relative"};$webCount++
 }
 if(!$webCount){throw 'No packaged web assets'}
 foreach($entry in $archive.Entries){if($entry.FullName.StartsWith('res/mipmap-') -and $entry.FullName.EndsWith('.png')){
  if($prior){$old=$prior.GetEntry($entry.FullName);if(!$old -or (EntryHash $entry) -ne (EntryHash $old)){throw "Icon changed: $($entry.FullName)"}};$icons++
 }}
 if($prior){$priorCount=@($prior.Entries|Where-Object {$_.FullName.StartsWith('res/mipmap-') -and $_.FullName.EndsWith('.png')}).Count;if($icons -ne $priorCount){throw 'Icon count changed'}}
 $reader=[IO.StreamReader]::new($archive.GetEntry('assets/capacitor.config.json').Open());try{$config=$reader.ReadToEnd()|ConvertFrom-Json}finally{$reader.Dispose()}
 $sourceConfig=Get-Content -LiteralPath (Join-Path $projectPath 'capacitor.config.json') -Raw -Encoding UTF8|ConvertFrom-Json
 if($config.server.url -or $config.appId -ne $sourceConfig.appId -or $config.appName -ne $sourceConfig.appName){throw 'App identity or offline configuration mismatch'}
 $sdk=if($env:ANDROID_HOME){$env:ANDROID_HOME}elseif($env:ANDROID_SDK_ROOT){$env:ANDROID_SDK_ROOT}else{Join-Path $projectPath '.tools/android-sdk'}
 $buildTools=Join-Path $sdk 'build-tools/36.0.0'
 if(!$env:JAVA_HOME){$env:JAVA_HOME=(Get-ChildItem -LiteralPath (Join-Path $projectPath '.tools/java21') -Directory|Where-Object Name -Like 'jdk-*'|Select-Object -First 1).FullName}
 $env:PATH=(Join-Path $env:JAVA_HOME 'bin')+';'+$env:PATH
 $signature=& (Join-Path $buildTools 'apksigner.bat') verify --verbose --print-certs $apkAbsolute
 if($LASTEXITCODE -ne 0){throw 'Signature verification failed'}
 $signatureText=$signature -join "`n";if($signatureText -notmatch 'Verified using v2 scheme[^\n]+true'){throw 'Expected v2 signature'}
 if($signatureText -notmatch 'certificate SHA-256 digest: ([a-f0-9]+)'){throw 'Missing signing certificate'};$certificate=$Matches[1]
 if($CompareApkPath){$oldSignature=(& (Join-Path $buildTools 'apksigner.bat') verify --print-certs (Resolve-Path -LiteralPath $CompareApkPath).Path) -join "`n";if($LASTEXITCODE -ne 0 -or $oldSignature -notmatch [regex]::Escape($certificate)){throw 'Signing certificate differs from installed-version APK'}}
 $signature|Set-Content -LiteralPath (Join-Path $ReportDirectory 'signature.txt') -Encoding utf8
 # aapt's Windows argv decoding can reject an otherwise valid Chinese absolute path.
 Push-Location -LiteralPath ([IO.Path]::GetDirectoryName($apkAbsolute))
 try{$badging=& (Join-Path $buildTools 'aapt.exe') dump badging ([IO.Path]::GetFileName($apkAbsolute));$badgingExit=$LASTEXITCODE}finally{Pop-Location}
 if($badgingExit -ne 0){throw 'Cannot inspect APK metadata'}
 $badging|Set-Content -LiteralPath (Join-Path $ReportDirectory 'badging.txt') -Encoding utf8
 $version=(Get-Content -LiteralPath (Join-Path $projectPath 'package.json') -Raw -Encoding UTF8|ConvertFrom-Json).version
 $gradle=Get-Content -LiteralPath (Join-Path $projectPath 'android/app/build.gradle') -Raw -Encoding UTF8
 if($gradle -notmatch 'versionCode\s+(\d+)'){throw 'Cannot read versionCode'};$code=[int]$Matches[1]
 $metadata=$badging -join "`n";if($metadata -notmatch [regex]::Escape("name='$($config.appId)'") -or $metadata -notmatch "versionCode='$code'" -or $metadata -notmatch [regex]::Escape("versionName='$version'")){throw 'Version or package metadata mismatch'}
 $result=@{version=$version;versionCode=$code;appId=$config.appId;appName=$config.appName;webAssets=$webCount;iconPngs=$icons;iconsCompared=[bool]$prior;serverUrlAbsent=$true;v2=$true;certificateSha256=$certificate;apkSha256=(Get-FileHash -LiteralPath $apkAbsolute -Algorithm SHA256).Hash.ToLowerInvariant()}
 $result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $ReportDirectory 'apk.json') -Encoding utf8
 $result|ConvertTo-Json -Compress
}finally{$archive.Dispose();if($prior){$prior.Dispose()}}

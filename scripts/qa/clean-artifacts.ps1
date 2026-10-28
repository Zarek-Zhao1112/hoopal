param([switch]$Apply)
$ErrorActionPreference='Stop'
$projectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$qaPath=Join-Path $projectPath 'artifacts/qa'
foreach($directory in @($projectPath,(Join-Path $projectPath 'artifacts'),$qaPath)){
 if((Get-Item -LiteralPath $directory).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Linked ancestor: $directory"}
}
$reportDirectory=Join-Path $qaPath 'hc043'
New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null
$separator=[IO.Path]::DirectorySeparatorChar
$referenceFiles=@(Get-ChildItem -LiteralPath (Join-Path $projectPath 'docs') -Recurse -File -Filter '*.md')+@(Get-Item -LiteralPath (Join-Path $projectPath 'README.md'))
if(Test-Path -LiteralPath (Join-Path $projectPath 'CHANGELOG.md')){$referenceFiles+=Get-Item -LiteralPath (Join-Path $projectPath 'CHANGELOG.md')}
$references=($referenceFiles | ForEach-Object {Get-Content -LiteralPath $_.FullName -Raw}) -join "`n"
$candidates=@();$skipped=@()
foreach($folder in Get-ChildItem -LiteralPath $qaPath -Directory | Where-Object Name -Like 'downloads*'){
 if($folder.Attributes -band [IO.FileAttributes]::ReparsePoint){$skipped+=@{path=$folder.FullName;reason='Reparse point'};continue}
 foreach($file in Get-ChildItem -LiteralPath $folder.FullName -File){
  if($file.Extension -notin @('.htm','.crdownload')){continue}
  $absolute=[IO.Path]::GetFullPath($file.FullName)
  if(!$absolute.StartsWith($qaPath+$separator,[StringComparison]::OrdinalIgnoreCase)){throw "Outside QA directory: $absolute"}
  if($file.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Linked file: $absolute"}
  $relative=$absolute.Substring($projectPath.Length+1).Replace('\','/')
  if($file.LastWriteTimeUtc -gt [DateTime]::UtcNow.AddMinutes(-10)){$skipped+=@{path=$relative;reason='Recently modified'};continue}
  if($references.Contains($relative) -or $references.Contains($relative.Replace('/','\'))){$skipped+=@{path=$relative;reason='Referenced by documentation'};continue}
  $candidates+=@{path=$relative;absolute=$absolute;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant()}
 }
}
$report=@{applied=[bool]$Apply;completed=$false;deleted=@();scope='Only old .htm/.crdownload files directly inside artifacts/qa/downloads*; no recursive deletion.';checkedAt=[DateTime]::UtcNow.ToString('o');files=$candidates;skipped=$skipped;bytes=($candidates | Measure-Object -Property bytes -Sum).Sum}
$reportName=if($Apply){'cleanup-applied.json'}else{'cleanup-plan.json'}
$report|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $reportDirectory $reportName) -Encoding utf8
if($Apply){
 try{foreach($candidate in $candidates){
  $current=Get-Item -LiteralPath $candidate.absolute
  if($current.PSIsContainer -or ($current.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw "Target changed: $($candidate.path)"}
  if((Get-FileHash -LiteralPath $candidate.absolute -Algorithm SHA256).Hash.ToLowerInvariant() -ne $candidate.sha256){throw "Content changed: $($candidate.path)"}
  Remove-Item -LiteralPath $candidate.absolute -Force
  $report.deleted+= $candidate.path
 };$report.completed=$true}finally{$report|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $reportDirectory $reportName) -Encoding utf8}
}
@{applied=[bool]$Apply;files=$candidates.Count;MiB=[Math]::Round($report.bytes/1MB,2);skipped=$skipped.Count}|ConvertTo-Json -Compress

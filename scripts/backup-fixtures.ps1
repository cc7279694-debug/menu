param([ValidateSet('Images','Inspect','Mutate')][string]$Action,[string]$Source,[string]$Output,[string]$Defect)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$taskAllowed=[IO.Path]::GetFullPath((Join-Path (Split-Path $PSScriptRoot -Parent) 'artifacts/backup-restore'))
$taskTarget=[IO.Path]::GetFullPath($Output)
if (-not ($taskTarget.StartsWith($taskAllowed+[IO.Path]::DirectorySeparatorChar) -or $taskTarget -eq $taskAllowed)) {throw 'Generated artifacts only'}
New-Item -ItemType Directory -Force ([IO.Path]::GetDirectoryName($taskTarget)) | Out-Null
if($Action -eq 'Images') {
    Add-Type -AssemblyName System.Drawing
    New-Item -ItemType Directory -Force $taskTarget | Out-Null
    foreach($color in @('Red','Green','Blue')) {
        $file=Join-Path $taskTarget ('backup-'+$color.ToLower()+'.png')
        if(Test-Path -LiteralPath $file){continue}
        $bitmap=New-Object Drawing.Bitmap 32,32
        $graphics=[Drawing.Graphics]::FromImage($bitmap)
        try {$graphics.Clear([Drawing.Color]::FromName($color));$bitmap.Save($file,[Drawing.Imaging.ImageFormat]::Png)} finally {$graphics.Dispose();$bitmap.Dispose()}
    }
    exit 0
}
$zip=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($Source))
try {
    $entries=@{}
    foreach($entry in $zip.Entries) {
        if($entry.Length -gt 16777216){throw 'Test artifact too large'}
        $stream=$entry.Open();$buffer=New-Object IO.MemoryStream
        try {$stream.CopyTo($buffer);$entries[$entry.FullName]=$buffer.ToArray()}finally{$stream.Dispose();$buffer.Dispose()}
    }
}finally{$zip.Dispose()}
if($Action -eq 'Inspect') {
    $media=@{}
    foreach($name in $entries.Keys) {if($name.StartsWith('media/')) {$sha=[Security.Cryptography.SHA256]::Create();try{$media[$name]=@{size=$entries[$name].Length;sha256=([BitConverter]::ToString($sha.ComputeHash($entries[$name]))).Replace('-','').ToLower()}}finally{$sha.Dispose()}}}
    $result=@{manifest=([Text.Encoding]::UTF8.GetString($entries['manifest.json'])|ConvertFrom-Json);data=([Text.Encoding]::UTF8.GetString($entries['data.json'])|ConvertFrom-Json);media=$media}
    [IO.File]::WriteAllText($taskTarget,($result|ConvertTo-Json -Depth 32), (New-Object Text.UTF8Encoding $false))
    exit 0
}
$manifest=[Text.Encoding]::UTF8.GetString($entries['manifest.json'])|ConvertFrom-Json
switch($Defect){
    'hash' {$manifest.dataFile.sha256=('f'*64)}
    'version' {$manifest.formatVersion=2}
    'count' {$manifest.counts.recipes+=1}
    'missing-media' {if($manifest.media.Count -eq 0){throw 'Media fixture required'};$entries.Remove($manifest.media[0].path)}
    'traversal' {$entries['../evil.txt']=[Text.Encoding]::UTF8.GetBytes('generated malicious test')}
    'references' {$data=[Text.Encoding]::UTF8.GetString($entries['data.json'])|ConvertFrom-Json;$data.steps[0].recipeId='missing';$entries['data.json']=[Text.Encoding]::UTF8.GetBytes(($data|ConvertTo-Json -Depth 32 -Compress));$sha=[Security.Cryptography.SHA256]::Create();try{$manifest.dataFile.sha256=([BitConverter]::ToString($sha.ComputeHash($entries['data.json']))).Replace('-','').ToLower();$manifest.dataFile.size=$entries['data.json'].Length}finally{$sha.Dispose()}}
    default {throw 'Unknown defect'}
}
$entries['manifest.json']=[Text.Encoding]::UTF8.GetBytes(($manifest|ConvertTo-Json -Depth 32 -Compress))
$outputFile=New-Object IO.FileStream($taskTarget,[IO.FileMode]::CreateNew)
$archive=New-Object IO.Compression.ZipArchive($outputFile,[IO.Compression.ZipArchiveMode]::Create,$false)
try {foreach($name in $entries.Keys){$entry=$archive.CreateEntry($name);$stream=$entry.Open();try{$stream.Write($entries[$name],0,$entries[$name].Length)}finally{$stream.Dispose()}}}finally{$archive.Dispose();$outputFile.Dispose()}

param(
    [ValidatePattern('^[A-Za-z0-9_-]+\.apk$')]
    [string]$ArtifactName = 'recipio-daily-library-v5-debug.apk',
    [ValidateRange(1, 2147483647)]
    [int]$VersionCode = 5,
    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$VersionName = '0.2.0-daily-library'
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $taskRoot
try {
    if (-not $env:JAVA_HOME) {
        $taskJdkRoot = Join-Path $env:LOCALAPPDATA 'RecipioAndroid/jdk'
        $taskJdk = Get-ChildItem -LiteralPath $taskJdkRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { Test-Path (Join-Path $_.FullName 'bin/java.exe') } |
            Sort-Object Name -Descending | Select-Object -First 1
        if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName }
    }
    if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin/java.exe'))) {
        throw 'Set JAVA_HOME to a JDK 21+ installation before building.'
    }
    if (-not $env:ANDROID_HOME) {
        $taskSdkCandidates = @(
            (Join-Path $env:LOCALAPPDATA 'Android/Sdk'),
            (Join-Path $env:LOCALAPPDATA 'MirraAndroid/sdk')
        )
        $env:ANDROID_HOME = $taskSdkCandidates | Where-Object {
            Test-Path (Join-Path $_ 'platforms/android-36/android.jar')
        } | Select-Object -First 1
    }
    if (-not $env:ANDROID_HOME) { throw 'Set ANDROID_HOME to an Android SDK with platform 36.' }
    & npm.cmd run sync:android
    if ($LASTEXITCODE -ne 0) { throw 'Static asset build or Capacitor sync failed.' }
    & ./android/gradlew.bat -p android assembleDebug --console=plain "-PapkVersionCode=$VersionCode" "-PapkVersionName=$VersionName"
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    New-Item -ItemType Directory -Force artifacts | Out-Null
    $taskArtifactPath = Join-Path 'artifacts' $ArtifactName
    Copy-Item -LiteralPath android/app/build/outputs/apk/debug/app-debug.apk -Destination $taskArtifactPath
    Get-Item -LiteralPath $taskArtifactPath | Select-Object FullName, Length
    $taskApk = (Get-Item -LiteralPath $taskArtifactPath).FullName
    $taskSha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $taskHash = [BitConverter]::ToString($taskSha.ComputeHash([System.IO.File]::ReadAllBytes($taskApk))).Replace('-', '')
        Write-Output "SHA256: $taskHash"
    } finally { $taskSha.Dispose() }
} finally { Pop-Location }

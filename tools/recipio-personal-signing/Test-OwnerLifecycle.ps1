# Non-sensitive lifecycle simulation. NO real keystore, keytool, signer or owner input.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
$module=Get-Module Recipio.PersonalSigning
$sevenZip='E:/CODEX/Tools/recipio-signing/7zip-26.05/portable/x64/7za.exe'
$passed=0
foreach($cancel in @($true,$false)){
  $root=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-owner-lifecycle-'+[guid]::NewGuid().ToString('N'))
  $bundle=Join-Path $root 'bundle';$private=Join-Path $root 'private';$backup=Join-Path $root 'backup';$source=Join-Path $root 'PUBLIC_FAKE_SOURCE_NOT_A_KEY.txt'
  $null=[IO.Directory]::CreateDirectory((Join-Path $bundle 'unsigned'))
  [IO.File]::WriteAllText($source,'PUBLIC NON-KEY SOURCE ONLY',[Text.UTF8Encoding]::new($false))
  $hashSource=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  $apks=@()
  foreach($code in @(26,27)){
    $relative='unsigned/recipio-personal-v'+$code+'-unsigned.apk';$path=Join-Path $bundle $relative
    $zip=[IO.Compression.ZipFile]::Open($path,[IO.Compression.ZipArchiveMode]::Create)
    try{$entry=$zip.CreateEntry('PUBLIC_FAKE_APP_NOT_INSTALLABLE.txt');$writer=[IO.StreamWriter]::new($entry.Open());try{$writer.Write('PUBLIC SYNTHETIC APPLICATION PAYLOAD')}finally{$writer.Dispose()}}finally{$zip.Dispose()}
    $apks+=@{file=$relative;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant();versionCode=$code;versionName=('0.11.0-personal.'+($code-25))}
  }
  $files=@()
  foreach($name in @('Recipio.PersonalSigning.psm1','Start-RecipioPersonalSigning.ps1','Start-RecipioPersonalSigning.cmd')){
    $path=Join-Path $bundle $name;[IO.File]::WriteAllText($path,'PUBLIC FAKE BUNDLE FILE; NOT EXECUTED');$files+=@{file=$name;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
  }
  @{formatVersion=1;route='A';sourceSha='19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe';certificateSha256='29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9';packageName='app.recipio.local';apks=$apks;bundleFiles=$files;tools=@{}}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $bundle 'release-manifest.json') -Encoding utf8
  $context=@{paths=@{privateRoot=$private;backupRoot=$backup;sourceKey=$source};cancel=$cancel;sevenZip=$sevenZip;source=$source;restoredKeyUsed=$false;imports=0}
  try{
    & $module {
      param($context,$bundle)
      $script:R1FakeLifecycle=$context
      $originals=@{}
      $replacements=@('Assert-R1PrivateConsole','Get-R1OwnerPaths','Get-R1Toolchain','Get-R1ApkInfo','Read-R1Secret','Get-R1Certificate','Invoke-R1PrivateChild','Invoke-R1SignApk')
      foreach($name in $replacements){$originals[$name]=(Get-Item ('Function:'+$name)).ScriptBlock}
      $script:R1RealPrivateChild=$originals['Invoke-R1PrivateChild']
      try{
        Set-Item Function:script:Assert-R1PrivateConsole { }
        Set-Item Function:script:Get-R1OwnerPaths {return $script:R1FakeLifecycle.paths}
        Set-Item Function:script:Get-R1Toolchain {param($Manifest);return @{keytool=@{path='PUBLIC_FAKE_KEYTOOL_NEVER_EXECUTED'};sevenZip=@{path=$script:R1FakeLifecycle.sevenZip}}}
        Set-Item Function:script:Get-R1ApkInfo {param($Tools,[string]$Path,$Expected,[switch]$MustBeUnsigned);return @{}}
        Set-Item Function:script:Read-R1Secret {
          param([string]$Prompt,[switch]$Legacy,[switch]$Confirm)
          if($script:R1FakeLifecycle.cancel){Stop-R1 'OWNER_CANCELLED_SYNTHETIC'}
          if($Legacy){return ConvertTo-SecureString 'PUBLIC-OLD-FAKE' -AsPlainText -Force}
          if($Prompt-like'独立*'){return ConvertTo-SecureString 'PUBLIC-FAKE-BACKUP-9!zR' -AsPlainText -Force}
          return ConvertTo-SecureString 'PUBLIC-FAKE-STORE-9!zR' -AsPlainText -Force
        }
        Set-Item Function:script:Get-R1Certificate {param($Tools,[string]$Keystore,[string]$Alias,[Security.SecureString]$Password);return @{Der=[Text.Encoding]::ASCII.GetBytes('PUBLIC FAKE CERTIFICATE NOT A CERT');Fingerprint=$script:R1Certificate}}
        Set-Item Function:script:Invoke-R1PrivateChild {
          param([string]$Executable,[string[]]$Arguments,[hashtable]$Secrets=@{},[Security.SecureString[]]$InputSecrets=@(),[string]$WorkingDirectory,[int]$TimeoutSeconds=120)
          if($Executable-eq'PUBLIC_FAKE_KEYTOOL_NEVER_EXECUTED'){
            $index=[Array]::IndexOf($Arguments,'-destkeystore');if($index-lt0){throw 'Unexpected fake key operation'}
            [IO.File]::Copy($script:R1FakeLifecycle.source,$Arguments[$index+1],$false);$script:R1FakeLifecycle.imports++
            return @{ExitCode=0;Stdout='';Stderr=''}
          }
          if($Executable-ne$script:R1FakeLifecycle.sevenZip){throw 'Unexpected executable; no real key process allowed'}
          return & $script:R1RealPrivateChild $Executable $Arguments $Secrets $InputSecrets $WorkingDirectory $TimeoutSeconds
        }
        Set-Item Function:script:Invoke-R1SignApk {
          param($Tools,[string]$InputPath,[string]$AlignedPath,[string]$SignedPath,[string]$Keystore,[Security.SecureString]$Password,$Expected)
          if($Keystore-eq$script:R1FakeLifecycle.source-or-not$Keystore.Contains('session-')){throw 'Signing did not use the restored fake copy'}
          $script:R1FakeLifecycle.restoredKeyUsed=$true
          [IO.File]::Copy($InputPath,$AlignedPath,$false);[IO.File]::Copy($InputPath,$SignedPath,$false)
        }
        if((Get-R1OwnerPaths).sourceKey-ne$context.source){throw 'Fake path isolation failed; refusing any owner flow'}
        if($context.cancel){
          $rejected=$false;try{Invoke-R1OwnerSigning $bundle *> $null}catch{if($_.Exception.Message-eq'R1P_OWNER_CANCELLED_SYNTHETIC'){$rejected=$true}else{throw}}
          if(-not$rejected){throw 'Cancellation did not stop the flow'}
        }else{Invoke-R1OwnerSigning $bundle *> $null}
      }finally{
        foreach($name in $replacements){Set-Item ('Function:script:'+$name) $originals[$name]}
        Remove-Variable -Scope Script -Name R1FakeLifecycle,R1RealPrivateChild -ErrorAction SilentlyContinue
      }
    } $context $bundle
    if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash-ne$hashSource){throw 'Original public fake source changed'}
    if(@(Get-ChildItem -LiteralPath $private -Directory -Filter 'session-*').Count){throw 'Owned temporary verification directory remains'}
    $receipt=Join-Path $bundle 'delivery/OWNER_RESULT.json'
    if($cancel){if(Test-Path -LiteralPath $receipt){throw 'Cancellation published a success record'};if(Test-Path -LiteralPath (Join-Path $private 'identity.p12')){throw 'Cancellation created an identity copy'}}
    else{
      $r=Get-Content -LiteralPath $receipt -Raw|ConvertFrom-Json -AsHashtable
      Assert-R1PublicReceipt $r
      if(-not$context.restoredKeyUsed-or$context.imports-ne1){throw 'Recovery or copy-only identity contract failed'}
    }
    $passed++;Write-Output ('PASS FAKE_OWNER_LIFECYCLE '+$(if($cancel){'cancel leaves no successful receipt or identity copy'}else{'real synthetic AES backup restored, fake recovered copy used, temporary copies cleaned before publication'}))
  }finally{
    # This tree is generated entirely by this test and contains no real key.
    $full=[IO.Path]::GetFullPath($root);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
    if(-not$full.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)-or[IO.Path]::GetFileName($full)-notmatch'^recipio-public-owner-lifecycle-[a-f0-9]{32}$'){throw 'Synthetic cleanup boundary failed'}
    $items=@(Get-ChildItem -LiteralPath $full -Force -Recurse)
    if(@($items|Where-Object{$_.Attributes-band[IO.FileAttributes]::ReparsePoint}).Count){throw 'Unexpected reparse point in synthetic cleanup'}
    Remove-Item -LiteralPath $full -Recurse -Force
  }
}
Write-Output ('RESULT '+$passed+' FAKE_OWNER_LIFECYCLE PASS; real key/signature/owner operation NOT_RUN')

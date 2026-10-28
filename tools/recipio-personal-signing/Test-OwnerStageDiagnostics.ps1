# Public synthetic fixtures only. Never runs an owner launcher, keytool or signer.
param([string]$ModulePath=(Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1'))
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$module=Import-Module $ModulePath -Force -PassThru
$script:Passed=0;$script:Failed=0
function Must([bool]$Condition,[string]$Message){if(-not$Condition){throw $Message}}
function Check([string]$Name,[scriptblock]$Body){
  try{&$Body;$script:Passed++;Write-Output ('PASS '+$Name)}
  catch{$script:Failed++;Write-Output ('FAIL '+$Name)} # Never echo even fixture exception text.
}
$stages=@('PUBLIC_PREFLIGHT','PRIVATE_STORAGE','INPUT_COPY','SOURCE_PASSWORD','STORE_PASSWORD','BACKUP_PASSWORD','PASSWORD_SEPARATION','IDENTITY_VERIFY_IMPORT','BACKUP_VERIFY_RESTORE','APK_SIGN','PUBLICATION','PRIVATE_CLEANUP')
foreach($stage in $stages){
  Check ('unknown failure is reduced to fixed stage '+$stage) {
    $actual=&$module {param($s);Get-R1OwnerFailureCategory 'PUBLIC_FAKE_PASSWORD_AND_NATIVE_OUTPUT C:\PUBLIC_FAKE_PRIVATE_PATH' $s} $stage
    Must ($actual-eq('R1P_OWNER_'+$stage+'_UNEXPECTED')) 'Unexpected phase category'
    Must (-not$actual.Contains('PUBLIC_FAKE')) 'Fixture detail escaped'
  }
}
foreach($known in @('R1P_PASSWORD_STRENGTH','R1P_KEY_CERTIFICATE_MISMATCH','R1P_SOURCE_IMPORT_FAILED_NO_REKEY')){
  Check ('exact existing category survives '+$known) {
    $actual=&$module {param($message);Get-R1OwnerFailureCategory $message 'IDENTITY_VERIFY_IMPORT'} $known
    Must ($actual-eq$known) 'Existing category changed'
  }
}
Check 'unrecognized stage has fixed generic fallback' {
  $actual=&$module {Get-R1OwnerFailureCategory 'PUBLIC_FAKE_PASSWORD' 'PUBLIC_FAKE_STAGE'}
  Must ($actual-eq'UNEXPECTED_FAILURE') 'Unknown stage escaped'
}
Check 'partial or multiline category does not bypass normalization' {
  foreach($text in @('prefix R1P_PASSWORD_STRENGTH',"R1P_PASSWORD_STRENGTH`n",'R1P_PASSWORD_STRENGTH PUBLIC_FAKE_PASSWORD')){
    $actual=&$module {param($message);Get-R1OwnerFailureCategory $message 'STORE_PASSWORD'} $text
    Must ($actual-eq'R1P_OWNER_STORE_PASSWORD_UNEXPECTED') 'Non-exact category passed through'
  }
}

function Test-SyntheticOwnerFailure([string]$FailureStage,[string]$Expected,[switch]$Known,[switch]$CleanupFailure){
  $root=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-owner-stage-'+[guid]::NewGuid().ToString('N'))
  $bundle=Join-Path $root 'bundle';$private=Join-Path $root 'synthetic-private';$backup=Join-Path $root 'synthetic-backup'
  $source=Join-Path $root 'PUBLIC_FAKE_SOURCE_NOT_A_KEY.txt'
  $null=[IO.Directory]::CreateDirectory((Join-Path $bundle 'unsigned'))
  [IO.File]::WriteAllText($source,'PUBLIC NON-KEY TEST SOURCE')
  $apks=@()
  foreach($code in @(26,27)){
    $file='unsigned/public-fake-v'+$code+'.apk';$path=Join-Path $bundle $file
    [IO.File]::WriteAllText($path,'PUBLIC FAKE NOT INSTALLABLE')
    $apks+=@{file=$file;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant();versionCode=$code;versionName='public-fake'}
  }
  @{apks=$apks;tools=@{}}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $bundle 'release-manifest.json') -Encoding utf8
  $context=@{root=$root;paths=@{privateRoot=$private;backupRoot=$backup;sourceKey=$source};failureStage=$FailureStage;known=[bool]$Known;cleanupFailure=[bool]$CleanupFailure;cleanupCalls=[Collections.Generic.List[string]]::new()}
  try{
    $actual=&$module {
      param($context,$bundle)
      $script:R1StageFixture=$context
      $replacements=@('Assert-R1StorageRepairVerified','Assert-R1PrivateConsole','Assert-R1ReleaseManifest','Get-R1Toolchain','Get-R1ApkInfo','Test-R1ArchiveTransport','Get-R1OwnerPaths','New-R1RestrictedDirectory','Read-R1Secret','Get-R1Certificate','Invoke-R1PrivateChild','Remove-R1OwnedTemporaryDirectory')
      $originals=@{}
      foreach($name in $replacements){$originals[$name]=(Get-Item ('Function:'+$name)).ScriptBlock}
      try{
        Set-Item Function:script:Assert-R1StorageRepairVerified { } # Fake failure injection only.
        Set-Item Function:script:Assert-R1PrivateConsole { }
        Set-Item Function:script:Assert-R1ReleaseManifest {param($Manifest,[string]$BundleRoot)}
        Set-Item Function:script:Get-R1Toolchain {param($Manifest);return @{keytool=@{path='PUBLIC_FAKE_NEVER_EXECUTE'};sevenZip=@{path='PUBLIC_FAKE_NEVER_EXECUTE'}}}
        Set-Item Function:script:Get-R1ApkInfo {param($Tools,[string]$Path,$Expected,[switch]$MustBeUnsigned);return @{}}
        Set-Item Function:script:Test-R1ArchiveTransport {param([string]$SevenZip);return @{status='PASS'}}
        Set-Item Function:script:Get-R1OwnerPaths {return $script:R1StageFixture.paths}
        Set-Item Function:script:New-R1RestrictedDirectory {
          param([string]$Path,[string[]]$ForbiddenRoots)
          if(-not$Path.StartsWith($script:R1StageFixture.root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'PUBLIC_FAKE_ISOLATION_FAILED'}
          $null=[IO.Directory]::CreateDirectory($Path)
        }
        Set-Item Function:script:Read-R1Secret {
          param([string]$Prompt,[switch]$Legacy,[switch]$Confirm)
          $phase=if($Legacy){'SOURCE_PASSWORD'}elseif($Prompt.StartsWith('独立')){'BACKUP_PASSWORD'}else{'STORE_PASSWORD'}
          if($phase-eq$script:R1StageFixture.failureStage){
            if($script:R1StageFixture.known){Stop-R1 'PASSWORD_STRENGTH'}
            throw 'PUBLIC_FAKE_PASSWORD C:\PUBLIC_FAKE_PRIVATE_PATH PUBLIC_FAKE_NATIVE_OUTPUT'
          }
          return ConvertTo-SecureString ('PUBLIC-FAKE-'+$phase+'-9!zR') -AsPlainText -Force
        }
        Set-Item Function:script:Get-R1Certificate {
          param($Tools,[string]$Keystore,[string]$Alias,[Security.SecureString]$Password)
          throw 'PUBLIC_FAKE_CERTIFICATE_PARSE_FAILURE_WITH_PRIVATE_PATH'
        }
        Set-Item Function:script:Invoke-R1PrivateChild {throw 'PUBLIC_FAKE_FORBIDDEN_NATIVE_PROCESS'}
        Set-Item Function:script:Remove-R1OwnedTemporaryDirectory {
          param([string]$Path,[string]$PrivateRoot,[string[]]$AllowedFiles)
          $script:R1StageFixture.cleanupCalls.Add($Path)
          if($script:R1StageFixture.cleanupFailure-and$script:R1StageFixture.cleanupCalls.Count-eq1){throw 'PUBLIC_FAKE_CLEANUP_PRIVATE_PATH'}
          if(-not$Path.StartsWith($script:R1StageFixture.root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'PUBLIC_FAKE_ISOLATION_FAILED'}
          if(Test-Path -LiteralPath $Path){
            foreach($item in @(Get-ChildItem -LiteralPath $Path -Force)){
              if($item.PSIsContainer-or$item.Name-notin$AllowedFiles-or($item.Attributes-band[IO.FileAttributes]::ReparsePoint)){throw 'PUBLIC_FAKE_UNEXPECTED_CLEANUP_ENTRY'}
              Remove-Item -LiteralPath $item.FullName -Force
            }
            Remove-Item -LiteralPath $Path -Force
          }
        }
        if((Get-R1OwnerPaths).sourceKey-ne$context.paths.sourceKey){throw 'PUBLIC_FAKE_ISOLATION_FAILED'}
        try{Invoke-R1OwnerSigning $bundle *> $null;return 'PUBLIC_FAKE_UNEXPECTED_SUCCESS'}catch{return Get-R1FailureCategory $_.Exception.Message}
      }finally{
        foreach($name in $replacements){Set-Item ('Function:script:'+$name) $originals[$name]}
        Remove-Variable -Scope Script -Name R1StageFixture -ErrorAction SilentlyContinue
      }
    } $context $bundle
    Must ($actual-eq$Expected) 'Integrated category mismatch'
    Must ($context.cleanupCalls.Count-eq2) 'Both controlled temporary directories must be attempted'
    Must (-not(Test-Path -LiteralPath (Join-Path $bundle 'delivery/OWNER_RESULT.json'))) 'Failure published a success receipt'
    $attempt=Write-R1FailedAttempt $bundle $actual
    $record=Get-Content -LiteralPath $attempt -Raw|ConvertFrom-Json -AsHashtable
    Must ($record.Count-eq4-and$record.category-eq$Expected) 'Public attempt shape/category changed'
    Must (@($record.Keys|Where-Object{$_-notin@('formatVersion','status','category','createdAtUtc')}).Count-eq0) 'Extra public fields'
    $json=Get-Content -LiteralPath $attempt -Raw
    Must (-not$json.Contains('PUBLIC_FAKE')-and-not$json.Contains($root)) 'Fixture details escaped into public evidence'
  }finally{
    $full=[IO.Path]::GetFullPath($root);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
    if(-not$full.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)-or[IO.Path]::GetFileName($full)-notmatch'^recipio-public-owner-stage-[a-f0-9]{32}$'){throw 'Synthetic cleanup boundary failed'}
    if(@(Get-ChildItem -LiteralPath $full -Recurse -Force|Where-Object{$_.Attributes-band[IO.FileAttributes]::ReparsePoint}).Count){throw 'Unexpected synthetic reparse point'}
    Remove-Item -LiteralPath $full -Recurse -Force
  }
}

foreach($stage in @('SOURCE_PASSWORD','STORE_PASSWORD','BACKUP_PASSWORD','IDENTITY_VERIFY_IMPORT')){
  Check ('integrated '+$stage+' failure is sanitized and publishes no success') {
    Test-SyntheticOwnerFailure $stage ('R1P_OWNER_'+$stage+'_UNEXPECTED')
  }
}
Check 'integrated known password policy category survives successful cleanup' {
  Test-SyntheticOwnerFailure 'STORE_PASSWORD' 'R1P_PASSWORD_STRENGTH' -Known
}
Check 'cleanup failure takes priority and second controlled directory is attempted' {
  Test-SyntheticOwnerFailure 'STORE_PASSWORD' 'R1P_PRIVATE_CLEANUP' -Known -CleanupFailure
}
Write-Output ('RESULT '+$script:Passed+' PASS / '+$script:Failed+' FAIL; public synthetic fixtures only; real owner/signing NOT_RUN')
if($script:Failed){exit 1}

param([switch]$RealArchivePreflight)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
$script:Passed=0
$script:Failed=0
function Check([string]$Name,[scriptblock]$Body) {
  try { & $Body; $script:Passed++; Write-Output ('PASS '+$Name) }
  catch { $script:Failed++; Write-Output ('FAIL '+$Name+' ['+$_.Exception.Message+']') }
}
function Must([bool]$Condition,[string]$Reason) { if(-not $Condition){throw $Reason} }
function MustReject([scriptblock]$Body) { $rejected=$false;try{&$Body}catch{$rejected=$true};Must $rejected 'Expected rejection, but behavior is missing' }
function Secret([string]$Text) { ConvertTo-SecureString $Text -AsPlainText -Force }
$pin='29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9'
function SampleManifest {
  @{formatVersion=1;route='A';sourceSha='19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe';packageName='app.recipio.local';certificateSha256=$pin;apks=@(
    @{versionCode=26;versionName='0.11.0-personal.1';file='unsigned/recipio-personal-v26-unsigned.apk';sha256=('a'*64)},
    @{versionCode=27;versionName='0.11.0-personal.2';file='unsigned/recipio-personal-v27-unsigned.apk';sha256=('b'*64)})}
}
Check 'short new password rejected' { MustReject { Assert-R1PasswordPolicy (Secret 'short') } }
Check 'legacy password remains owner-entered without new-password length rule' { Assert-R1PasswordPolicy (Secret 'test') -Legacy }
Check 'non-ASCII new password rejected for tested portability' { MustReject { Assert-R1PasswordPolicy (Secret 'Synthetic-Only-测试123') } }
Check 'newline password rejected' { MustReject { Assert-R1PasswordPolicy (Secret "SyntheticOnly-123`nSuffix") } }
Check 'long ASCII password accepted' { Assert-R1PasswordPolicy (Secret 'Synthetic-Only-A9!73qk') }
Check 'archive creation uses bare password switch and encrypted header' { $a=@(Get-R1ArchiveArguments create 'C:\sample.7z');Must ($a -contains '-p') 'Missing bare -p';Must ($a -contains '-mhe=on') 'Missing encrypted headers';Must ($a -contains '-sccUTF-8') 'Missing deterministic stdin encoding' }
foreach($operation in @('list','test','extract')) { Check ($operation+' omits empty password switch') { $a=@(Get-R1ArchiveArguments $operation 'C:\sample.7z' 'C:\private-restore');Must ($a.Count -gt 2) 'Missing archive operation';Must (@($a|Where-Object{$_ -like '-p*'}).Count -eq 0) 'Recovery must not pass -p' } }
Check 'unexpected archive operation rejected' { MustReject { Get-R1ArchiveArguments dangerous 'C:\sample.7z' } }
Check 'manifest accepts only authorized route and fixed source' { $m=SampleManifest;$m.route='B';MustReject { Assert-R1ReleaseManifest $m $PSScriptRoot -SkipFileChecks } }
Check 'wrong source cannot be signed' { $m=SampleManifest;$m.sourceSha='0'*40;MustReject { Assert-R1ReleaseManifest $m $PSScriptRoot -SkipFileChecks } }
Check 'wrong certificate cannot silently replace identity' { $m=SampleManifest;$m.certificateSha256='c'*64;MustReject { Assert-R1ReleaseManifest $m $PSScriptRoot -SkipFileChecks } }
Check 'old package only; independent route never selected by guess' { $m=SampleManifest;$m.packageName='app.recipio.local.next';MustReject { Assert-R1ReleaseManifest $m $PSScriptRoot -SkipFileChecks } }
Check 'non-monotonic versions rejected' { $m=SampleManifest;$m.apks[1].versionCode=26;MustReject { Assert-R1ReleaseManifest $m $PSScriptRoot -SkipFileChecks } }
Check 'APK path traversal rejected' { $m=SampleManifest;$m.apks[0].file='../outside.apk';MustReject { Assert-R1ReleaseManifest $m $PSScriptRoot -SkipFileChecks } }
Check 'missing actual files fail closed' { $m=SampleManifest;MustReject { Assert-R1ReleaseManifest $m $PSScriptRoot } }
Check 'private directory cannot be inside repository' { MustReject { Assert-R1SafeLocalPath (Join-Path $PSScriptRoot 'private') @($PSScriptRoot) } }
Check 'UNC private storage rejected' { MustReject { Assert-R1SafeLocalPath '\\server\share\private' @() } }
Check 'raw secret cannot enter public receipt' { MustReject { Assert-R1PublicReceipt @{status='PASS';password='SYNTHETIC_ONLY'} } }
Check 'unverified backup cannot produce successful receipt' { MustReject { Assert-R1PublicReceipt @{status='SIGNED_LOCAL_STATIC_VALIDATED_PENDING_DEVICE';backupRestoreVerified=$false} } }
Check 'captured terminal refuses owner-only entry' { MustReject { Assert-R1PrivateConsole } }
Check 'existing personal identity must be reused without source access' { Must ((Get-R1IdentityAction $true $false)-eq'REUSE_PERSONAL_COPY') 'Existing identity not reused' }
Check 'old source import is not new identity generation' { Must ((Get-R1IdentityAction $false $true)-eq'IMPORT_EXISTING_SOURCE') 'Source reuse missing' }
Check 'unavailable identity stops instead of generating route B' { MustReject { Get-R1IdentityAction $false $false } }
Check 'publication requires verified recovered backup and both signatures' { MustReject { Assert-R1PublishGate @{backupRestored=$false;seedVerified=$true;finalVerified=$true;identityVerified=$true;privateCleanupVerified=$true} } }
Check 'partial signing cannot publish final candidate' { MustReject { Assert-R1PublishGate @{backupRestored=$true;seedVerified=$true;finalVerified=$false;identityVerified=$true;privateCleanupVerified=$true} } }
Check 'private cleanup must precede successful public receipt' { MustReject { Assert-R1PublishGate @{backupRestored=$true;seedVerified=$true;finalVerified=$true;identityVerified=$true;privateCleanupVerified=$false} } }
Check 'publication complete gate accepted' { Assert-R1PublishGate @{backupRestored=$true;seedVerified=$true;finalVerified=$true;identityVerified=$true;privateCleanupVerified=$true} }
Check 'nested receipt secret rejected' {
  $r=@{status='SIGNED_LOCAL_STATIC_VALIDATED_PENDING_DEVICE';backupRestoreVerified=$true;sourceSha='19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe';certificateSha256=$pin;packageName='app.recipio.local';finalApk=@{password='SYNTHETIC_ONLY'};verificationApk=@{}}
  MustReject { Assert-R1PublicReceipt $r }
}
Check 'archive unexpected path rejected before extraction' { MustReject { Assert-R1ArchiveListing "----------`nPath = ../outside.p12`nSize = 10`nEncrypted = +`nMethod = LZMA2 7zAES`n" } }
Check 'archive incomplete contents rejected' { MustReject { Assert-R1ArchiveListing "----------`nPath = identity.p12`nSize = 10`nEncrypted = +`nMethod = LZMA2 7zAES`n" } }
Check 'private env value cannot be placed in child arguments' {
  MustReject { Invoke-R1PrivateChild (Get-Process -Id $PID).Path @('-NoProfile','-Command','PUBLIC-SYNTHETIC-ONLY-A9!') @{RECIPIO_PRIVATE_PROBE=(Secret 'PUBLIC-SYNTHETIC-ONLY-A9!')} }
}
Check 'child env and stdin transport tested without global environment or password argv' {
  $probe=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-child-'+[guid]::NewGuid().ToString('N')+'.ps1')
  $body='$a=[Console]::In.ReadLine();if($env:RECIPIO_PRIVATE_PROBE -eq "PUBLIC-SYNTHETIC-ONLY-A9!" -and $a -eq "PUBLIC-SYNTHETIC-ONLY-A9!" -and $args.Count -eq 0){"PUBLIC_PROBE_PASS"}else{exit 9}'
  [IO.File]::WriteAllText($probe,$body,[Text.UTF8Encoding]::new($false))
  $secret=Secret 'PUBLIC-SYNTHETIC-ONLY-A9!'
  try {
    $r=Invoke-R1PrivateChild (Get-Process -Id $PID).Path @('-NoLogo','-NoProfile','-File',$probe) @{RECIPIO_PRIVATE_PROBE=$secret} @($secret)
    Must ($r.ExitCode-eq0-and$r.Stdout.Trim()-eq'PUBLIC_PROBE_PASS') 'Private child channel failed'
    Must (-not(Test-Path Env:RECIPIO_PRIVATE_PROBE)) 'Private secret leaked to parent/global environment'
  } finally {$secret.Dispose();Remove-Item -LiteralPath $probe -Force}
}
Check 'private child does not inherit unrelated parent environment' {
  $probe=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-environment-'+[guid]::NewGuid().ToString('N')+'.ps1')
  [IO.File]::WriteAllText($probe,'if($env:RECIPIO_PUBLIC_TEST_PARENT){exit 9}else{"ISOLATED_ENVIRONMENT_PASS"}',[Text.UTF8Encoding]::new($false))
  $env:RECIPIO_PUBLIC_TEST_PARENT='PUBLIC-SYNTHETIC-NONSECRET'
  try{$r=Invoke-R1PrivateChild (Get-Process -Id $PID).Path @('-NoLogo','-NoProfile','-File',$probe);Must ($r.ExitCode-eq0-and$r.Stdout.Trim()-eq'ISOLATED_ENVIRONMENT_PASS') 'Unrelated environment reached private child'}
  finally{Remove-Item Env:RECIPIO_PUBLIC_TEST_PARENT;Remove-Item -LiteralPath $probe -Force}
}
if($RealArchivePreflight){Check 'real modern 7zip creates AES256 archive and rejects wrong password with exact restore' { $r=Test-R1ArchiveTransport 'E:/CODEX/Tools/recipio-signing/7zip-26.05/portable/x64/7za.exe';Must ($r.status-eq'PASS'-and$r.privateKeyUsed-eq$false) 'Archive preflight did not pass' }}
Write-Output ('RESULT '+$script:Passed+' PASS / '+$script:Failed+' FAIL')
if($script:Failed){exit 1}

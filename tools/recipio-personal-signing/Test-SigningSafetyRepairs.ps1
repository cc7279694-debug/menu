# Public synthetic configuration/files only. Never read actual policy JSON or keys.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
$module=Get-Module Recipio.PersonalSigning
$script:Passed=0;$script:Failed=0
function Check([string]$Name,[scriptblock]$Body){try{&$Body;$script:Passed++;Write-Output ('PASS '+$Name)}catch{$script:Failed++;Write-Output ('FAIL '+$Name+' ['+$_.Exception.Message+']')}}
function Must([bool]$Condition,[string]$Reason){if(-not$Condition){throw $Reason}}
function MustReject([scriptblock]$Body){$rejected=$false;try{&$Body}catch{$rejected=$true};Must $rejected 'Expected security rejection is missing'}
Check 'empty policies with unrelated configuration remain allowed' {Assert-R1PowerShellConfigPolicies '{"PSModulePath":"PUBLIC_SYNTHETIC_PATH"}'}
Check 'explicitly disabled logging policies allowed' {Assert-R1PowerShellConfigPolicies '{"PowerShellPolicies":{"Transcription":{"EnableTranscripting":false,"EnableInvocationHeader":false,"OutputDirectory":"PUBLIC"},"ScriptBlockLogging":{"EnableScriptBlockLogging":false,"EnableScriptBlockInvocationLogging":false},"ModuleLogging":{"EnableModuleLogging":false,"ModuleNames":["PUBLIC"]}}}'}
foreach($setting in @(@('Transcription','EnableTranscripting'),@('ScriptBlockLogging','EnableScriptBlockLogging'),@('ScriptBlockLogging','EnableScriptBlockInvocationLogging'),@('ModuleLogging','EnableModuleLogging'))){
  Check ('JSON policy rejects enabled '+$setting[1]) {MustReject {Assert-R1PowerShellConfigPolicies ('{"PowerShellPolicies":{"'+$setting[0]+'":{"'+$setting[1]+'":true}}}')}}
}
Check 'JSON string false is an unknown policy value' {MustReject {Assert-R1PowerShellConfigPolicies '{"PowerShellPolicies":{"Transcription":{"EnableTranscripting":"false"}}}'}}
Check 'JSON numeric policy values rejected rather than guessed' {MustReject {Assert-R1PowerShellConfigPolicies '{"PowerShellPolicies":{"ModuleLogging":{"EnableModuleLogging":0}}}'}}
Check 'JSON null logging group rejected' {MustReject {Assert-R1PowerShellConfigPolicies '{"PowerShellPolicies":{"Transcription":null}}'}}
Check 'JSON malformed content fails closed' {MustReject {Assert-R1PowerShellConfigPolicies '{PUBLIC_NOT_VALID_JSON'}}
Check 'JSON duplicate enabled false cannot hide enabled true' {MustReject {Assert-R1PowerShellConfigPolicies '{"PowerShellPolicies":{"Transcription":{"EnableTranscripting":true,"EnableTranscripting":false}}}'}}
Check 'JSON unknown logging-group option fails closed' {MustReject {Assert-R1PowerShellConfigPolicies '{"PowerShellPolicies":{"Transcription":{"EnableTranscripting":false,"UnknownLoggingFlag":false}}}'}}

$root=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-safety-repairs-'+[guid]::NewGuid().ToString('N'))
$null=[IO.Directory]::CreateDirectory($root)
$sevenZip='E:/CODEX/Tools/recipio-signing/7zip-26.05/portable/x64/7za.exe'
$fake=ConvertTo-SecureString 'PUBLIC-SYNTHETIC-SAFETY-9!R' -AsPlainText -Force
try{
  $allUsers=Join-Path $root 'all-users.json';$currentUser=Join-Path $root 'current-user.json'
  Check 'missing policy files are permitted' {Assert-R1PowerShellPolicyFiles @($allUsers,$currentUser)}
  [IO.File]::WriteAllText($allUsers,'{"PowerShellPolicies":{"Transcription":{"EnableTranscripting":true}}}')
  [IO.File]::WriteAllText($currentUser,'{"PowerShellPolicies":{"Transcription":{"EnableTranscripting":false}}}')
  Check 'enabled AllUsers policy cannot be hidden by CurrentUser override' {MustReject {Assert-R1PowerShellPolicyFiles @($allUsers,$currentUser)}}
  [IO.File]::WriteAllText($allUsers,'{}');[IO.File]::WriteAllText($currentUser,'{"PowerShellPolicies":{"ModuleLogging":{"EnableModuleLogging":true}}}')
  Check 'CurrentUser configuration is inspected separately' {MustReject {Assert-R1PowerShellPolicyFiles @($allUsers,$currentUser)}}
  $notAFile=Join-Path $root 'policy-path-is-directory';$null=[IO.Directory]::CreateDirectory($notAFile)
  Check 'policy read failure fails closed without outputting configuration' {MustReject {Assert-R1PowerShellPolicyFiles @($notAFile)}}

  $private=Join-Path $root 'private'; & $module {param($p)New-R1RestrictedDirectory $p @()} $private
  $owned=Join-Path $private 'identity.p12';[IO.File]::WriteAllText($owned,'PUBLIC NON-KEY BYTES')
  Check 'new owner and SYSTEM inherited file ACL is accepted' {Assert-R1ExistingPrivateFile $owned}
  $acl=Get-Acl -LiteralPath $owned
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),'Read','Allow'))
  Set-Acl -LiteralPath $owned -AclObject $acl
  $before=(Get-Acl -LiteralPath $owned).Sddl
  Check 'existing leaf explicit Everyone Allow is rejected' {MustReject {Assert-R1ExistingPrivateFile $owned}}
  Check 'rejecting unsafe existing leaf never modifies its DACL' {Must ((Get-Acl -LiteralPath $owned).Sddl-eq$before) 'Unknown existing leaf ACL was changed'}
  $target=Join-Path $root 'public-link-target';$null=[IO.Directory]::CreateDirectory($target)
  $link=Join-Path $private 'linked-identity.p12';$null=New-Item -ItemType Junction -Path $link -Target $target
  Check 'existing private leaf junction is rejected before any reuse' {MustReject {Assert-R1ExistingPrivateFile $link}}

  $archiveRoot=Join-Path $root 'archives';$null=[IO.Directory]::CreateDirectory($archiveRoot)
  foreach($name in @('identity.p12','identity.cer','recovery.json')){[IO.File]::WriteAllText((Join-Path $archiveRoot $name),'PUBLIC NON-KEY ARCHIVE INPUT '+$name)}
  foreach($headers in @($false,$true)){
    $archive=Join-Path $archiveRoot ('public-headers-'+$headers+'.7z')
    $arguments=@(Get-R1ArchiveArguments create $archive|Where-Object{$_-ne'-mhe=on'})+@('-mhe='+$(if($headers){'on'}else{'off'}))
    $created=Invoke-R1PrivateChild $sevenZip $arguments @{} @($fake,$fake) $archiveRoot
    if($created.ExitCode-ne0){throw 'Public synthetic archive setup failed'}
    if($headers){Check 'encrypted headers require password and correct listing remains usable' {Assert-R1ArchiveHeaderEncryption $sevenZip $archive $archiveRoot;$listing=Invoke-R1PrivateChild $sevenZip (Get-R1ArchiveArguments list $archive) @{} @($fake) $archiveRoot;Must ($listing.ExitCode-eq0) 'Correct public password was rejected';Assert-R1ArchiveListing $listing.Stdout}}
    else{Check 'AES data with plaintext archive headers is rejected' {MustReject {Assert-R1ArchiveHeaderEncryption $sevenZip $archive $archiveRoot}}}
  }
}finally{
  $fake.Dispose()
  # Entire tree is public generated data; never follows a junction during cleanup.
  $full=[IO.Path]::GetFullPath($root);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if(-not$full.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)-or[IO.Path]::GetFileName($full)-notmatch'^recipio-public-safety-repairs-[a-f0-9]{32}$'){throw 'Synthetic cleanup boundary failed'}
  if(Test-Path -LiteralPath $link){Remove-Item -LiteralPath $link -Force}
  $remaining=@(Get-ChildItem -LiteralPath $full -Recurse -Force)
  if(@($remaining|Where-Object{$_.Attributes-band[IO.FileAttributes]::ReparsePoint}).Count){throw 'Unexpected synthetic reparse point'}
  Remove-Item -LiteralPath $full -Recurse -Force
}
Write-Output ('RESULT '+$script:Passed+' PASS / '+$script:Failed+' FAIL; only public synthetic policy/files/archive material')
if($script:Failed){exit 1}

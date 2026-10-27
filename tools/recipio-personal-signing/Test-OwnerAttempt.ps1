# Public synthetic failures only. No real owner/key/password operations.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
$script:Passed=0;$script:Failed=0
function Check([string]$Name,[scriptblock]$Body){try{&$Body;$script:Passed++;Write-Output ('PASS '+$Name)}catch{$script:Failed++;Write-Output ('FAIL '+$Name+' ['+$_.Exception.Message+']')}}
function Must([bool]$Condition,[string]$Reason){if(-not$Condition){throw $Reason}}
function MustReject([scriptblock]$Body){$rejected=$false;try{&$Body}catch{$rejected=$true};Must $rejected 'Expected rejection is missing'}
function Read-Attempt([string]$Path){return Get-Content -LiteralPath $Path -Raw|ConvertFrom-Json -AsHashtable}
function Check-Attempt($Record,[string]$Category){
  Must (@($Record.Keys).Count-eq4) 'Failure record has extra/missing fields'
  Must (@($Record.Keys|Where-Object{$_-notin@('formatVersion','status','category','createdAtUtc')}).Count-eq0) 'Unexpected public record field'
  Must ($Record.formatVersion-eq1-and$Record.status-eq'FAILED'-and$Record.category-eq$Category) 'Incorrect public failure status/category'
  $stamp=$Record.createdAtUtc
  if($stamp-is[datetime]){Must ($stamp.Kind-eq[DateTimeKind]::Utc) 'Parsed timestamp is not UTC';$stamp=$stamp.ToString('o')}
  Must ([string]$stamp-match'\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z\z') 'UTC timestamp missing'
}
if(Get-Command Get-R1FailureCategory -ErrorAction SilentlyContinue){
  Check 'known category remains a category only' {Must ((Get-R1FailureCategory 'R1P_PRIVATE_CONSOLE_REQUIRED')-eq'R1P_PRIVATE_CONSOLE_REQUIRED') 'Known category changed'}
  Check 'arbitrary exception is reduced to fixed fallback' {Must ((Get-R1FailureCategory 'PUBLIC-FAKE-SENSITIVE-value-9!')-eq'UNEXPECTED_FAILURE') 'Raw exception was not discarded'}
  Check 'trailing newline cannot smuggle exception text' {Must ((Get-R1FailureCategory "R1P_TEST`nPUBLIC-FAKE-SENSITIVE-value-9!")-eq'UNEXPECTED_FAILURE') 'Multiline text accepted'}
  Check 'category match cannot accept a final newline' {Must ((Get-R1FailureCategory "R1P_TEST`n")-eq'UNEXPECTED_FAILURE') 'Non-exact category accepted'}
  Check 'empty exception text has fixed fallback' {Must ((Get-R1FailureCategory '')-eq'UNEXPECTED_FAILURE') 'Empty message category missing'}
}else{Write-Output 'PENDING helper API tests; first run existing launcher/entry behavior regressions'}
Check 'launcher creates a separate console and waits without inheriting capture' {
  $launcher=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Start-RecipioPersonalSigning.cmd') -Raw
  Must ($launcher-match'(?im)^start "RECIPIO private signing" /wait "%RECIPIO_PRIVATE_PWSH%" -NoLogo -NoProfile') 'Explicit independent console launch is missing'
  Must ($launcher-notmatch'(?im)^start .* /b\b') 'Launcher must not share the captured console'
  Must ($launcher-notmatch'%\*') 'Arbitrary shell arguments must not reach private entry'
}
Check 'closing prompts distinguish failure and success without treating Enter as proof' {
  $entry=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Start-RecipioPersonalSigning.ps1') -Raw
  Must ($entry.Contains('本次未完成签名')) 'Failure must say signing is incomplete'
  Must ($entry.Contains('Enter 只关闭窗口')) 'Failure close prompt must explain Enter'
  Must ($entry.Contains('OWNER_RESULT.json')) 'Success must point to existing public evidence'
  Must ($entry.Contains('请返回 Codex')) 'Failure must explain the next action'
}
$root=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-owner-attempt-'+[guid]::NewGuid().ToString('N'))
$bundle=Join-Path $root 'bundle';$link=Join-Path $root 'bundle-link'
$null=[IO.Directory]::CreateDirectory($bundle)
try{
 if(Get-Command Write-R1FailedAttempt -ErrorAction SilentlyContinue){
  Check 'failure writes only sanitized status and UTC to a uniquely named new file' {
    $file=Write-R1FailedAttempt $bundle 'PUBLIC-FAKE-SENSITIVE-value-9!'
    Must ([IO.Path]::GetFileName($file)-match'\AOWNER_ATTEMPT-[a-f0-9]{32}\.json\z') 'Attempt name is not unique GUID form'
    Check-Attempt (Read-Attempt $file) 'UNEXPECTED_FAILURE'
    Must (-not(Get-Content -LiteralPath $file -Raw).Contains('PUBLIC-FAKE-SENSITIVE')) 'Raw failure text leaked'
    Must (-not(Get-Content -LiteralPath $file -Raw).Contains($bundle)) 'Bundle path leaked into record'
  }
  Check 'repeated failures do not overwrite earlier attempt or successful result' {
    $success=Join-Path $bundle 'OWNER_RESULT.json';[IO.File]::WriteAllText($success,'PUBLIC-SENTINEL-NOT-A-SUCCESS')
    $first=Write-R1FailedAttempt $bundle 'R1P_TEST_FAILURE';$before=Get-Content -LiteralPath $first -Raw
    $second=Write-R1FailedAttempt $bundle 'R1P_ANOTHER_FAILURE'
    Must ($first-ne$second-and(Test-Path -LiteralPath $first)) 'Earlier failure was overwritten'
    Must ((Get-Content -LiteralPath $first -Raw)-eq$before) 'Earlier failure changed'
    Must ((Get-Content -LiteralPath $success -Raw)-eq'PUBLIC-SENTINEL-NOT-A-SUCCESS') 'Existing result changed'
  }
  $repo=Join-Path $root 'fake-repository';$null=[IO.Directory]::CreateDirectory($repo)
  [IO.File]::WriteAllText((Join-Path $repo '.git'),'PUBLIC-FAKE-GIT-MARKER')
  Check 'failure writer refuses a repository and creates no public attempt there' {MustReject {Write-R1FailedAttempt $repo 'R1P_TEST'};Must (@(Get-ChildItem -LiteralPath $repo -Filter 'OWNER_ATTEMPT-*.json').Count-eq0) 'Repository record was written'}
  $null=New-Item -ItemType Junction -Path $link -Target $bundle
  Check 'failure writer refuses a reparse bundle path' {MustReject {Write-R1FailedAttempt $link 'R1P_TEST'}}
  Check 'failure writer refuses network path before access' {MustReject {Write-R1FailedAttempt '\\PUBLIC-FAKE-SERVER\share\bundle' 'R1P_TEST'}}
  Check 'failure writer never creates a missing bundle directory' {$missing=Join-Path $root 'missing';MustReject {Write-R1FailedAttempt $missing 'R1P_TEST'};Must (-not(Test-Path -LiteralPath $missing)) 'Unexpected directory created'}
 }
  $captured=Join-Path $root 'captured-entry';$null=[IO.Directory]::CreateDirectory($captured)
  foreach($file in @('Recipio.PersonalSigning.psm1','Start-RecipioPersonalSigning.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $captured $file)}
  # Retain the real capture guard but replace owner before loading the module.
  # Even the initial RED run must never invoke a real owner routine.
  Add-Content -LiteralPath (Join-Path $captured 'Recipio.PersonalSigning.psm1') -Value @'
# Match the test reader encoding; Windows console codepage is otherwise OEM.
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
function Invoke-R1OwnerSigning { throw 'R1P_FORBIDDEN_FAKE_OWNER_REACHED' }
Export-ModuleMember -Function Assert-R1PrivateConsole,Invoke-R1OwnerSigning,Get-R1FailureCategory,Write-R1FailedAttempt
'@
  Check 'actual captured entry fails before owner/password and leaves a sanitized public attempt' {
    $result=Invoke-R1PrivateChild (Get-Process -Id $PID).Path @('-NoLogo','-NoProfile','-File',(Join-Path $captured 'Start-RecipioPersonalSigning.ps1')) @{} @() $captured 20
    Must ($result.ExitCode-eq1) 'Captured entry did not fail closed'
    $attempts=@(Get-ChildItem -LiteralPath $captured -Filter 'OWNER_ATTEMPT-*.json')
    Must ($attempts.Count-eq1) 'Captured failure left no unique attempt'
    Check-Attempt (Read-Attempt $attempts[0].FullName) 'R1P_PRIVATE_CONSOLE_REQUIRED'
    Must ($result.Stdout.Contains('本次未完成签名')-and$result.Stdout.Contains('请返回 Codex')) 'Failure explanation missing'
    Must (-not(Test-Path -LiteralPath (Join-Path $captured 'delivery'))) 'Owner flow reached delivery setup'
  }
  $fakeBundle=Join-Path $root 'fake-entry';$null=[IO.Directory]::CreateDirectory($fakeBundle)
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Start-RecipioPersonalSigning.ps1') -Destination (Join-Path $fakeBundle 'Start-RecipioPersonalSigning.ps1')
  $moduleText=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Raw
  $fakeOverrides=@'
function Assert-R1PrivateConsole { }
function Invoke-R1OwnerSigning { throw 'PUBLIC-FAKE-SENSITIVE-value-9! C:\PUBLIC_FAKE_PRIVATE_PATH' }
Export-ModuleMember -Function Assert-R1PrivateConsole,Invoke-R1OwnerSigning,Get-R1FailureCategory,Write-R1FailedAttempt
'@
  [IO.File]::WriteAllText((Join-Path $fakeBundle 'Recipio.PersonalSigning.psm1'),$moduleText+"`n"+$fakeOverrides,[Text.UTF8Encoding]::new($false))
  Check 'fake owner exception cannot expose raw sensitive text in receipt or console' {
    $result=Invoke-R1PrivateChild (Get-Process -Id $PID).Path @('-NoLogo','-NoProfile','-File',(Join-Path $fakeBundle 'Start-RecipioPersonalSigning.ps1')) @{} @() $fakeBundle 20
    Must ($result.ExitCode-eq1) 'Fake failure did not stop'
    $attempts=@(Get-ChildItem -LiteralPath $fakeBundle -Filter 'OWNER_ATTEMPT-*.json');Must ($attempts.Count-eq1) 'Fake failure has no attempt'
    Check-Attempt (Read-Attempt $attempts[0].FullName) 'UNEXPECTED_FAILURE'
    $combined=$result.Stdout+$result.Stderr+(Get-Content -LiteralPath $attempts[0].FullName -Raw)
    Must (-not$combined.Contains('PUBLIC-FAKE-SENSITIVE')-and-not$combined.Contains('PUBLIC_FAKE_PRIVATE_PATH')) 'Raw fake exception leaked'
  }
}finally{
  # Only generated public text, source copies and fake metadata exist in this tree.
  $full=[IO.Path]::GetFullPath($root);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if(-not$full.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)-or[IO.Path]::GetFileName($full)-notmatch'^recipio-public-owner-attempt-[a-f0-9]{32}$'){throw 'Public synthetic cleanup boundary failed'}
  if(Test-Path -LiteralPath $link){Remove-Item -LiteralPath $link -Force}
  if(@(Get-ChildItem -LiteralPath $full -Recurse -Force|Where-Object{$_.Attributes-band[IO.FileAttributes]::ReparsePoint}).Count){throw 'Unexpected synthetic reparse point'}
  Remove-Item -LiteralPath $full -Recurse -Force
}
Write-Output ('RESULT '+$script:Passed+' PASS / '+$script:Failed+' FAIL; public synthetic errors only; real owner/signing NOT_RUN')
if($script:Failed){exit 1}

# Pure in-memory category tests. No filesystem, passwords, keystores or owner flow.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
$module=Get-Module Recipio.PersonalSigning
$passed=0;$failed=0
function Check([string]$Name,[scriptblock]$Body){
  try{& $Body;$script:passed++;Write-Output ('PASS '+$Name)}
  catch{$script:failed++;Write-Output ('FAIL '+$Name)}
}
function Must([bool]$Condition){if(-not$Condition){throw 'PUBLIC_ASSERTION_FAILED'}}

foreach($known in @('R1P_PASSWORD_STRENGTH','R1P_KEY_CERTIFICATE_MISMATCH','R1P_PRIVATE_ACL','R1P_ARCHIVE_NOT_AES256','R1P_TOOLCHAIN_JAVA_MISSING','R1P_OWNER_STORE_PASSWORD_UNEXPECTED')){
  Check ('known fixed category '+$known+' survives') {
    Must ((Get-R1FailureCategory $known) -ceq $known)
  }
}
foreach($case in @(
  @{name='unknown uppercase category';value='R1P_FAKE_PRIVATE_SECRET'},
  @{name='unknown fixed-tool category';value='R1P_TOOLCHAIN_FAKE_MISSING'},
  @{name='unknown tool reason';value='R1P_TOOLCHAIN_JAVA_FAKE'},
  @{name='unknown stage category';value='R1P_OWNER_FAKE_UNEXPECTED'},
  @{name='embedded private path';value='R1P_FAKE C:\PUBLIC_FAKE_PRIVATE_PATH'},
  @{name='multiline fake secret';value="R1P_PASSWORD_STRENGTH`nPUBLIC_FAKE_PASSWORD"},
  @{name='trailing newline';value="R1P_PRIVATE_ACL`n"},
  @{name='fake native output';value='PUBLIC_FAKE_NATIVE_OUTPUT'},
  @{name='empty message';value=''}
)){
  Check ('untrusted '+$case.name+' has fixed fallback') {
    $actual=Get-R1FailureCategory $case.value
    Must ($actual -ceq 'UNEXPECTED_FAILURE')
    Must (-not $actual.Contains('PUBLIC_FAKE'))
  }
}
Check 'owner stage wraps unknown category without exposing it' {
  $actual=& $module { Get-R1OwnerFailureCategory 'R1P_FAKE_PRIVATE_SECRET' 'STORE_PASSWORD' }
  Must ($actual -ceq 'R1P_OWNER_STORE_PASSWORD_UNEXPECTED')
}
Write-Output ('RESULT '+$passed+' PASS / '+$failed+' FAIL; public synthetic strings only')
if($failed){exit 1}

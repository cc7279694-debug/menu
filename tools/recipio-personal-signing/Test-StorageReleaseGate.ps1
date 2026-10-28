# Pure in-memory failure gate test. No real console, private path or file access.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$module=Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force -PassThru
$result=& $module {
  $original=(Get-Item Function:Assert-R1PrivateConsole).ScriptBlock
  $script:storageGateFakeReached=$false
  try{
    Set-Item Function:script:Assert-R1PrivateConsole {
      $script:storageGateFakeReached=$true
      throw 'PUBLIC_FAKE_OWNER_FLOW_MUST_NOT_RUN'
    }
    $category=$null
    try{Invoke-R1OwnerSigning 'PUBLIC_FAKE_BUNDLE' | Out-Null}catch{$category=Get-R1FailureCategory $_.Exception.Message}
    return @{category=$category;reached=$script:storageGateFakeReached}
  }finally{
    Set-Item Function:script:Assert-R1PrivateConsole $original
    Remove-Variable -Scope Script -Name storageGateFakeReached -ErrorAction SilentlyContinue
  }
}
if($result.category-cne'R1P_STORAGE_REPAIR_NOT_VERIFIED'-or$result.reached){
  Write-Output 'FAIL unverified storage must stop before owner flow'
  exit 1
}
Write-Output 'PASS unverified storage stops before owner flow'
Write-Output 'RESULT 1 PASS / 0 FAIL; in-memory only; real owner/signing NOT_RUN'

# Public in-memory fixtures only. No owner, filesystem, key or backup operations.
param([string]$ModulePath=(Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1'))
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$module=Import-Module $ModulePath -Force -PassThru
$script:passed=0;$script:failed=0
function Check([string]$Name,[scriptblock]$Body){
  try{& $Body;$script:passed++;Write-Output ('PASS '+$Name)}
  catch{$script:failed++;Write-Output ('FAIL '+$Name)} # Never print fixture or exception text.
}
function Must([bool]$Condition){if(-not$Condition){throw 'PUBLIC_ASSERTION_FAILED'}}
function Expect-Policy([string]$Fixture,[bool]$Expected,[switch]$Legacy){
  $secret=ConvertTo-SecureString $Fixture -AsPlainText -Force
  try{
    $accepted=$false
    try{Assert-R1PasswordPolicy $secret -Legacy:$Legacy;$accepted=$true}catch{}
    Must ($accepted-eq$Expected)
  }finally{$secret.Dispose()}
}
Check 'new uppercase plus digits is fewer than three classes' {Expect-Policy 'PUBLICSYNTHETIC123456' $false}
Check 'new lowercase plus digits is fewer than three classes' {Expect-Policy 'publicsynthetic123456' $false}
Check 'new mixed case plus digits has three classes' {Expect-Policy 'PublicSynthetic123456' $true}
Check 'new mixed case plus symbols has three classes' {Expect-Policy 'PublicSynthetic!!!!' $true}
Check 'new lowercase plus digits plus symbols has three classes' {Expect-Policy 'publicsynthetic123!' $true}
Check 'new uppercase plus digits plus symbols has three classes' {Expect-Policy 'PUBLICSYNTHETIC123!' $true}
Check 'new three classes under minimum length is rejected' {Expect-Policy 'Public123!' $false}
Check 'new non-ASCII is rejected' {Expect-Policy 'PublicSynthetic123测试!' $false}
Check 'legacy short ASCII remains accepted' {Expect-Policy 'public9' $true -Legacy}
Check 'legacy two classes remain accepted' {Expect-Policy 'PUBLICSYNTHETIC123456' $true -Legacy}
Check 'legacy non-ASCII retains existing rejection' {Expect-Policy 'Public测试9!' $false -Legacy}

function Get-SyntheticUsage([string]$Usage,[string]$Action,[bool]$BackupExists){
  return & $module {
    param($u,$a,$b)
    Get-R1PasswordUsagePolicy $u $a $b
  } $Usage $Action $BackupExists
}
function Expect-Usage([string]$Usage,[string]$Action,[bool]$BackupExists,[bool]$Legacy,[bool]$Confirm){
  $policy=Get-SyntheticUsage $Usage $Action $BackupExists
  Must ($policy -is [System.Collections.IDictionary])
  Must ($policy.legacy -is [bool] -and $policy.legacy -eq $Legacy)
  Must ($policy.confirm -is [bool] -and $policy.confirm -eq $Confirm)
}
Check 'existing personal copy uses legacy once without confirmation' {
  Expect-Usage 'PERSONAL_COPY' 'REUSE_PERSONAL_COPY' $false $true $false
}
Check 'new personal copy requires current policy and confirmation' {
  Expect-Usage 'PERSONAL_COPY' 'IMPORT_EXISTING_SOURCE' $false $false $true
}
Check 'existing encrypted backup uses legacy and confirmation' {
  Expect-Usage 'BACKUP' 'REUSE_PERSONAL_COPY' $true $true $true
}
Check 'new encrypted backup requires current policy and confirmation' {
  Expect-Usage 'BACKUP' 'IMPORT_EXISTING_SOURCE' $false $false $true
}
Check 'existing backup compatibility does not depend on personal-copy route' {
  Expect-Usage 'BACKUP' 'IMPORT_EXISTING_SOURCE' $true $true $true
}
Check 'new backup policy applies on personal-copy reuse' {
  Expect-Usage 'BACKUP' 'REUSE_PERSONAL_COPY' $false $false $true
}
Check 'unknown identity action fails closed with a fixed category' {
  $category=$null
  try{Get-SyntheticUsage 'PERSONAL_COPY' 'PUBLIC_FAKE_UNKNOWN' $false|Out-Null}catch{$category=Get-R1FailureCategory $_.Exception.Message}
  Must ($category-eq'R1P_PASSWORD_USAGE_POLICY')
}
Check 'unknown password usage fails closed with a fixed category' {
  $category=$null
  try{Get-SyntheticUsage 'PUBLIC_FAKE_UNKNOWN' 'REUSE_PERSONAL_COPY' $false|Out-Null}catch{$category=Get-R1FailureCategory $_.Exception.Message}
  Must ($category-eq'R1P_PASSWORD_USAGE_POLICY')
}
Check 'unchanged backup presence is accepted for both states' {
  foreach($state in @($true,$false)){
    & $module {param($s);Assert-R1BackupState $s $s} $state
  }
}
Check 'backup presence changes fail closed with a fixed category' {
  foreach($pair in @(@($true,$false),@($false,$true))){
    $category=$null
    try{& $module {param($a,$b);Assert-R1BackupState $a $b} $pair[0] $pair[1]}catch{$category=Get-R1FailureCategory $_.Exception.Message}
    Must ($category-eq'R1P_BACKUP_STATE_CHANGED')
  }
}

function Invoke-SyntheticRead([string[]]$Fixtures,[bool]$UseLegacy,[bool]$UseConfirm){
  return & $module {
    param($Fixtures,$UseLegacy,$UseConfirm)
    $script:FixtureValues=$Fixtures
    $script:FixtureIndex=0
    $previous=Get-Item Function:script:Read-Host -ErrorAction SilentlyContinue
    try{
      Set-Item Function:script:Read-Host {
        param([string]$Prompt,[switch]$AsSecureString)
        if(-not$AsSecureString-or$script:FixtureIndex-ge$script:FixtureValues.Count){throw 'PUBLIC_FIXTURE_UNEXPECTED_READ'}
        $value=$script:FixtureValues[$script:FixtureIndex]
        $script:FixtureIndex++
        return ConvertTo-SecureString $value -AsPlainText -Force
      }
      $secret=$null;$accepted=$false;$category=$null
      try{$secret=Read-R1Secret 'PUBLIC_SYNTHETIC_PROMPT' -Legacy:$UseLegacy -Confirm:$UseConfirm;$accepted=$true}
      catch{$category=Get-R1FailureCategory $_.Exception.Message}
      finally{if($null-ne$secret){$secret.Dispose()}}
      return @{accepted=$accepted;category=$category;reads=$script:FixtureIndex}
    }finally{
      if($null-ne$previous){Set-Item Function:script:Read-Host $previous.ScriptBlock}else{Remove-Item Function:script:Read-Host}
      Remove-Variable -Scope Script -Name FixtureValues,FixtureIndex -ErrorAction SilentlyContinue
    }
  } $Fixtures $UseLegacy $UseConfirm
}
Check 'existing secret is read once with legacy policy' {
  $result=Invoke-SyntheticRead @('PUBLIC9') $true $false
  Must ($result.accepted-and$result.reads-eq1)
}
Check 'new secret is confirmed exactly once' {
  $result=Invoke-SyntheticRead @('PublicSynthetic123!','PublicSynthetic123!') $false $true
  Must ($result.accepted-and$result.reads-eq2)
}
Check 'mismatched synthetic confirmation is rejected' {
  $result=Invoke-SyntheticRead @('PublicSynthetic123!','OtherSynthetic456!') $false $true
  Must (-not$result.accepted-and$result.reads-eq2-and$result.category-eq'R1P_PASSWORD_CONFIRMATION')
}
Check 'new two-class secret is rejected before confirmation' {
  $result=Invoke-SyntheticRead @('PUBLICSYNTHETIC123456','PUBLICSYNTHETIC123456') $false $true
  Must (-not$result.accepted-and$result.reads-eq1-and$result.category-eq'R1P_PASSWORD_STRENGTH')
}

function Invoke-SyntheticOwnerSecrets([string]$Action,[bool]$BackupExists,[string[]]$Fixtures){
  return & $module {
    param($Action,$BackupExists,$Fixtures)
    $script:OwnerFixtureValues=$Fixtures
    $script:OwnerFixtureIndex=0
    $script:OwnerFixtureSecrets=[Collections.Generic.List[Security.SecureString]]::new()
    $previous=Get-Item Function:script:Read-Host -ErrorAction SilentlyContinue
    try{
      Set-Item Function:script:Read-Host {
        param([string]$Prompt,[switch]$AsSecureString)
        if(-not$AsSecureString-or$script:OwnerFixtureIndex-ge$script:OwnerFixtureValues.Count){throw 'PUBLIC_FIXTURE_UNEXPECTED_READ'}
        $secret=ConvertTo-SecureString $script:OwnerFixtureValues[$script:OwnerFixtureIndex] -AsPlainText -Force
        $script:OwnerFixtureIndex++
        $script:OwnerFixtureSecrets.Add($secret)
        return $secret
      }
      $stage='INITIAL';$bag=$null;$category=$null;$accepted=$false
      $sourcePresent=$false;$storePresent=$false;$backupPresent=$false
      try{
        $bag=Read-R1OwnerSecrets $Action $BackupExists ([ref]$stage)
        if($bag-isnot[System.Collections.IDictionary]){throw 'PUBLIC_FIXTURE_WRONG_BAG'}
        $sourcePresent=$bag.source-is[Security.SecureString]
        $storePresent=$bag.store-is[Security.SecureString]
        $backupPresent=$bag.backup-is[Security.SecureString]
        $accepted=$true
      }catch{$category=Get-R1FailureCategory $_.Exception.Message}
      $allDisposed=$true
      if(-not$accepted){
        foreach($secret in $script:OwnerFixtureSecrets){
          try{
            $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
            try{$allDisposed=$false}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
          }catch{}
        }
      }
      return @{accepted=$accepted;category=$category;stage=$stage;reads=$script:OwnerFixtureIndex;sourcePresent=$sourcePresent;storePresent=$storePresent;backupPresent=$backupPresent;allDisposed=$allDisposed}
    }finally{
      foreach($secret in $script:OwnerFixtureSecrets){$secret.Dispose()}
      if($null-ne$previous){Set-Item Function:script:Read-Host $previous.ScriptBlock}else{Remove-Item Function:script:Read-Host}
      Remove-Variable -Scope Script -Name OwnerFixtureValues,OwnerFixtureIndex,OwnerFixtureSecrets -ErrorAction SilentlyContinue
    }
  } $Action $BackupExists $Fixtures
}
Check 'reuse with existing backup reads legacy secrets once plus confirmation' {
  $result=Invoke-SyntheticOwnerSecrets 'REUSE_PERSONAL_COPY' $true @('PUBLIC9','PUBLIC8','PUBLIC8')
  Must ($result.accepted-and$result.reads-eq3-and$result.stage-eq'PASSWORD_SEPARATION')
  Must (-not$result.sourcePresent-and$result.storePresent-and$result.backupPresent)
}
Check 'import with new backup reads source plus two confirmed new secrets' {
  $result=Invoke-SyntheticOwnerSecrets 'IMPORT_EXISTING_SOURCE' $false @('PUBLIC9','PublicSynthetic123!','PublicSynthetic123!','BackupSynthetic456!','BackupSynthetic456!')
  Must ($result.accepted-and$result.reads-eq5-and$result.stage-eq'PASSWORD_SEPARATION')
  Must ($result.sourcePresent-and$result.storePresent-and$result.backupPresent)
}
Check 'new personal copy rejects two classes before confirmation and disposes read secrets' {
  $result=Invoke-SyntheticOwnerSecrets 'IMPORT_EXISTING_SOURCE' $false @('PUBLIC9','PUBLICSYNTHETIC123456')
  Must (-not$result.accepted-and$result.reads-eq2-and$result.stage-eq'STORE_PASSWORD')
  Must ($result.category-eq'R1P_PASSWORD_STRENGTH'-and$result.allDisposed)
}
Check 'identical personal and backup secrets are rejected and disposed' {
  $result=Invoke-SyntheticOwnerSecrets 'IMPORT_EXISTING_SOURCE' $false @('PUBLIC9','PublicSynthetic123!','PublicSynthetic123!','PublicSynthetic123!','PublicSynthetic123!')
  Must (-not$result.accepted-and$result.reads-eq5-and$result.stage-eq'PASSWORD_SEPARATION')
  Must ($result.category-eq'R1P_BACKUP_PASSWORD_NOT_INDEPENDENT'-and$result.allDisposed)
}
Write-Output ('RESULT '+$script:passed+' PASS / '+$script:failed+' FAIL; in-memory synthetic only; owner/signing NOT_RUN')
if($script:failed){exit 1}

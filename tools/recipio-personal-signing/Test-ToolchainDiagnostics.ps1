# Generated ordinary files and safe hash/path fakes only. No owner/key operation.
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
$module=Get-Module Recipio.PersonalSigning
$script:Passed=0;$script:Failed=0
function Check([string]$CheckName,[scriptblock]$Body){try{&$Body;$script:Passed++;Write-Output ('PASS '+$CheckName)}catch{$script:Failed++;Write-Output ('FAIL '+$CheckName+' [public assertion failed]')}}
function Must([bool]$Condition,[string]$Reason){if(-not$Condition){throw $Reason}}
function Expect-Category([string]$Expected,[scriptblock]$Body){
  $category=$null
  try{&$Body|Out-Null}catch{$category=$_.Exception.Message}
  Must ($category-ceq$Expected) 'Expected fixed category is missing'
  Must ((Get-R1FailureCategory $category)-ceq$Expected) 'Category is not compatible with the existing public sanitizer'
}
$labels=[ordered]@{java='JAVA';keytool='KEYTOOL';aapt='AAPT';zipalign='ZIPALIGN';apksigner='APKSIGNER';sevenZip='SEVENZIP'}
$root=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-toolchain-'+[guid]::NewGuid().ToString('N'))
$null=[IO.Directory]::CreateDirectory($root)
$fixed='7ddf0a3bc451e166679296be630d6f0573eb386159c04184761c43020c484291'
$fixture=@{}
foreach($name in $labels.Keys){
  $path=Join-Path $root ('PUBLIC-'+$name+'.txt')
  [IO.File]::WriteAllText($path,('PUBLIC ORDINARY TEXT '+$name),[Text.UTF8Encoding]::new($false))
  $fixture[$name]=@{path=$path;sha256=$(if($name-eq'sevenZip'){$fixed}else{(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()})}
}
function New-PublicManifest {
  $value=@{tools=@{}}
  foreach($name in $labels.Keys){$value.tools[$name]=@{path=$fixture[$name].path;sha256=$fixture[$name].sha256}}
  return $value
}
function Invoke-PublicToolchain($Manifest,[string]$ThrowHash,[string]$ThrowPath,[string]$SevenHash=$fixed){
  $context=@{sevenPath=$fixture.sevenZip.path;sevenHash=$SevenHash;throwHash=$ThrowHash;throwPath=$ThrowPath}
  return & $module {
    param($Manifest,$context)
    $script:R1DiagnosticFake=$context
    $script:R1DiagnosticHash=(Get-Item Function:Get-R1Hash).ScriptBlock
    $oldTestPath=Get-Item Function:script:Test-Path -ErrorAction SilentlyContinue
    try{
      Set-Item Function:script:Get-R1Hash {
        param([string]$Path)
        if($Path-eq$script:R1DiagnosticFake.throwHash){throw 'PUBLIC-FAKE-SENSITIVE-value-9! PUBLIC_FAKE_PRIVATE_PATH'}
        if($Path-eq$script:R1DiagnosticFake.sevenPath){return $script:R1DiagnosticFake.sevenHash}
        return & $script:R1DiagnosticHash $Path
      }
      Set-Item Function:script:Test-Path {
        param([string]$LiteralPath,[string]$PathType)
        if($LiteralPath-eq$script:R1DiagnosticFake.throwPath){throw 'PUBLIC-FAKE-SENSITIVE-path-error-9!'}
        return Microsoft.PowerShell.Management\Test-Path -LiteralPath $LiteralPath -PathType $PathType
      }
      Get-R1Toolchain $Manifest
    }finally{
      Set-Item Function:script:Get-R1Hash $script:R1DiagnosticHash
      if($null-ne$oldTestPath){Set-Item Function:script:Test-Path $oldTestPath.ScriptBlock}else{Remove-Item Function:script:Test-Path}
      Remove-Variable -Scope Script -Name R1DiagnosticHash,R1DiagnosticFake -ErrorAction SilentlyContinue
    }
  } $Manifest $context
}
try{
  Check 'six valid pins accepted with fixed sevenZip identity' {$result=Invoke-PublicToolchain (New-PublicManifest);Must ($result.Count-eq6) 'All six tools must remain available'}
  foreach($name in $labels.Keys){
    $prefix='R1P_TOOLCHAIN_'+$labels[$name]+'_'
    Check ($name+' absent entry has fixed ENTRY category') {$manifest=New-PublicManifest;$manifest.tools.Remove($name);Expect-Category ($prefix+'ENTRY') {Invoke-PublicToolchain $manifest}}
    Check ($name+' malformed pin has fixed PIN_FORMAT category') {$manifest=New-PublicManifest;$manifest.tools[$name].sha256='PUBLIC_NOT_A_SHA';Expect-Category ($prefix+'PIN_FORMAT') {Invoke-PublicToolchain $manifest}}
    Check ($name+' missing file has fixed MISSING category') {$manifest=New-PublicManifest;$manifest.tools[$name].path=Join-Path $root ('PUBLIC-MISSING-'+$name);Expect-Category ($prefix+'MISSING') {Invoke-PublicToolchain $manifest}}
    Check ($name+' read exception discards fake sensitive message') {$manifest=New-PublicManifest;Expect-Category ($prefix+'READ') {Invoke-PublicToolchain $manifest -ThrowHash $manifest.tools[$name].path}}
    Check ($name+' wrong file hash has fixed HASH category') {$manifest=New-PublicManifest;$manifest.tools[$name].sha256='a'*64;Expect-Category ($prefix+'HASH') {Invoke-PublicToolchain $manifest}}
  }
  Check 'matching file digest cannot replace the fixed sevenZip identity' {$manifest=New-PublicManifest;$manifest.tools.sevenZip.sha256='a'*64;Expect-Category 'R1P_BACKUP_TOOL_IDENTITY' {Invoke-PublicToolchain $manifest -SevenHash ('a'*64)}}
  Check 'path metadata read exception is sanitized as READ' {$manifest=New-PublicManifest;Expect-Category 'R1P_TOOLCHAIN_JAVA_READ' {Invoke-PublicToolchain $manifest -ThrowPath $manifest.tools.java.path}}
  Check 'unexpected entry shape is classified without property exception' {$manifest=New-PublicManifest;$manifest.tools.aapt='PUBLIC_INVALID_ENTRY';Expect-Category 'R1P_TOOLCHAIN_AAPT_ENTRY' {Invoke-PublicToolchain $manifest}}
  Check 'missing digest field is PIN_FORMAT without exception text' {$manifest=New-PublicManifest;$manifest.tools.keytool.Remove('sha256');Expect-Category 'R1P_TOOLCHAIN_KEYTOOL_PIN_FORMAT' {Invoke-PublicToolchain $manifest}}
  Check 'non-string path is ENTRY without emitting its value' {$manifest=New-PublicManifest;$manifest.tools.zipalign.path=@{sensitive='PUBLIC_FAKE_SENSITIVE'};Expect-Category 'R1P_TOOLCHAIN_ZIPALIGN_ENTRY' {Invoke-PublicToolchain $manifest}}
  Check 'missing tool container fails at first fixed tool entry' {Expect-Category 'R1P_TOOLCHAIN_JAVA_ENTRY' {Invoke-PublicToolchain @{}}}
}finally{
  # Only this test's generated ordinary files exist below this exact unique root.
  $full=[IO.Path]::GetFullPath($root);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
  if(-not$full.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase)-or[IO.Path]::GetFileName($full)-notmatch'^recipio-public-toolchain-[a-f0-9]{32}$'){throw 'Synthetic toolchain cleanup boundary failed'}
  $entries=@(Get-ChildItem -LiteralPath $full -Force)
  if(@($entries|Where-Object{$_.PSIsContainer-or($_.Attributes-band[IO.FileAttributes]::ReparsePoint)-or$_.Name-notmatch'^PUBLIC-(java|keytool|aapt|zipalign|apksigner|sevenZip)\.txt$'}).Count){throw 'Unexpected public test file; refusing cleanup'}
  foreach($entry in $entries){Remove-Item -LiteralPath $entry.FullName -Force}
  Remove-Item -LiteralPath $full -Force
}
Write-Output ('RESULT '+$script:Passed+' PASS / '+$script:Failed+' FAIL; generated public files/fakes only; real owner NOT_RUN')
if($script:Failed){exit 1}

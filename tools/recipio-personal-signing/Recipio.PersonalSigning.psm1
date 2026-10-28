Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:R1Source='19bb5c9dc5642edb27203e6c5c0b95d7977ff2fe'
$script:R1Certificate='29ded26bea44f1afe4fe383a302e4b507423d16223469d7da3fe578d9a7f83b9'
$script:R1ArchiveFiles=@('identity.p12','identity.cer','recovery.json')

function Stop-R1([string]$Category) { throw [InvalidOperationException]::new('R1P_'+$Category) }

function ConvertFrom-R1SecureString([Security.SecureString]$Secret) {
  if($null-eq$Secret){Stop-R1 'PASSWORD_REQUIRED'}
  $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Assert-R1PasswordPolicy {
  param([Security.SecureString]$Secret,[switch]$Legacy)
  $text=ConvertFrom-R1SecureString $Secret
  try {
    if($text.Length-eq0-or$text-match'[^\x20-\x7e]'){Stop-R1 'PASSWORD_ASCII_ONLY'}
    if(-not$Legacy){
      $classes=0
      foreach($pattern in @('[a-z]','[A-Z]','[0-9]','[^a-zA-Z0-9]')){if($text-match$pattern){$classes++}}
      if($text.Length-lt16-or$classes-lt3){Stop-R1 'PASSWORD_STRENGTH'}
    }
  } finally { $text=$null }
}

function Test-R1SecretsEqual([Security.SecureString]$First,[Security.SecureString]$Second) {
  $a=ConvertFrom-R1SecureString $First;$b=ConvertFrom-R1SecureString $Second
  try{return [string]::Equals($a,$b,[StringComparison]::Ordinal)}finally{$a=$null;$b=$null}
}

function Read-R1Secret([string]$Prompt,[switch]$Legacy,[switch]$Confirm) {
  $first=Read-Host $Prompt -AsSecureString
  try {
    Assert-R1PasswordPolicy $first -Legacy:$Legacy
    if($Confirm){
      $second=Read-Host '再次输入以确认（不会显示或记录）' -AsSecureString
      try{if(-not(Test-R1SecretsEqual $first $second)){Stop-R1 'PASSWORD_CONFIRMATION'}}finally{$second.Dispose()}
    }
    return $first
  }catch{$first.Dispose();throw}
}

function Get-R1ArchiveArguments {
  param([string]$Operation,[string]$Archive,[string]$Output)
  switch($Operation){
    'create' {return @('a','-t7z','-m0=lzma2','-mx=3','-mmt=1','-mhe=on','-sccUTF-8','-y','-p',$Archive)+$script:R1ArchiveFiles}
    'list' {return @('l','-slt','-sccUTF-8',$Archive)}
    'test' {return @('t','-sccUTF-8',$Archive)}
    'extract' {if([string]::IsNullOrWhiteSpace($Output)){Stop-R1 'RESTORE_DIRECTORY_REQUIRED'};return @('x','-sccUTF-8','-aos',('-o'+$Output),$Archive)}
    default {Stop-R1 'ARCHIVE_OPERATION'}
  }
}

function Assert-R1ArchiveListing {
  param([string]$Listing)
  $parts=[regex]::Split($Listing,'(?m)^----------\s*\r?\n',2)
  if($parts.Count-ne2){Stop-R1 'ARCHIVE_LISTING'}
  $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $total=0L
  foreach($block in [regex]::Split($parts[1].Trim(),'\r?\n\r?\n')){
    $values=@{}
    foreach($line in [regex]::Split($block,'\r?\n')){if($line-match'^([^=]+?) = (.*)$'){$values[$Matches[1]]=$Matches[2]}}
    if(-not$values.ContainsKey('Path')){continue}
    $name=[string]$values.Path
    if($name-notin$script:R1ArchiveFiles-or-not$seen.Add($name)){Stop-R1 'ARCHIVE_ENTRY'}
    if($values.ContainsKey('Symbolic Link')-or$values.ContainsKey('Hard Link')-or($values.ContainsKey('Attributes')-and$values.Attributes-match'D')-or($values.ContainsKey('Folder')-and$values.Folder-eq'+')){Stop-R1 'ARCHIVE_LINK_OR_DIRECTORY'}
    $size=0L
    if(-not$values.ContainsKey('Size')-or-not[long]::TryParse([string]$values.Size,[ref]$size)-or$size-lt1-or$size-gt131072){Stop-R1 'ARCHIVE_SIZE'}
    if(-not$values.ContainsKey('Encrypted')-or$values.Encrypted-ne'+'-or-not$values.ContainsKey('Method')-or$values.Method-notmatch'7zAES'){Stop-R1 'ARCHIVE_NOT_AES256'}
    $total+=$size
  }
  if($seen.Count-ne3-or$total-gt262144){Stop-R1 'ARCHIVE_CONTENTS'}
}

function Assert-R1SafeLocalPath {
  param([string]$Path,[string[]]$ForbiddenRoots=@())
  if($Path-notmatch'^[A-Za-z]:[\\/]' -or $Path.Substring(2).Contains(':')){Stop-R1 'LOCAL_PATH_REQUIRED'}
  $full=[IO.Path]::GetFullPath($Path).TrimEnd('\','/')
  foreach($root in $ForbiddenRoots){
    if([string]::IsNullOrWhiteSpace($root)){continue}
    $boundary=[IO.Path]::GetFullPath($root).TrimEnd('\','/')
    if($full.Equals($boundary,[StringComparison]::OrdinalIgnoreCase)-or$full.StartsWith($boundary+'\',[StringComparison]::OrdinalIgnoreCase)){Stop-R1 'PRIVATE_PATH_FORBIDDEN'}
  }
  $cursor=$full
  while($cursor){
    $entry=$null
    try{$entry=Get-Item -LiteralPath $cursor -Force -ErrorAction Stop}
    catch{if($_.CategoryInfo.Category-ne[Management.Automation.ErrorCategory]::ObjectNotFound){Stop-R1 'PATH_METADATA_READ'}}
    if($null-ne$entry-and($entry.Attributes-band[IO.FileAttributes]::ReparsePoint)){Stop-R1 'REPARSE_POINT'}
    $parent=[IO.Path]::GetDirectoryName($cursor)
    if($parent-eq$cursor){break};$cursor=$parent
  }
}

function Get-R1Hash([string]$Path){return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()}

function Assert-R1ReleaseManifest {
  param($Manifest,[string]$BundleRoot,[switch]$SkipFileChecks)
  if($Manifest.formatVersion-ne1-or$Manifest.route-ne'A'-or$Manifest.sourceSha-ne$script:R1Source-or$Manifest.packageName-ne'app.recipio.local'-or$Manifest.certificateSha256-ne$script:R1Certificate){Stop-R1 'MANIFEST_IDENTITY'}
  if(@($Manifest.apks).Count-ne2){Stop-R1 'MANIFEST_VERSIONS'}
  for($i=0;$i-lt2;$i++){
    $apk=$Manifest.apks[$i];$code=26+$i
    if($apk.versionCode-ne$code-or$apk.versionName-ne('0.11.0-personal.'+($i+1))-or$apk.sha256-notmatch'^[a-f0-9]{64}$'-or$apk.file-ne('unsigned/recipio-personal-v'+$code+'-unsigned.apk')){Stop-R1 'MANIFEST_APK'}
    if(-not$SkipFileChecks){
      $path=Join-Path $BundleRoot $apk.file
      Assert-R1SafeLocalPath $path
      if(-not(Test-Path -LiteralPath $path -PathType Leaf)-or(Get-R1Hash $path)-ne$apk.sha256){Stop-R1 'UNSIGNED_HASH'}
    }
  }
  if(-not$SkipFileChecks){
    $required=@('Recipio.PersonalSigning.psm1','Start-RecipioPersonalSigning.ps1','Start-RecipioPersonalSigning.cmd')
    if(@($Manifest.bundleFiles).Count-ne3){Stop-R1 'BUNDLE_MANIFEST'}
    foreach($file in $required){
      $entry=@($Manifest.bundleFiles|Where-Object{$_.file-eq$file})
      if($entry.Count-ne1-or$entry[0].sha256-notmatch'^[a-f0-9]{64}$'-or(Get-R1Hash (Join-Path $BundleRoot $file))-ne$entry[0].sha256){Stop-R1 'BUNDLE_HASH'}
    }
  }
}

function Assert-R1PublicReceipt {
  param($Receipt)
  $allowed=@('formatVersion','status','sourceSha','certificateSha256','packageName','backupRestoreVerified','sameComputerBackupRisk','finalApk','verificationApk','deviceTests','createdAt')
  $keys=if($Receipt-is[Collections.IDictionary]){@($Receipt.Keys)}else{@($Receipt.PSObject.Properties.Name)}
  if(@($keys|Where-Object{$_-notin$allowed}).Count){Stop-R1 'PUBLIC_RECEIPT_FIELD'}
  if($Receipt.status-ne'SIGNED_LOCAL_STATIC_VALIDATED_PENDING_DEVICE'-or$Receipt.backupRestoreVerified-ne$true){Stop-R1 'PUBLIC_RECEIPT_GATE'}
  if($Receipt.sourceSha-ne$script:R1Source-or$Receipt.certificateSha256-ne$script:R1Certificate-or$Receipt.packageName-ne'app.recipio.local'){Stop-R1 'PUBLIC_RECEIPT_IDENTITY'}
  foreach($pair in @(@('verificationApk',26),@('finalApk',27))){
    $item=$Receipt.($pair[0]);$code=[int]$pair[1]
    if($null-eq$item){Stop-R1 'PUBLIC_APK_RECEIPT'}
    $fields=if($item-is[Collections.IDictionary]){@($item.Keys)}else{@($item.PSObject.Properties.Name)}
    if(@($fields|Where-Object{$_-notin@('path','sha256','bytes','versionCode','versionName')}).Count-or$fields.Count-ne5){Stop-R1 'PUBLIC_APK_RECEIPT_FIELD'}
    if($item.versionCode-ne$code-or$item.versionName-ne('0.11.0-personal.'+($code-25))-or$item.sha256-notmatch'^[a-f0-9]{64}$'-or$item.bytes-lt1-or$item.path-notmatch'\.apk$'){Stop-R1 'PUBLIC_APK_RECEIPT'}
  }
}

function Get-R1JsonMembers([Text.Json.JsonElement]$Element){
  if($Element.ValueKind-ne[Text.Json.JsonValueKind]::Object){Stop-R1 'POLICY_CONFIGURATION_SHAPE'}
  $members=[Collections.Generic.Dictionary[string,Text.Json.JsonElement]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach($property in $Element.EnumerateObject()){if(-not$members.TryAdd($property.Name,$property.Value)){Stop-R1 'POLICY_CONFIGURATION_DUPLICATE'}}
  return ,$members
}

function Assert-R1PowerShellConfigPolicies([string]$Json){
  $document=$null
  try{$document=[Text.Json.JsonDocument]::Parse($Json)}catch{Stop-R1 'POLICY_CONFIGURATION_PARSE'}
  try{
    $root=Get-R1JsonMembers $document.RootElement
    if(-not$root.ContainsKey('PowerShellPolicies')){return}
    $policies=Get-R1JsonMembers $root['PowerShellPolicies']
    $groups=@{
      Transcription=@{primary='EnableTranscripting';booleans=@('EnableTranscripting','EnableInvocationHeader');strings=@('OutputDirectory');arrays=@()}
      ScriptBlockLogging=@{primary='EnableScriptBlockLogging';booleans=@('EnableScriptBlockLogging','EnableScriptBlockInvocationLogging');strings=@();arrays=@()}
      ModuleLogging=@{primary='EnableModuleLogging';booleans=@('EnableModuleLogging');strings=@();arrays=@('ModuleNames')}
    }
    foreach($name in $groups.Keys){
      if(-not$policies.ContainsKey($name)){continue}
      $group=$groups[$name];$settings=Get-R1JsonMembers $policies[$name]
      if(-not$settings.ContainsKey($group.primary)){Stop-R1 'POLICY_CONFIGURATION_UNKNOWN'}
      foreach($settingName in $settings.Keys){
        $value=$settings[$settingName]
        if($settingName-in$group.booleans){
          if($value.ValueKind-eq[Text.Json.JsonValueKind]::True){Stop-R1 'ENFORCED_LOGGING'}
          if($value.ValueKind-ne[Text.Json.JsonValueKind]::False){Stop-R1 'POLICY_CONFIGURATION_UNKNOWN'}
        }elseif($settingName-in$group.strings){if($value.ValueKind-ne[Text.Json.JsonValueKind]::String){Stop-R1 'POLICY_CONFIGURATION_UNKNOWN'}}
        elseif($settingName-in$group.arrays){
          if($value.ValueKind-ne[Text.Json.JsonValueKind]::Array){Stop-R1 'POLICY_CONFIGURATION_UNKNOWN'}
          foreach($entry in $value.EnumerateArray()){if($entry.ValueKind-ne[Text.Json.JsonValueKind]::String){Stop-R1 'POLICY_CONFIGURATION_UNKNOWN'}}
        }else{Stop-R1 'POLICY_CONFIGURATION_UNKNOWN'}
      }
    }
  }finally{if($null-ne$document){$document.Dispose()}}
}

function Assert-R1PowerShellPolicyFiles([string[]]$ConfigPaths){
  foreach($path in $ConfigPaths){
    $configurationText=$null
    try{
      if(-not(Test-Path -LiteralPath $path -ErrorAction Stop)){continue}
      $item=Get-Item -LiteralPath $path -Force -ErrorAction Stop
      if($item.PSIsContainer-or$item.Length-gt262144){Stop-R1 'POLICY_CONFIGURATION_READ'}
      $configurationText=[IO.File]::ReadAllText($item.FullName,[Text.Encoding]::UTF8)
      Assert-R1PowerShellConfigPolicies $configurationText
    }catch{
      if($_.Exception.Message-match'^R1P_(?:POLICY_|ENFORCED_LOGGING)'){throw}
      Stop-R1 'POLICY_CONFIGURATION_READ'
    }finally{$configurationText=$null}
  }
}

function Assert-R1ExistingPrivateFile([string]$Path){
  Assert-R1SafeLocalPath $Path
  try{
    $item=Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    if($item.PSIsContainer-or($item.Attributes-band[IO.FileAttributes]::ReparsePoint)){Stop-R1 'PRIVATE_FILE_TYPE'}
    $acl=Get-Acl -LiteralPath $Path -ErrorAction Stop
    $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $owner=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
    if($owner-notin@($sid,'S-1-5-18')){Stop-R1 'PRIVATE_FILE_OWNER'}
    $descriptor=[Security.AccessControl.RawSecurityDescriptor]::new($acl.GetSecurityDescriptorBinaryForm(),0)
    if($null-eq$descriptor.DiscretionaryAcl){Stop-R1 'PRIVATE_FILE_NULL_DACL'}
    $ownerCanRead=$false
    foreach($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){
      if($rule.AccessControlType-ne'Allow'){continue}
      if($rule.IdentityReference.Value-notin@($sid,'S-1-5-18')){Stop-R1 'PRIVATE_FILE_ACL'}
      if($rule.IdentityReference.Value-eq$sid-and($rule.FileSystemRights-band[Security.AccessControl.FileSystemRights]::ReadData)){$ownerCanRead=$true}
    }
    if(-not$ownerCanRead){Stop-R1 'PRIVATE_FILE_ACL'}
  }catch{if($_.Exception.Message-match'^R1P_'){throw};Stop-R1 'PRIVATE_FILE_ACL_READ'}
}

function Assert-R1PrivateFileIfPresent([string]$Path){
  $entry=$null
  try{$entry=Get-Item -LiteralPath $Path -Force -ErrorAction Stop}
  catch{if($_.CategoryInfo.Category-ne[Management.Automation.ErrorCategory]::ObjectNotFound){Stop-R1 'PRIVATE_FILE_METADATA_READ'}}
  if($null-ne$entry){Assert-R1ExistingPrivateFile $Path}
}

function Assert-R1ArchiveHeaderEncryption([string]$SevenZip,[string]$Archive,[string]$WorkingDirectory){
  # Data encryption alone is insufficient: neither absent nor wrong credentials
  # may list a private backup successfully or expose any entry name.
  $without=Invoke-R1PrivateChild $SevenZip (Get-R1ArchiveArguments list $Archive) @{} @() $WorkingDirectory
  if($without.ExitCode-eq0-or$without.Stdout-match'(?m)^Path = (?:identity\.p12|identity\.cer|recovery\.json)\r?$'){Stop-R1 'BACKUP_HEADERS_NOT_ENCRYPTED'}
  $wrong=ConvertTo-SecureString ('PUBLIC-NEGATIVE-PROBE-'+[guid]::NewGuid().ToString('N')) -AsPlainText -Force
  try{
    $incorrect=Invoke-R1PrivateChild $SevenZip (Get-R1ArchiveArguments list $Archive) @{} @($wrong) $WorkingDirectory
    if($incorrect.ExitCode-eq0-or$incorrect.Stdout-match'(?m)^Path = (?:identity\.p12|identity\.cer|recovery\.json)\r?$'){Stop-R1 'BACKUP_HEADERS_NOT_ENCRYPTED'}
  }finally{$wrong.Dispose()}
}

function Assert-R1PrivateConsole {
  if($PSVersionTable.PSVersion.Major-lt7-or[Console]::IsInputRedirected-or[Console]::IsOutputRedirected-or[Console]::IsErrorRedirected-or$Host.Name-ne'ConsoleHost'){Stop-R1 'PRIVATE_CONSOLE_REQUIRED'}
  # NoProfile does not disable either powershell.config.json scope.
  $profilePath=[string]$PROFILE.CurrentUserCurrentHost
  if([string]::IsNullOrWhiteSpace($profilePath)){Stop-R1 'POLICY_SCOPE_UNKNOWN'}
  Assert-R1PowerShellPolicyFiles @((Join-Path $PSHOME 'powershell.config.json'),(Join-Path ([IO.Path]::GetDirectoryName($profilePath)) 'powershell.config.json'))
  foreach($policyRoot in @('HKLM:\Software\Policies\Microsoft\Windows\PowerShell','HKCU:\Software\Policies\Microsoft\Windows\PowerShell','HKLM:\Software\Policies\Microsoft\PowerShellCore','HKCU:\Software\Policies\Microsoft\PowerShellCore')){
    foreach($setting in @(@('Transcription','EnableTranscripting'),@('Transcription','EnableInvocationHeader'),@('ScriptBlockLogging','EnableScriptBlockLogging'),@('ScriptBlockLogging','EnableScriptBlockInvocationLogging'),@('ModuleLogging','EnableModuleLogging'))){
      try{
        $policyPath=$policyRoot+'\'+$setting[0]
        if(-not(Test-Path -LiteralPath $policyPath -ErrorAction Stop)){continue}
        $policy=Get-ItemProperty -LiteralPath $policyPath -ErrorAction Stop
        if($null-ne$policy.PSObject.Properties[$setting[1]]){
          $value=$policy.($setting[1])
          if(($value-isnot[int]-and$value-isnot[long])-or$value-ne0){Stop-R1 'ENFORCED_LOGGING_OR_UNKNOWN'}
        }
      }catch{if($_.Exception.Message-match'^R1P_'){throw};Stop-R1 'POLICY_REGISTRY_READ'}
    }
  }
}

function Invoke-R1PrivateChild {
  param([string]$Executable,[string[]]$Arguments,[hashtable]$Secrets=@{},[Security.SecureString[]]$InputSecrets=@(),[string]$WorkingDirectory,[int]$TimeoutSeconds=120)
  $start=[Diagnostics.ProcessStartInfo]::new()
  $start.FileName=$Executable;$start.UseShellExecute=$false;$start.CreateNoWindow=$true
  $start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
  $utf8=[Text.UTF8Encoding]::new($false)
  $start.StandardInputEncoding=$utf8;$start.StandardOutputEncoding=$utf8;$start.StandardErrorEncoding=$utf8
  $start.Environment.Clear()
  foreach($name in @('SystemRoot','WINDIR','SystemDrive','COMSPEC','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA')){$value=[Environment]::GetEnvironmentVariable($name);if($value){$start.Environment[$name]=$value}}
  if($WorkingDirectory){$start.WorkingDirectory=$WorkingDirectory}
  foreach($argument in $Arguments){$start.ArgumentList.Add($argument)}
  foreach($key in $Secrets.Keys){
    if($key-notmatch'^RECIPIO_PRIVATE_[A-Z_]+$'){Stop-R1 'CHILD_SECRET_CHANNEL'}
    $plain=ConvertFrom-R1SecureString $Secrets[$key]
    try{foreach($argument in $Arguments){if($plain-and$argument.Contains($plain)){Stop-R1 'PASSWORD_IN_ARGUMENT'}};$start.Environment[$key]=$plain}finally{$plain=$null}
  }
  $process=[Diagnostics.Process]::new();$process.StartInfo=$start;$started=$false
  try{
    try{$started=$process.Start()}catch{Stop-R1 'CHILD_START'}
    foreach($key in $Secrets.Keys){$null=$start.Environment.Remove($key)}
    $stdoutTask=$process.StandardOutput.ReadToEndAsync();$stderrTask=$process.StandardError.ReadToEndAsync()
    $process.StandardInput.NewLine="`n"
    foreach($secret in $InputSecrets){
      $plain=ConvertFrom-R1SecureString $secret
      try{$process.StandardInput.WriteLine($plain);$process.StandardInput.Flush()}finally{$plain=$null}
    }
    $process.StandardInput.Close()
    if(-not$process.WaitForExit($TimeoutSeconds*1000)){$process.Kill($true);Stop-R1 'CHILD_TIMEOUT'}
    $out=$stdoutTask.GetAwaiter().GetResult();$err=$stderrTask.GetAwaiter().GetResult()
    if($out.Length-gt1048576-or$err.Length-gt1048576){Stop-R1 'CHILD_OUTPUT_LIMIT'}
    return @{ExitCode=$process.ExitCode;Stdout=$out;Stderr=$err}
  }finally{
    foreach($key in $Secrets.Keys){$null=$start.Environment.Remove($key)}
    if($started-and-not$process.HasExited){$process.Kill($true)}
    $process.Dispose()
  }
}

function Assert-R1SuccessfulChild($Result,[string]$Category){if($Result.ExitCode-ne0){Stop-R1 $Category}}

function New-R1RestrictedDirectory([string]$Path,[string[]]$ForbiddenRoots){
  Assert-R1SafeLocalPath $Path $ForbiddenRoots
  $null=[IO.Directory]::CreateDirectory($Path)
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $security=[Security.AccessControl.DirectorySecurity]::new()
  $security.SetOwner($sid);$security.SetAccessRuleProtection($true,$false)
  $inherit=[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
  foreach($principal in @($sid,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){$security.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($principal,'FullControl',$inherit,'None','Allow'))}
  Set-Acl -LiteralPath $Path -AclObject $security
  $readback=Get-Acl -LiteralPath $Path
  if(-not$readback.AreAccessRulesProtected){Stop-R1 'PRIVATE_ACL'}
  foreach($rule in $readback.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){if($rule.AccessControlType-eq'Allow'-and$rule.IdentityReference.Value-notin@($sid.Value,'S-1-5-18')){Stop-R1 'PRIVATE_ACL'}}
}

function Remove-R1OwnedTemporaryDirectory([string]$Path,[string]$PrivateRoot,[string[]]$AllowedFiles){
  Assert-R1SafeLocalPath $Path
  $full=[IO.Path]::GetFullPath($Path)
  $root=[IO.Path]::GetFullPath($PrivateRoot).TrimEnd('\')+'\'
  if(-not$full.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)-or([IO.Path]::GetFileName($full))-notmatch'^session-[a-f0-9]{32}$'){Stop-R1 'CLEANUP_SCOPE'}
  if(-not(Test-Path -LiteralPath $full)){return}
  $items=@(Get-ChildItem -LiteralPath $full -Force)
  foreach($item in $items){if($item.PSIsContainer-or$item.Name-notin$AllowedFiles-or($item.Attributes-band[IO.FileAttributes]::ReparsePoint)){Stop-R1 'CLEANUP_UNEXPECTED_FILE'}}
  foreach($item in $items){Remove-Item -LiteralPath $item.FullName -Force}
  Remove-Item -LiteralPath $full -Force
}

function Get-R1Toolchain($Manifest){
  $labels=[ordered]@{java='JAVA';keytool='KEYTOOL';aapt='AAPT';zipalign='ZIPALIGN';apksigner='APKSIGNER';sevenZip='SEVENZIP'}
  foreach($name in $labels.Keys){
    $prefix='TOOLCHAIN_'+$labels[$name]+'_'
    try{$tool=$Manifest.tools.$name}catch{Stop-R1 ($prefix+'ENTRY')}
    if(-not$tool-or$tool-isnot[Collections.IDictionary]){Stop-R1 ($prefix+'ENTRY')}
    if(-not$tool.Contains('sha256')-or$tool.sha256-isnot[string]-or$tool.sha256-notmatch'^[a-f0-9]{64}$'){Stop-R1 ($prefix+'PIN_FORMAT')}
    if(-not$tool.Contains('path')-or$tool.path-isnot[string]-or[string]::IsNullOrWhiteSpace($tool.path)){Stop-R1 ($prefix+'ENTRY')}
    try{$exists=Test-Path -LiteralPath $tool.path -PathType Leaf}catch{Stop-R1 ($prefix+'READ')}
    if(-not$exists){Stop-R1 ($prefix+'MISSING')}
    try{$actual=Get-R1Hash $tool.path}catch{Stop-R1 ($prefix+'READ')}
    if($actual-ne$tool.sha256){Stop-R1 ($prefix+'HASH')}
  }
  if($Manifest.tools.sevenZip.sha256-ne'7ddf0a3bc451e166679296be630d6f0573eb386159c04184761c43020c484291'){Stop-R1 'BACKUP_TOOL_IDENTITY'}
  return $Manifest.tools
}

function Get-R1Certificate($Tools,[string]$Keystore,[string]$Alias,[Security.SecureString]$Password){
  $result=Invoke-R1PrivateChild $Tools.keytool.path @('-J-Xmx96m','-J-XX:MaxMetaspaceSize=64m','-exportcert','-rfc','-keystore',$Keystore,'-alias',$Alias,'-storepass:env','RECIPIO_PRIVATE_STORE_PASSWORD') @{RECIPIO_PRIVATE_STORE_PASSWORD=$Password}
  Assert-R1SuccessfulChild $result 'KEY_CERTIFICATE_UNAVAILABLE'
  $certificateMatches=[regex]::Matches($result.Stdout,'-----BEGIN CERTIFICATE-----\s*([A-Za-z0-9+/=\r\n]+)\s*-----END CERTIFICATE-----')
  if($certificateMatches.Count-ne1){Stop-R1 'KEY_CERTIFICATE_FORMAT'}
  $der=[Convert]::FromBase64String(($certificateMatches[0].Groups[1].Value-replace'\s',''))
  $hash=[Security.Cryptography.SHA256]::HashData($der)
  $fingerprint=[Convert]::ToHexString($hash).ToLowerInvariant()
  if($fingerprint-ne$script:R1Certificate){Stop-R1 'KEY_CERTIFICATE_MISMATCH'}
  return @{Der=$der;Fingerprint=$fingerprint}
}

function Get-R1ApkInfo($Tools,[string]$Path,$Expected,[switch]$MustBeUnsigned){
  $badging=Invoke-R1PrivateChild $Tools.aapt.path @('dump','badging',$Path)
  Assert-R1SuccessfulChild $badging 'APK_BADGING'
  $line=($badging.Stdout-split'\r?\n')[0]
  if($line-notmatch"^package: name='app\.recipio\.local' versionCode='([0-9]+)' versionName='([^']+)'"-or[int]$Matches[1]-ne$Expected.versionCode-or$Matches[2]-ne$Expected.versionName){Stop-R1 'APK_IDENTITY'}
  $xml=Invoke-R1PrivateChild $Tools.aapt.path @('dump','xmltree',$Path,'AndroidManifest.xml')
  Assert-R1SuccessfulChild $xml 'APK_MANIFEST'
  foreach($match in [regex]::Matches($xml.Stdout,'(?m)^\s*A: android:(debuggable|testOnly)(?:\([^)]*\))?=(.+)$')){if($match.Groups[2].Value.Trim()-notmatch'^\(type 0x12\)0x0$'){Stop-R1 'DEBUG_OR_TEST_APK'}}
  if($MustBeUnsigned){$verify=Invoke-R1PrivateChild $Tools.java.path @('-Xmx96m','-XX:MaxMetaspaceSize=64m','-jar',$Tools.apksigner.path,'verify','--print-certs',$Path);if($verify.ExitCode-eq0-or$verify.Stdout-match'certificate SHA-256 digest:'){Stop-R1 'INPUT_ALREADY_SIGNED'}}
  return @{versionCode=$Expected.versionCode;versionName=$Expected.versionName}
}

function Test-R1SignedApk($Tools,[string]$Path,$Expected){
  $result=Invoke-R1PrivateChild $Tools.java.path @('-Xmx96m','-XX:MaxMetaspaceSize=64m','-jar',$Tools.apksigner.path,'verify','--verbose','--print-certs',$Path)
  Assert-R1SuccessfulChild $result 'SIGNATURE_VERIFICATION'
  $lines=@(($result.Stdout-split'\r?\n')|Where-Object{$_-match'^Signer #[0-9]+ certificate SHA-256 digest:'})
  if($lines.Count-ne1-or$lines[0]-notmatch($script:R1Certificate+'$')){Stop-R1 'SIGNED_CERTIFICATE_MISMATCH'}
  $null=Get-R1ApkInfo $Tools $Path $Expected
  $aligned=Invoke-R1PrivateChild $Tools.zipalign.path @('-c','-p','4',$Path)
  Assert-R1SuccessfulChild $aligned 'SIGNED_ALIGNMENT'
}

function Invoke-R1SignApk($Tools,[string]$InputPath,[string]$AlignedPath,[string]$SignedPath,[string]$Keystore,[Security.SecureString]$Password,$Expected){
  if((Test-Path -LiteralPath $AlignedPath)-or(Test-Path -LiteralPath $SignedPath)){Stop-R1 'SIGN_OUTPUT_EXISTS'}
  $aligned=Invoke-R1PrivateChild $Tools.zipalign.path @('-p','4',$InputPath,$AlignedPath)
  Assert-R1SuccessfulChild $aligned 'ALIGN_UNSIGNED'
  $signed=Invoke-R1PrivateChild $Tools.java.path @('-Xmx96m','-XX:MaxMetaspaceSize=64m','-jar',$Tools.apksigner.path,'sign','--ks',$Keystore,'--ks-key-alias','recipio-personal','--ks-pass','env:RECIPIO_PRIVATE_STORE_PASSWORD','--key-pass','env:RECIPIO_PRIVATE_STORE_PASSWORD','--v4-signing-enabled','false','--out',$SignedPath,$AlignedPath) @{RECIPIO_PRIVATE_STORE_PASSWORD=$Password}
  Assert-R1SuccessfulChild $signed 'SIGNING_FAILED'
  Test-R1SignedApk $Tools $SignedPath $Expected
}

function Test-R1ArchiveTransport([string]$SevenZip){
  if((Get-R1Hash $SevenZip)-ne'7ddf0a3bc451e166679296be630d6f0573eb386159c04184761c43020c484291'){Stop-R1 'BACKUP_TOOL_IDENTITY'}
  $root=Join-Path ([IO.Path]::GetTempPath()) ('recipio-public-archive-preflight-'+[guid]::NewGuid().ToString('N'))
  $null=[IO.Directory]::CreateDirectory($root)
  $archive=Join-Path $root 'public-synthetic.7z';$restore=Join-Path $root 'restored'
  $fake=ConvertTo-SecureString 'PUBLIC-SYNTHETIC-ONLY-A9!' -AsPlainText -Force
  $wrong=ConvertTo-SecureString 'PUBLIC-SYNTHETIC-WRONG-A9!' -AsPlainText -Force
  try{
    foreach($file in $script:R1ArchiveFiles){[IO.File]::WriteAllText((Join-Path $root $file),'Public generated non-key material: '+$file,[Text.UTF8Encoding]::new($false))}
    $create=Invoke-R1PrivateChild $SevenZip (Get-R1ArchiveArguments create $archive) @{} @($fake,$fake) $root
    Assert-R1SuccessfulChild $create 'SYNTHETIC_ARCHIVE_CREATE'
    Assert-R1ArchiveHeaderEncryption $SevenZip $archive $root
    $listing=Invoke-R1PrivateChild $SevenZip (Get-R1ArchiveArguments list $archive) @{} @($fake) $root
    Assert-R1SuccessfulChild $listing 'SYNTHETIC_ARCHIVE_LIST';Assert-R1ArchiveListing $listing.Stdout
    $incorrect=Invoke-R1PrivateChild $SevenZip (Get-R1ArchiveArguments test $archive) @{} @($wrong) $root
    if($incorrect.ExitCode-eq0){Stop-R1 'SYNTHETIC_WRONG_PASSWORD'}
    $null=[IO.Directory]::CreateDirectory($restore)
    $extract=Invoke-R1PrivateChild $SevenZip (Get-R1ArchiveArguments extract $archive $restore) @{} @($fake) $root
    Assert-R1SuccessfulChild $extract 'SYNTHETIC_ARCHIVE_RESTORE'
    foreach($file in $script:R1ArchiveFiles){if((Get-R1Hash (Join-Path $root $file))-ne(Get-R1Hash (Join-Path $restore $file))){Stop-R1 'SYNTHETIC_ARCHIVE_BYTES'}}
    return @{status='PASS';creation=$true;headerEncryption=$true;actualDecryption=$true;exactBytes=$true;wrongPasswordRejected=$true;privateKeyUsed=$false}
  }finally{
    $fake.Dispose();$wrong.Dispose()
    foreach($file in $script:R1ArchiveFiles){$p=Join-Path $restore $file;if(Test-Path -LiteralPath $p){Remove-Item -LiteralPath $p -Force}}
    if(Test-Path -LiteralPath $restore){Remove-Item -LiteralPath $restore -Force}
    foreach($file in @($script:R1ArchiveFiles)+@('public-synthetic.7z')){$p=Join-Path $root $file;if(Test-Path -LiteralPath $p){Remove-Item -LiteralPath $p -Force}}
    if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Force}
  }
}

function Get-R1IdentityAction([bool]$PersonalCopyExists,[bool]$OldSourceExists){
  if($PersonalCopyExists){return 'REUSE_PERSONAL_COPY'}
  if($OldSourceExists){return 'IMPORT_EXISTING_SOURCE'}
  Stop-R1 'ROUTE_A_UNAVAILABLE_NO_AUTOMATIC_REKEY'
}

function Assert-R1PublishGate($State){
  foreach($gate in @('backupRestored','seedVerified','finalVerified','identityVerified','privateCleanupVerified')){if($State[$gate]-ne$true){Stop-R1 'PUBLISH_GATE'}}
}

function Get-R1ApkPayload([string]$Path){
  $zip=[IO.Compression.ZipFile]::OpenRead($Path)
  $result=[Collections.Generic.Dictionary[string,string]]::new([StringComparer]::Ordinal)
  try{
    foreach($entry in $zip.Entries){
      if($entry.FullName.EndsWith('/')-or$entry.FullName-match'^META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC)|SIG-[^/]+)$'){continue}
      if($result.ContainsKey($entry.FullName)){Stop-R1 'DUPLICATE_APK_ENTRY'}
      $stream=$entry.Open();$hasher=[Security.Cryptography.SHA256]::Create()
      try{$result.Add($entry.FullName,[Convert]::ToHexString($hasher.ComputeHash($stream)))}finally{$hasher.Dispose();$stream.Dispose()}
    }
  }finally{$zip.Dispose()}
  return ,$result
}

function Assert-R1SameApkPayload([string]$Before,[string]$After){
  $first=Get-R1ApkPayload $Before;$second=Get-R1ApkPayload $After
  if($first.Count-ne$second.Count){Stop-R1 'APK_PAYLOAD_CHANGED'}
  foreach($name in $first.Keys){if(-not$second.ContainsKey($name)-or$first[$name]-ne$second[$name]){Stop-R1 'APK_PAYLOAD_CHANGED'}}
}

function Write-R1NewJson([string]$Path,$Value){
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($Value|ConvertTo-Json -Depth 8))
  $stream=[IO.File]::Open($Path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
}

function Get-R1OwnerPaths{
  $local=[Environment]::GetFolderPath('LocalApplicationData')
  $profile=[Environment]::GetFolderPath('UserProfile')
  return @{privateRoot=(Join-Path $local 'RecipioSigning/Personal/original-29ded26bea44f1af');backupRoot=(Join-Path $profile '.recipio-signing-backups/original-29ded26bea44f1af');sourceKey=(Join-Path $profile '.android/debug.keystore')}
}

function Assert-R1OutsideRepository([string]$Path){
  $cursor=[IO.Path]::GetFullPath($Path)
  while($cursor){if(Test-Path -LiteralPath (Join-Path $cursor '.git')){Stop-R1 'TOOL_MUST_BE_OUTSIDE_REPOSITORY'};$parent=[IO.Path]::GetDirectoryName($cursor);if($parent-eq$cursor){break};$cursor=$parent}
}

function Get-R1FailureCategory([string]$Message){
  if($Message.Length-le128-and$Message-cmatch'\AR1P_[A-Z_]+\z'){return $Message}
  return 'UNEXPECTED_FAILURE'
}

function Get-R1OwnerFailureCategory([string]$Message,[string]$Stage){
  $category=Get-R1FailureCategory $Message
  if($category-cne'UNEXPECTED_FAILURE'){return $category}
  # Fixed internal labels only: no exception text, type, path or user input.
  $stages=@('PUBLIC_PREFLIGHT','PRIVATE_STORAGE','INPUT_COPY','SOURCE_PASSWORD','STORE_PASSWORD','BACKUP_PASSWORD','PASSWORD_SEPARATION','IDENTITY_VERIFY_IMPORT','BACKUP_VERIFY_RESTORE','APK_SIGN','PUBLICATION','PRIVATE_CLEANUP')
  if($stages-ccontains$Stage){return 'R1P_OWNER_'+$Stage+'_UNEXPECTED'}
  return 'UNEXPECTED_FAILURE'
}

function Write-R1FailedAttempt([string]$BundleRoot,[string]$Message){
  # Public status only: never persist an exception, native output or private path.
  Assert-R1SafeLocalPath $BundleRoot
  Assert-R1OutsideRepository $BundleRoot
  if(-not(Test-Path -LiteralPath $BundleRoot -PathType Container)){Stop-R1 'PUBLIC_BUNDLE_REQUIRED'}
  $path=Join-Path ([IO.Path]::GetFullPath($BundleRoot)) ('OWNER_ATTEMPT-'+[guid]::NewGuid().ToString('N')+'.json')
  $record=@{formatVersion=1;status='FAILED';category=(Get-R1FailureCategory $Message);createdAtUtc=[DateTime]::UtcNow.ToString('o')}
  Write-R1NewJson $path $record
  return $path
}

function Invoke-R1OwnerSigning([string]$BundleRoot){
  $stage='PUBLIC_PREFLIGHT'
  try{
  Assert-R1PrivateConsole
  Assert-R1OutsideRepository $BundleRoot
  $manifestPath=Join-Path $BundleRoot 'release-manifest.json'
  if(-not(Test-Path -LiteralPath $manifestPath -PathType Leaf)){Stop-R1 'RELEASE_MANIFEST_REQUIRED'}
  $manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json -AsHashtable
  Assert-R1ReleaseManifest $manifest $BundleRoot
  $tools=Get-R1Toolchain $manifest
  foreach($apk in $manifest.apks){$null=Get-R1ApkInfo $tools (Join-Path $BundleRoot $apk.file) $apk -MustBeUnsigned}
  $preflight=Test-R1ArchiveTransport $tools.sevenZip.path
  if($preflight.status-ne'PASS'){Stop-R1 'ARCHIVE_PREFLIGHT'}

  $deliveryRoot=Join-Path $BundleRoot 'delivery'
  $verificationRoot=Join-Path $BundleRoot 'verification'
  $receiptPath=Join-Path $deliveryRoot 'OWNER_RESULT.json'
  $finalTarget=Join-Path $deliveryRoot 'RECIPIO-0.11.0-personal.2-signed.apk'
  $seedTarget=Join-Path $verificationRoot 'RECIPIO-personal-v26-signed-test.apk'
  foreach($target in @($receiptPath,$finalTarget,$seedTarget)){if(Test-Path -LiteralPath $target){Stop-R1 'DELIVERY_EXISTS_REVIEW_REQUIRED'}}
  $stage='PRIVATE_STORAGE'
  $ownerPaths=Get-R1OwnerPaths
  $privateRoot=$ownerPaths.privateRoot
  $backupRoot=$ownerPaths.backupRoot
  $forbidden=@($BundleRoot)
  if($manifest.ContainsKey('repositoryRoot')){$forbidden+=@($manifest.repositoryRoot)}
  foreach($cloudVariable in @('OneDrive','OneDriveCommercial','OneDriveConsumer')){$cloud=[Environment]::GetEnvironmentVariable($cloudVariable);if($cloud){$forbidden+=$cloud}}
  $personalKey=Join-Path $privateRoot 'identity.p12'
  $archive=Join-Path $backupRoot 'recipio-personal-original-29ded26bea44f1af.7z'
  # Inspect existing leaf permissions before changing directory inheritance.
  # An explicit broad Allow or link must not be silently repaired or reused.
  foreach($name in $script:R1ArchiveFiles){Assert-R1PrivateFileIfPresent (Join-Path $privateRoot $name)}
  Assert-R1PrivateFileIfPresent $archive
  New-R1RestrictedDirectory $privateRoot $forbidden
  New-R1RestrictedDirectory $backupRoot $forbidden
  $sourceKey=$ownerPaths.sourceKey
  Assert-R1SafeLocalPath $sourceKey
  $action=Get-R1IdentityAction (Test-Path -LiteralPath $personalKey -PathType Leaf) (Test-Path -LiteralPath $sourceKey -PathType Leaf)
  $sessionRoot=Join-Path $privateRoot ('session-'+[guid]::NewGuid().ToString('N'))
  $restoreRoot=Join-Path $privateRoot ('session-'+[guid]::NewGuid().ToString('N'))
  New-R1RestrictedDirectory $sessionRoot $forbidden
  New-R1RestrictedDirectory $restoreRoot $forbidden
  $sourceSecret=$null;$storeSecret=$null;$backupSecret=$null;$archivePart=$null
  $sessionsCleaned=$false;$seedPending=$null;$finalPending=$null
  $sessionFiles=@('identity.p12','input26.apk','input27.apk','aligned26.apk','aligned27.apk','signed26.apk','signed27.apk')
  try{
    $stage='INPUT_COPY'
    foreach($apk in $manifest.apks){
      $copy=Join-Path $sessionRoot ('input'+$apk.versionCode+'.apk')
      [IO.File]::Copy((Join-Path $BundleRoot $apk.file),$copy,$false)
      if((Get-R1Hash $copy)-ne$apk.sha256){Stop-R1 'UNSIGNED_COPY_HASH'}
    }
    Write-Host 'RECIPIO 个人签名：仅在此独立窗口输入密码，请勿发送到聊天。'
    Write-Host '同机两个文件目录不具备独立离线介质的灾难恢复能力；电脑损坏、丢失或恶意软件可同时影响它们。'
    Write-Host '本工具不安装手机App、不恢复个人菜谱、不上传密钥。按Ctrl+C可取消；原签名文件不会被修改。'
    $stage='SOURCE_PASSWORD'
    if($action-eq'IMPORT_EXISTING_SOURCE'){$sourceSecret=Read-R1Secret '旧版签名文件密码' -Legacy}
    $stage='STORE_PASSWORD'
    $prompt=if($action-eq'REUSE_PERSONAL_COPY'){'已有个人签名副本密码'}else{'为个人副本设置至少16位长ASCII密码（大小写/数字/符号至少三类）'}
    $storeSecret=Read-R1Secret $prompt -Confirm:($action-eq'IMPORT_EXISTING_SOURCE')
    $stage='BACKUP_PASSWORD'
    $backupSecret=Read-R1Secret '独立加密备份密码（至少16位长ASCII，与签名密码不同）' -Confirm
    $stage='PASSWORD_SEPARATION'
    if((Test-R1SecretsEqual $storeSecret $backupSecret)-or($null-ne$sourceSecret-and(Test-R1SecretsEqual $sourceSecret $backupSecret))){Stop-R1 'BACKUP_PASSWORD_NOT_INDEPENDENT'}
    $stage='IDENTITY_VERIFY_IMPORT'
    $tools=Get-R1Toolchain $manifest
    if($action-eq'IMPORT_EXISTING_SOURCE'){
      $sourceBefore=Get-R1Hash $sourceKey
      $null=Get-R1Certificate $tools $sourceKey 'androiddebugkey' $sourceSecret
      $newKey=Join-Path $sessionRoot 'identity.p12'
      $import=Invoke-R1PrivateChild $tools.keytool.path @('-J-Xmx96m','-J-XX:MaxMetaspaceSize=64m','-importkeystore','-srckeystore',$sourceKey,'-srcalias','androiddebugkey','-srcstorepass:env','RECIPIO_PRIVATE_SOURCE_PASSWORD','-srckeypass:env','RECIPIO_PRIVATE_SOURCE_PASSWORD','-destkeystore',$newKey,'-deststoretype','PKCS12','-destalias','recipio-personal','-deststorepass:env','RECIPIO_PRIVATE_STORE_PASSWORD','-destkeypass:env','RECIPIO_PRIVATE_STORE_PASSWORD','-noprompt') @{RECIPIO_PRIVATE_SOURCE_PASSWORD=$sourceSecret;RECIPIO_PRIVATE_STORE_PASSWORD=$storeSecret}
      Assert-R1SuccessfulChild $import 'SOURCE_IMPORT_FAILED_NO_REKEY'
      if((Get-R1Hash $sourceKey)-ne$sourceBefore){Stop-R1 'SOURCE_KEY_CHANGED'}
      $certificate=Get-R1Certificate $tools $newKey 'recipio-personal' $storeSecret
      [IO.File]::Move($newKey,$personalKey,$false)
    }else{$certificate=Get-R1Certificate $tools $personalKey 'recipio-personal' $storeSecret}
    Assert-R1ExistingPrivateFile $personalKey
    $publicCert=Join-Path $privateRoot 'identity.cer'
    if(Test-Path -LiteralPath $publicCert){if((Get-R1Hash $publicCert)-ne$script:R1Certificate){Stop-R1 'EXISTING_PUBLIC_CERTIFICATE'}}else{[IO.File]::WriteAllBytes($publicCert,$certificate.Der)}
    $recoveryPath=Join-Path $privateRoot 'recovery.json'
    if(Test-Path -LiteralPath $recoveryPath){
      $oldRecovery=Get-Content -LiteralPath $recoveryPath -Raw|ConvertFrom-Json -AsHashtable
      if($oldRecovery.certificateSha256-ne$script:R1Certificate-or$oldRecovery.alias-ne'recipio-personal'-or$oldRecovery.keystoreSha256-ne(Get-R1Hash $personalKey)){Stop-R1 'EXISTING_RECOVERY_METADATA'}
    }else{Write-R1NewJson $recoveryPath @{formatVersion=1;alias='recipio-personal';certificateSha256=$script:R1Certificate;keystoreSha256=(Get-R1Hash $personalKey);sameComputerBackupRisk=$true}}

    $stage='BACKUP_VERIFY_RESTORE'
    foreach($name in $script:R1ArchiveFiles){Assert-R1ExistingPrivateFile (Join-Path $privateRoot $name)}
    $verifyArchive=$archive
    if(-not(Test-Path -LiteralPath $archive)){
      $archivePart=Join-Path $backupRoot ('backup-'+[guid]::NewGuid().ToString('N')+'.partial.7z')
      $created=Invoke-R1PrivateChild $tools.sevenZip.path (Get-R1ArchiveArguments create $archivePart) @{} @($backupSecret,$backupSecret) $privateRoot
      Assert-R1SuccessfulChild $created 'BACKUP_CREATION'
      $verifyArchive=$archivePart
    }
    Assert-R1ExistingPrivateFile $verifyArchive
    Assert-R1ArchiveHeaderEncryption $tools.sevenZip.path $verifyArchive $backupRoot
    $listing=Invoke-R1PrivateChild $tools.sevenZip.path (Get-R1ArchiveArguments list $verifyArchive) @{} @($backupSecret) $backupRoot
    Assert-R1SuccessfulChild $listing 'BACKUP_PASSWORD_OR_CONTAINER';Assert-R1ArchiveListing $listing.Stdout
    $archiveTest=Invoke-R1PrivateChild $tools.sevenZip.path (Get-R1ArchiveArguments test $verifyArchive) @{} @($backupSecret) $backupRoot
    Assert-R1SuccessfulChild $archiveTest 'BACKUP_INTEGRITY'
    $restore=Invoke-R1PrivateChild $tools.sevenZip.path (Get-R1ArchiveArguments extract $verifyArchive $restoreRoot) @{} @($backupSecret) $backupRoot
    Assert-R1SuccessfulChild $restore 'BACKUP_DECRYPTION'
    foreach($file in $script:R1ArchiveFiles){
      $restored=Join-Path $restoreRoot $file
      Assert-R1ExistingPrivateFile $restored
      if(-not(Test-Path -LiteralPath $restored -PathType Leaf)-or(Get-R1Hash $restored)-ne(Get-R1Hash (Join-Path $privateRoot $file))){Stop-R1 'BACKUP_RESTORE_BYTES'}
    }
    $restoredKey=Join-Path $restoreRoot 'identity.p12'
    $null=Get-R1Certificate $tools $restoredKey 'recipio-personal' $storeSecret
    $state=@{backupRestored=$true;identityVerified=$true;seedVerified=$false;finalVerified=$false;privateCleanupVerified=$false}
    $stage='APK_SIGN'
    foreach($apk in $manifest.apks){
      $code=$apk.versionCode
      $apkInput=Join-Path $sessionRoot ('input'+$code+'.apk')
      $aligned=Join-Path $sessionRoot ('aligned'+$code+'.apk')
      $signed=Join-Path $sessionRoot ('signed'+$code+'.apk')
      Invoke-R1SignApk $tools $apkInput $aligned $signed $restoredKey $storeSecret $apk
      Assert-R1SameApkPayload $apkInput $signed
      if($code-eq26){$state.seedVerified=$true}else{$state.finalVerified=$true}
    }
    $stage='PUBLICATION'
    if($null-ne$archivePart){[IO.File]::Move($archivePart,$archive,$false);$archivePart=$null}
    $null=[IO.Directory]::CreateDirectory($deliveryRoot);$null=[IO.Directory]::CreateDirectory($verificationRoot)
    $seedSigned=Join-Path $sessionRoot 'signed26.apk';$finalSigned=Join-Path $sessionRoot 'signed27.apk'
    $seedPending=Join-Path $verificationRoot ('pending-'+[guid]::NewGuid().ToString('N')+'.apk')
    $finalPending=Join-Path $deliveryRoot ('pending-'+[guid]::NewGuid().ToString('N')+'.apk')
    [IO.File]::Move($seedSigned,$seedPending,$false)
    [IO.File]::Move($finalSigned,$finalPending,$false)
    $stage='PRIVATE_CLEANUP'
    Remove-R1OwnedTemporaryDirectory $sessionRoot $privateRoot $sessionFiles
    Remove-R1OwnedTemporaryDirectory $restoreRoot $privateRoot $script:R1ArchiveFiles
    $sessionsCleaned=$true;$state.privateCleanupVerified=$true
    $stage='PUBLICATION'
    Assert-R1PublishGate $state
    $receipt=@{formatVersion=1;status='SIGNED_LOCAL_STATIC_VALIDATED_PENDING_DEVICE';sourceSha=$script:R1Source;certificateSha256=$script:R1Certificate;packageName='app.recipio.local';backupRestoreVerified=$true;sameComputerBackupRisk=$true;deviceTests='NOT_RUN';createdAt=[DateTime]::UtcNow.ToString('o');verificationApk=@{path=$seedTarget;sha256=(Get-R1Hash $seedPending);bytes=(Get-Item -LiteralPath $seedPending).Length;versionCode=26;versionName='0.11.0-personal.1'};finalApk=@{path=$finalTarget;sha256=(Get-R1Hash $finalPending);bytes=(Get-Item -LiteralPath $finalPending).Length;versionCode=27;versionName='0.11.0-personal.2'}}
    Assert-R1PublicReceipt $receipt
    [IO.File]::Move($seedPending,$seedTarget,$false);$seedPending=$null
    [IO.File]::Move($finalPending,$finalTarget,$false);$finalPending=$null
    Write-R1NewJson $receiptPath $receipt
    Write-Host ('证书SHA-256：'+$script:R1Certificate)
    Write-Host '加密备份已实际解密、字节/证书匹配，并使用恢复副本完成签名。'
    Write-Host '包名app.recipio.local；最终版本27 / 0.11.0-personal.2。'
    Write-Host ('APK SHA-256：'+$receipt.finalApk.sha256)
    Write-Host ('本地候选：'+$finalTarget)
    Write-Host '这是待独立验收候选；手机安装、连续版本升级与真实数据迁移尚未运行。不要自动安装。'
    Write-Host '请将公开OWNER_RESULT.json路径交回Codex；不要发送任何密码、keystore或加密备份。'
  }finally{
    # One cleanup failure must neither expose a raw exception nor skip another
    # owned resource. Keep all existing path/allowlist protections unchanged.
    $cleanupFailed=$false
    foreach($secret in @($sourceSecret,$storeSecret,$backupSecret)){if($null-ne$secret){try{$secret.Dispose()}catch{$cleanupFailed=$true}}}
    try{if($null-ne$archivePart-and(Test-Path -LiteralPath $archivePart)){Remove-Item -LiteralPath $archivePart -Force}}catch{$cleanupFailed=$true}
    if(-not$sessionsCleaned){
      try{Remove-R1OwnedTemporaryDirectory $sessionRoot $privateRoot $sessionFiles}catch{$cleanupFailed=$true}
      try{Remove-R1OwnedTemporaryDirectory $restoreRoot $privateRoot $script:R1ArchiveFiles}catch{$cleanupFailed=$true}
    }
    foreach($pending in @($seedPending,$finalPending)){try{if($null-ne$pending-and(Test-Path -LiteralPath $pending)){Remove-Item -LiteralPath $pending -Force}}catch{$cleanupFailed=$true}}
    if($cleanupFailed){Stop-R1 'PRIVATE_CLEANUP'}
  }
  }catch{
    $category=Get-R1OwnerFailureCategory $_.Exception.Message $stage
    throw [InvalidOperationException]::new($category)
  }
}

Export-ModuleMember -Function Assert-R1PasswordPolicy,Get-R1ArchiveArguments,Assert-R1ArchiveListing,Assert-R1ReleaseManifest,Assert-R1SafeLocalPath,Assert-R1PublicReceipt,Assert-R1PrivateConsole,Invoke-R1PrivateChild,Test-R1ArchiveTransport,Get-R1IdentityAction,Assert-R1PublishGate,Invoke-R1OwnerSigning,Assert-R1PowerShellConfigPolicies,Assert-R1PowerShellPolicyFiles,Assert-R1ExistingPrivateFile,Assert-R1ArchiveHeaderEncryption,Get-R1FailureCategory,Write-R1FailedAttempt

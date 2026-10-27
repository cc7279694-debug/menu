Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$VerbosePreference='SilentlyContinue'
$DebugPreference='SilentlyContinue'
$InformationPreference='SilentlyContinue'
Set-PSDebug -Off
try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch { }
$completed=$false
try {
  Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
  Assert-R1PrivateConsole
  Invoke-R1OwnerSigning $PSScriptRoot
  $completed=$true
  exit 0
} catch {
  $failureMessage=$_.Exception.Message
  $category='UNEXPECTED_FAILURE';$attemptPath=$null
  try {
    $category=Get-R1FailureCategory $failureMessage
    $attemptPath=Write-R1FailedAttempt $PSScriptRoot $failureMessage
  } catch { } # An unsafe/unavailable public destination must never be bypassed.
  $failureMessage=$null
  Write-Host ('已安全停止：'+$category)
  Write-Host '本次未完成签名。请返回 Codex，反馈上方错误类别。Enter 只关闭窗口，不表示成功。'
  if($null-ne$attemptPath){Write-Host ('公开失败记录：'+[IO.Path]::GetFileName($attemptPath))}
  else{Write-Host '公开失败记录未保存；请只反馈上方错误类别。'}
  Write-Host '未更换签名身份；不要把密码、keystore或加密备份发到聊天。原签名文件保留。'
  exit 1
} finally {
  if(-not[Console]::IsInputRedirected-and-not[Console]::IsOutputRedirected){
    if($completed){Read-Host '仅以 delivery/OWNER_RESULT.json 为成功证据；按 Enter 关闭窗口后返回 Codex' | Out-Null}
    else{Read-Host '本次未完成签名；请返回 Codex。Enter 只关闭窗口' | Out-Null}
  }
}

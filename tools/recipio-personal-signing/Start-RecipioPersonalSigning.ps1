Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$VerbosePreference='SilentlyContinue'
$DebugPreference='SilentlyContinue'
$InformationPreference='SilentlyContinue'
Set-PSDebug -Off
try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch { }
try {
  Import-Module (Join-Path $PSScriptRoot 'Recipio.PersonalSigning.psm1') -Force
  Invoke-R1OwnerSigning $PSScriptRoot
  exit 0
} catch {
  $category=if($_.Exception.Message-match'^R1P_[A-Z_]+$'){$_.Exception.Message}else{'R1P_UNEXPECTED_FAILURE'}
  Write-Host ('已安全停止：'+$category)
  Write-Host '未更换签名身份；不要把密码发到聊天。原签名文件保留；请仅反馈此错误类别。'
  exit 1
} finally {
  if(-not[Console]::IsInputRedirected-and-not[Console]::IsOutputRedirected){Read-Host '按Enter关闭此私密窗口' | Out-Null}
}

param(
  [string]$BaseUrl = "http://localhost:4000/api",
  [string]$AdminEmail = "admin@filetrack.local",
  [string]$AdminPassword = "Password123!",
  [string]$StaffEmail = "staff@filetrack.local",
  [string]$StaffPassword = "Password123!",
  [string]$UploadFile = "apps/api/uploads/demo-rencana-operasional-bulanan.pdf",
  [string]$VersionFile = "apps/api/uploads/demo-sop-onboarding-karyawan-v2.pdf"
)

$ErrorActionPreference = "Stop"

function Assert-Ok($condition, [string]$message) {
  if (-not $condition) {
    throw $message
  }
}

function Get-Token([string]$email, [string]$password) {
  $payload = @{ email = $email; password = $password } | ConvertTo-Json
  $login = Invoke-RestMethod -TimeoutSec 15 -Method Post -Uri ($BaseUrl + "/auth/login") -ContentType "application/json" -Body $payload
  Assert-Ok $login.token ("No token returned for " + $email)
  return $login.token
}

Write-Output "smoke: start"

try {
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 ($BaseUrl + "/health") | Out-Null
} catch {
  throw "API not reachable at $BaseUrl. Start it with: npm run dev:api"
}

Assert-Ok (Test-Path $UploadFile) ("Upload file not found: " + $UploadFile)
Assert-Ok (Test-Path $VersionFile) ("Version file not found: " + $VersionFile)

$adminToken = Get-Token -email $AdminEmail -password $AdminPassword
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

$categories = Invoke-RestMethod -TimeoutSec 15 -Method Get -Uri ($BaseUrl + "/categories") -Headers $adminHeaders
$departments = Invoke-RestMethod -TimeoutSec 15 -Method Get -Uri ($BaseUrl + "/departments") -Headers $adminHeaders
$catId = $categories[0].id
$deptId = ($departments | Select-Object -First 1).id
Assert-Ok $catId "No categories found"
Assert-Ok $deptId "No departments found"

$staffToken = Get-Token -email $StaffEmail -password $StaffPassword
$staffHeaders = @{ Authorization = "Bearer $staffToken" }
$staffMe = Invoke-RestMethod -TimeoutSec 15 -Method Get -Uri ($BaseUrl + "/auth/me") -Headers $staffHeaders
Assert-Ok $staffMe.id "Staff /auth/me missing id"

$title = "E2E Smoke Doc " + (Get-Date -Format "yyyyMMddHHmmss")
$uploadJson = curl.exe -s -X POST ($BaseUrl + "/documents") -H ("Authorization: Bearer " + $adminToken) -F ("title=" + $title) -F ("categoryId=" + $catId) -F "tags=smoke,e2e" -F ("departmentId=" + $deptId) -F ("file=@" + $UploadFile + ";type=application/pdf")
Assert-Ok $uploadJson "Empty response from upload"
$doc = $uploadJson | ConvertFrom-Json
Assert-Ok $doc.id "Upload did not return document id"
$docId = $doc.id
Write-Output ("uploaded: id=" + $docId)

$assignBody = @{ assignedToId = [int]$staffMe.id } | ConvertTo-Json
$assigned = Invoke-RestMethod -TimeoutSec 15 -Method Patch -Uri ($BaseUrl + "/documents/" + $docId + "/assign") -Headers $adminHeaders -ContentType "application/json" -Body $assignBody
Assert-Ok ($assigned.assignedToId -eq $staffMe.id) "Assign did not set assignedToId"

$statusBody = @{ workflowStatus = "IN_PROGRESS" } | ConvertTo-Json
$inProgress = Invoke-RestMethod -TimeoutSec 15 -Method Patch -Uri ($BaseUrl + "/documents/" + $docId + "/status") -Headers $staffHeaders -ContentType "application/json" -Body $statusBody
Assert-Ok ($inProgress.workflowStatus -eq "IN_PROGRESS") "Status did not update to IN_PROGRESS"

$commentBody = @{ message = "Smoke comment " + (Get-Date -Format "HHmmss") } | ConvertTo-Json
$comment = Invoke-RestMethod -TimeoutSec 15 -Method Post -Uri ($BaseUrl + "/documents/" + $docId + "/comments") -Headers $staffHeaders -ContentType "application/json" -Body $commentBody
Assert-Ok $comment.id "Comment did not return id"

$versionJson = curl.exe -s -X POST ($BaseUrl + "/documents/" + $docId + "/versions") -H ("Authorization: Bearer " + $staffToken) -F ("file=@" + $VersionFile + ";type=application/pdf")
Assert-Ok $versionJson "Empty response from version upload"
$doc2 = $versionJson | ConvertFrom-Json
Assert-Ok ($doc2.currentVersion -ge 2) "Version upload did not increment currentVersion"

$doneBody = @{ workflowStatus = "DONE" } | ConvertTo-Json
$done = Invoke-RestMethod -TimeoutSec 15 -Method Patch -Uri ($BaseUrl + "/documents/" + $docId + "/status") -Headers $staffHeaders -ContentType "application/json" -Body $doneBody
Assert-Ok ($done.workflowStatus -eq "DONE") "Status did not update to DONE"

$decisionBody = @{ approvalStatus = "APPROVED"; note = "Smoke approve" } | ConvertTo-Json
$decided = Invoke-RestMethod -TimeoutSec 15 -Method Post -Uri ($BaseUrl + "/documents/" + $docId + "/decision") -Headers $adminHeaders -ContentType "application/json" -Body $decisionBody
Assert-Ok ($decided.approvalStatus -eq "APPROVED") "Decision did not set APPROVED"

$tracking = Invoke-RestMethod -TimeoutSec 15 -Method Get -Uri ($BaseUrl + "/documents/" + $docId + "/tracking") -Headers $adminHeaders
Assert-Ok ($tracking.versions.Count -ge 2) "Tracking missing versions"
Assert-Ok ($tracking.comments.Count -ge 1) "Tracking missing comments"

Write-Output "smoke: OK"

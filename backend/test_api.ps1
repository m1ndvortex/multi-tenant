# Test Customer Backup API
Write-Host "🚀 Testing Customer Backup API"

# Login
$body = @{
    email = "testuser@testbackup.com"
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
    $token = $response.access_token
    Write-Host "✅ Authentication successful"
    
    # Headers for authenticated requests
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Create backup
    Write-Host "💾 Creating customer backup..."
    $backupResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/tenant/backup/create" -Method POST -Headers $headers
    Write-Host "✅ Backup task started: $($backupResponse.task_id)"
    
    # Check task status
    $taskId = $backupResponse.task_id
    Start-Sleep -Seconds 10
    
    $taskStatus = Invoke-RestMethod -Uri "http://localhost:8000/api/tenant/backup/task/$taskId" -Method GET -Headers $headers
    Write-Host "📊 Backup status: $($taskStatus.status)"
    
    # Get backup history
    $history = Invoke-RestMethod -Uri "http://localhost:8000/api/tenant/backup/history" -Method GET -Headers $headers
    Write-Host "📋 Found $($history.backups.Count) backup(s) in history"
    
    Write-Host "🎉 API tests completed successfully!"
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}
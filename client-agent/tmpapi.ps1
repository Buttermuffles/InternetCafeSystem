[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
$body = @{ pc_name = 'test-laptop'; frame_base64 = 'abc'; mime_type = 'image/jpeg' } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri 'http://localhost:8000/api/streams/frame' -Method Post -Headers @{ 'X-API-Key' = 'icafe-monitor-api-key-2024-secure-token-abc123xyz' } -ContentType 'application/json' -Body $body
  $r | ConvertTo-Json -Depth 5
} catch {
  $e = $_
  Write-Output $e.Exception.Message
  if ($e.Exception.Response -ne $null) {
    $resp = $e.Exception.Response
    Write-Output $resp.StatusCode.value__
    Write-Output $resp.StatusDescription
    $text = $resp.Content.ReadAsStringAsync().Result
    Write-Output $text
  }
}

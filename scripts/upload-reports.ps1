[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$supabaseUrl = "https://ckynqqqyrjhoxoqttvjo.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4"

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json; charset=utf-8"
    "Prefer" = "return=representation"
}

$records = @(
    @{
        type = "novel"
        name = [string]::new([char[]]@(0x7384, 0x9274, 0x4ED9, 0x65CF))
        author = [string]::new([char[]]@(0x5B63, 0x8D8A, 0x4EBA))
        platform = [string]::new([char[]]@(0x8D77, 0x70B9, 0x4E2D, 0x6587, 0x7F51))
        douban_score = 8.5
        yousuu_score = 6.6
        adaptation_score = 3.4
        genre_tags = @([string]::new([char[]]@(0x4ED9, 0x4FA0)), [string]::new([char[]]@(0x7FA4, 0x50CF)), [string]::new([char[]]@(0x5BB6, 0x65CF, 0x4FEE, 0x4ED9)), [string]::new([char[]]@(0x4F20, 0x627F)))
        ai_summary = [string]::new([char[]]@(0x4FEE, 0x4ED9, 0x6587, 0x9886, 0x57DF, 0x7684, 0x300A, 0x767E, 0x5E74, 0x5B64, 0x72EC, 0x300B, 0x2014, 0x2014, 0x6587, 0x5B66, 0x6027, 0x548C, 0x8BBE, 0x5B9A, 0x521B, 0x65B0, 0x662F, 0x6838, 0x5FC3, 0x7ADE, 0x4E89, 0x529B))
    },
    @{
        type = "novel"
        name = [string]::new([char[]]@(0x4ED9, 0x738B, 0x7684, 0x65E5, 0x5E38, 0x751F, 0x6D3B))
        author = [string]::new([char[]]@(0x67AF, 0x7384))
        platform = [string]::new([char[]]@(0x8D77, 0x70B9, 0x4E2D, 0x6587, 0x7F51))
        douban_score = 5.5
        yousuu_score = 2.4
        adaptation_score = 3.9
        genre_tags = @([string]::new([char[]]@(0x90FD, 0x5E02)), [string]::new([char[]]@(0x8F7B, 0x5C0F, 0x8BF4)), [string]::new([char[]]@(0x65E0, 0x654C, 0x6D41)), [string]::new([char[]]@(0x6821, 0x56ED)), [string]::new([char[]]@(0x641E, 0x7B11)))
        ai_summary = [string]::new([char[]]@(0x539F, 0x8457, 0x5E73, 0x5EB8, 0x4F46, 0x52A8, 0x753B, 0x6539, 0x7F16, 0x6210, 0x529F, 0x7684, 0x6559, 0x79D1, 0x4E66, 0x7EA7, 0x6848, 0x4F8B))
    },
    @{
        type = "novel"
        name = [string]::new([char[]]@(0x5BBF, 0x547D, 0x4E4B, 0x73AF))
        author = [string]::new([char[]]@(0x7231, 0x6F5C, 0x6C34, 0x7684, 0x4E4C, 0x8D3C))
        platform = [string]::new([char[]]@(0x8D77, 0x70B9, 0x4E2D, 0x6587, 0x7F51))
        douban_score = 7.2
        yousuu_score = 5.7
        adaptation_score = 3.5
        genre_tags = @([string]::new([char[]]@(0x7384, 0x5E7B)), [string]::new([char[]]@(0x514B, 0x82CF, 0x9C81)), [string]::new([char[]]@(0x84B8, 0x6C7D, 0x6734, 0x514B)), [string]::new([char[]]@(0x5947, 0x5E7B)))
        ai_summary = [string]::new([char[]]@(0x300A, 0x8BE1, 0x79D8, 0x4E4B, 0x4E3B, 0x300B, 0x5149, 0x73AF, 0x4E0B, 0x7684, 0x7EED, 0x4F5C, 0xFF0C, 0x5546, 0x4E1A, 0x6210, 0x7EE9, 0x9876, 0x7EA7, 0x4F46, 0x53E3, 0x7891, 0x8FDC, 0x4E0D, 0x53CA, 0x524D, 0x4F5C))
    },
    @{
        type = "novel"
        name = [string]::new([char[]]@(0x5ED3, 0x664B))
        author = [string]::new([char[]]@(0x69B4, 0x5F39, 0x6015, 0x6C34))
        platform = [string]::new([char[]]@(0x8D77, 0x70B9, 0x4E2D, 0x6587, 0x7F51))
        yousuu_score = 8.0
        adaptation_score = 3.4
        genre_tags = @([string]::new([char[]]@(0x5386, 0x53F2)), [string]::new([char[]]@(0x7A7F, 0x8D8A)), [string]::new([char[]]@(0x4E1C, 0x664B)), [string]::new([char[]]@(0x5317, 0x4F10)), [string]::new([char[]]@(0x6743, 0x8C0B)))
        ai_summary = [string]::new([char[]]@(0x767D, 0x91D1, 0x5927, 0x795E, 0x51ED, 0x501F, 0x300A, 0x7ECD, 0x5B8B, 0x300B, 0x53E3, 0x7891, 0x0061, 0x006C, 0x006C, 0x002D, 0x0069, 0x006E, 0x4E1C, 0x664B, 0x9898, 0x6750, 0xFF0C, 0x5F00, 0x5C40, 0x6570, 0x636E, 0x70B8, 0x88C2))
    }
)

foreach ($record in $records) {
    $body = @{
        type = $record.type
        name = $record.name
        author = $record.author
        platform = $record.platform
        genre_tags = $record.genre_tags
        ai_summary = $record.ai_summary
    }
    if ($record.douban_score) { $body.douban_score = $record.douban_score }
    if ($record.yousuu_score) { $body.yousuu_score = $record.yousuu_score }
    if ($record.adaptation_score) { $body.adaptation_score = $record.adaptation_score }

    $jsonBody = $body | ConvertTo-Json -Depth 5
    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ips" -Method Post -Headers $headers -Body $jsonBytes
        Write-Host "OK: $($record.name)" -ForegroundColor Green
    } catch {
        Write-Host "FAIL: $($record.name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDone! Uploading raw_md content..."

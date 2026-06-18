$env:PATH = "C:\Program Files\nodejs;$env:PATH"
$env:PATH += ";$env:APPDATA\npm"
Set-Location "d:\Azlan data sahab\Desktop\IdealBakery\backend"
$output = node verifyStaff.js 2>&1
$output | Out-File -FilePath "d:\Azlan data sahab\Desktop\IdealBakery\backend\verify_output.txt" -Encoding UTF8
Write-Output $output

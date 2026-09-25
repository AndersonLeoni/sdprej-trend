# setup-hostname.ps1 — Configura hostname local para o painel
# Uso: .\setup-hostname.ps1
# Requer: PowerShell como Admin

$hostname = "painel-sdprej.local"
$ip = "127.0.0.1"
$hostsFile = "C:\Windows\System32\drivers\etc\hosts"

Write-Host "🔧 Configurando hostname local..." -ForegroundColor Cyan
Write-Host "   Hostname: $hostname" -ForegroundColor Green
Write-Host "   IP: $ip`n" -ForegroundColor Green

# Verifica se já existe
$exists = Select-String -Path $hostsFile -Pattern $hostname -ErrorAction SilentlyContinue

if ($exists) {
    Write-Host "✅ Hostname já configurado!" -ForegroundColor Green
    Write-Host "   Acesse: http://$hostname`:8000/SDPREJ_Painel.html`n" -ForegroundColor Yellow
} else {
    # Adiciona ao hosts
    try {
        Add-Content -Path $hostsFile -Value "`n$ip`t$hostname" -Encoding ASCII -Force
        Write-Host "✅ Hostname adicionado ao hosts!" -ForegroundColor Green
        Write-Host "   Acesse: http://$hostname`:8000/SDPREJ_Painel.html`n" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ Erro ao adicionar hostname" -ForegroundColor Red
        Write-Host "   Execute como Administrator!" -ForegroundColor Yellow
    }
}

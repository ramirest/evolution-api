# Smart Broker + Evolution API - Setup Script
# PowerShell Script para configuração inicial

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Smart Broker + Evolution API Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se .env existe
Write-Host "[1/6] Verificando arquivo .env..." -ForegroundColor Yellow

if (!(Test-Path ".env")) {
    Write-Host "   ⚠️  .env não encontrado. Copiando de .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "   ✅ .env criado! Por favor, edite-o antes de continuar." -ForegroundColor Green
    Write-Host ""
    Write-Host "   IMPORTANTE: Configure as seguintes variáveis no .env:" -ForegroundColor Red
    Write-Host "   - DATABASE_PROVIDER (postgresql/mysql)" -ForegroundColor White
    Write-Host "   - DATABASE_URL" -ForegroundColor White
    Write-Host "   - MONGODB_URI (para Smart Broker)" -ForegroundColor White
    Write-Host "   - JWT_SECRET" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "Pressione Enter após configurar o .env (ou 'n' para sair)"
    if ($continue -eq "n") {
        exit
    }
} else {
    Write-Host "   ✅ .env encontrado" -ForegroundColor Green
}

# 2. Verificar DATABASE_PROVIDER no .env
Write-Host ""
Write-Host "[2/6] Verificando DATABASE_PROVIDER..." -ForegroundColor Yellow

$envContent = Get-Content ".env" -Raw
if ($envContent -match "DATABASE_PROVIDER\s*=\s*(\w+)") {
    $provider = $Matches[1]
    Write-Host "   ✅ Provider configurado: $provider" -ForegroundColor Green
} else {
    Write-Host "   ❌ DATABASE_PROVIDER não encontrado no .env!" -ForegroundColor Red
    Write-Host "   Adicione: DATABASE_PROVIDER=postgresql" -ForegroundColor Yellow
    exit 1
}

# 3. Verificar se PostgreSQL/MySQL está rodando
Write-Host ""
Write-Host "[3/6] Verificando banco de dados..." -ForegroundColor Yellow

if ($provider -eq "postgresql") {
    $service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Host "   ✅ PostgreSQL está rodando" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  PostgreSQL não está rodando. Iniciando..." -ForegroundColor Yellow
        # Tentar iniciar o serviço (pode precisar de permissões de admin)
        try {
            Start-Service "postgresql*" -ErrorAction Stop
            Write-Host "   ✅ PostgreSQL iniciado" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Não foi possível iniciar PostgreSQL automaticamente" -ForegroundColor Red
            Write-Host "   Por favor, inicie-o manualmente." -ForegroundColor Yellow
        }
    }
} elseif ($provider -eq "mysql") {
    $service = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Host "   ✅ MySQL está rodando" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  MySQL não está rodando. Inicie-o manualmente." -ForegroundColor Yellow
    }
}

# 4. Verificar MongoDB (para Smart Broker)
Write-Host ""
Write-Host "[4/6] Verificando MongoDB..." -ForegroundColor Yellow

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Write-Host "   ✅ MongoDB está rodando" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MongoDB não está rodando ou não foi encontrado" -ForegroundColor Yellow
    Write-Host "   Smart Broker precisa do MongoDB para funcionar!" -ForegroundColor Red
}

# 5. Instalar dependências
Write-Host ""
Write-Host "[5/6] Instalando dependências..." -ForegroundColor Yellow
Write-Host "   (Isso pode demorar alguns minutos...)" -ForegroundColor Gray

try {
    npm install
    Write-Host "   ✅ Dependências instaladas" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro ao instalar dependências" -ForegroundColor Red
    exit 1
}

# 6. Gerar Prisma Client
Write-Host ""
Write-Host "[6/6] Gerando Prisma Client..." -ForegroundColor Yellow

try {
    npm run db:generate
    Write-Host "   ✅ Prisma Client gerado com sucesso" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro ao gerar Prisma Client" -ForegroundColor Red
    Write-Host "   Verifique a DATABASE_URL no .env" -ForegroundColor Yellow
    exit 1
}

# Resumo Final
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Setup Completo!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Execute as migrations (primeira vez):" -ForegroundColor White
Write-Host "   npm run db:deploy:win" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Inicie o servidor:" -ForegroundColor White
Write-Host "   npm run dev:server" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Teste os endpoints Smart Broker:" -ForegroundColor White
Write-Host "   http://localhost:8080/api/smart-broker" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Execute os testes E2E:" -ForegroundColor White
Write-Host "   npm run test:e2e" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Documentação:" -ForegroundColor Cyan
Write-Host "   - PRISMA_TROUBLESHOOTING.md" -ForegroundColor White
Write-Host "   - MIGRATION_COMPLETE.md" -ForegroundColor White
Write-Host "   - QUICK_START_TESTS.md" -ForegroundColor White
Write-Host ""

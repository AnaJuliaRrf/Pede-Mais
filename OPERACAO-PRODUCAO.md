# Operação de Produção - Pede Mais Backend

> Nota de contexto acadêmico: este guia permanece como referência técnica principal de operação; para avaliação, combinar com `RELATORIO-HOMOLOGACAO.md` e com o roteiro de demonstração do `README.md`.

## Objetivo

Documento executável para decisão de release (go/no-go), deploy, rollback e validação pos-deploy.

## 1) Pré-requisitos de ambiente

- Node.js 18+ instalado.
- MySQL acessível para a aplicação.
- Usuário do banco com permissão de leitura/escrita nas tabelas do sistema.
- Porta da API liberada no host de deploy.
- Relógio do servidor sincronizado (NTP) para rastreabilidade de logs.

## 2) Variáveis obrigatórias

Definir no ambiente de produção (ex.: `.env` no host, secret manager ou variaveis do orquestrador):

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `WEBHOOK_VERIFY_TOKEN`
- `WEBHOOK_SIGNING_SECRET`
- `WEBHOOK_RATE_LIMIT_WINDOW_MS`
- `WEBHOOK_RATE_LIMIT_MAX`

Valores recomendados iniciais:

- `WEBHOOK_RATE_LIMIT_WINDOW_MS=60000`
- `WEBHOOK_RATE_LIMIT_MAX=60`

## 3) Ordem de subida (go-live)

1. Garantir backup recente do banco de produção.
2. Atualizar código da versão candidata.
3. Instalar dependências do backend:
   - `npm --prefix backend ci`
4. Validar variáveis de ambiente obrigatórias.
5. Subir backend:
   - `npm --prefix backend start`
6. Executar smoke tests pos-deploy (secao 6).
7. Monitorar primeiras 24h (secao 7).

## 4) Validações pos-deploy

- API responde em `GET /health` com status 200.
- Login funcional em `POST /auth/login`.
- Endpoint público de produtos responde sem autenticação.
- Webhook:
  - aceita assinatura válida,
  - rejeita assinatura inválida,
  - respeita limite de requisições,
  - processa idempotência por `id_externo`.
- Fluxo WhatsApp cria e finaliza pedido sem regressão.

## 5) Checklist go-live

Classificação:

- `ok`: validado
- `pendente`: executar antes da janela de deploy
- `bloqueador`: impede release

- [ ] Banco com backup recente (`ok/pendente/bloqueador`)
- [ ] Variáveis obrigatórias configuradas (`ok/pendente/bloqueador`)
- [ ] `WEBHOOK_SIGNING_SECRET` configurado em produção (`ok/pendente/bloqueador`)
- [ ] `WEBHOOK_RATE_LIMIT_*` configurado e revisado (`ok/pendente/bloqueador`)
- [ ] Backend iniciado sem erro (`ok/pendente/bloqueador`)
- [ ] Smoke tests executados e aprovados (`ok/pendente/bloqueador`)
- [ ] Plano de rollback acordado com o time (`ok/pendente/bloqueador`)

## 6) Smoke tests de producao

Substituir `BASE_URL` antes de executar.

Exemplo PowerShell:

```powershell
$BASE_URL = "https://seu-host"
```

### 6.1 Health

```powershell
Invoke-WebRequest -Uri "$BASE_URL/health" -Method GET
```

Esperado: `200` e body contendo `{"ok":true}`.

### 6.2 Auth

```powershell
$body = @{ email = "admin@empresa.com"; senha = "senha_valida" } | ConvertTo-Json
Invoke-WebRequest -Uri "$BASE_URL/auth/login" -Method POST -ContentType "application/json" -Body $body
```

Esperado: `200` com token.

### 6.3 Produto público

```powershell
Invoke-WebRequest -Uri "$BASE_URL/empresas/1/produtos" -Method GET
```

Esperado: `200` com array.

### 6.4 Webhook - assinatura válida

```powershell
# Montar payload e assinatura HMAC SHA256 com WEBHOOK_SIGNING_SECRET.
# Enviar no header x-hub-signature-256 no formato: sha256=<hash_hex>
```

Esperado: `200`, `status: processado`.

### 6.5 Webhook - assinatura inválida

```powershell
# Repetir payload acima com assinatura invalida no header x-hub-signature-256.
```

Esperado: `401`, `code: WEBHOOK_UNAUTHORIZED`.

### 6.6 Webhook - idempotência

```powershell
# Enviar duas vezes o mesmo id_externo.
```

Esperado: primeira `processado`, segunda `duplicado`.

### 6.7 Webhook - limite

```powershell
# Disparar volume acima de WEBHOOK_RATE_LIMIT_MAX dentro da janela.
```

Esperado: parte das chamadas bloqueada com `429`, `code: WEBHOOK_RATE_LIMIT_EXCEEDED`.

### 6.8 Fluxo WhatsApp pedido

- Simular conversa ate `pronto_para_criar_pedido`.
- Confirmar pedido.
- Verificar criação em `pedidos` e baixa de estoque.

Esperado: conclusão sem erro e consistencia transacional.

## 7) Checklist de rollback

### Gatilhos de rollback

- Taxa de erro 5xx elevada apos deploy por mais de 10 minutos.
- Falha de autenticacao do webhook (401 indevido) em volume alto após deploy.
- Bloqueio excessivo por rate limit afetando processamento legítimo.
- Inconsistencia crítica em criação/finalização de pedido.

### Passos exatos

1. Congelar novas alterações de deploy.
2. Voltar para o commit/tag anterior estável.
3. Reiniciar backend com versão anterior.
4. Reaplicar variaveis da versão anterior, se necessário.
5. Executar smoke tests básicos (`health`, `auth`, `produto publico`, `webhook`).
6. Comunicar status de rollback e abrir análise de causa raiz.

## 8) Plano de monitoramento das primeiras 24h

Janela crítica de observação: 0h a 24h após go-live.

- 0h-1h: acompanhar erros 4xx/5xx por minuto e latencia p95.
- 1h-6h: revisar logs estruturados de webhook por correlation_id e status_processamento.
- 6h-12h: validar taxa de duplicados e rejeições por assinatura/rate limit.
- 12h-24h: consolidar incidentes, impactos e necessidade de ajuste fino de limite.

Indicadores mínimos:

- sucesso webhook (processado) vs falhas (invalido/nao autorizado/limite_excedido)
- volume de 429 por origem
- erros internos no fluxo de confirmação de pedido
- tempo médio de resposta do endpoint de webhook

## 9) Decisão de release (modelo)

- `go`: sem bloqueadores e smoke tests aprovados.
- `go com ressalvas`: sem bloqueadores, mas com riscos monitoraveis e plano ativo.
- `no-go`: existe pelo menos um bloqueador.

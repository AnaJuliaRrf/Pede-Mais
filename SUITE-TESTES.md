# 📋 SUITE DE TESTES CUMULATIVA — Pede Mais Backend

**Instruções**: Execute TODOS os testes aqui **ANTES DE COMMITAR CADA PASSO**.

---

## ✅ PASSO 1: Bootstrap Express (2 testes)

### 1.1 - GET /health

- **URL**: `http://localhost:3000/health`
- **Método**: GET
- **Esperado**: 200 + `{ "ok": true }`

### 1.2 - Server sobe na porta correta

- **URL**: `http://localhost:3000/health`
- **Método**: GET
- **Verificar**: Sem erro de conexão

---

## ✅ PASSO 2: CRUD Produtos (7 testes)

Use `empresa_id = 1`

### 2.1 - POST /empresas/1/produtos (válido)

- **Body**: `{ "nome": "Pizza Calabresa", "descricao": "...", "preco": 45.50, "categoria": "Pizza", "ativo": true }`
- **Esperado**: 201, com `id` gerado

### 2.2 - POST /empresas/1/produtos (nome faltando)

- **Body**: `{ "preco": 30 }`
- **Esperado**: 400, `error: "nome é obrigatório"`

### 2.3 - POST /empresas/1/produtos (preço negativo)

- **Body**: `{ "nome": "Test", "preco": -10 }`
- **Esperado**: 400, `error: "preco..."`

### 2.4 - GET /empresas/1/produtos

- **Esperado**: 200, array com produtos

### 2.5 - PUT /empresas/1/produtos/{id} (atualizar)

- **Body**: `{ "nome": "Pizza Especial", "preco": 55.00, "descricao": "...", "categoria": "Pizza", "ativo": true }`
- **Esperado**: 200

### 2.6 - DELETE /empresas/1/produtos/{id}

- **Esperado**: 200, `{ "message": "produto removido com sucesso" }`

### 2.7 - GET /empresas/999/produtos (multiempresa)

- **Esperado**: 200, array vazio

---

## ✅ PASSO 3: Estoque (6 testes)

**Pré-requisito**: Produto criado no Passo 2

### 3.1 - GET /empresas/1/estoque

- **Esperado**: 200, array com produtos + estoque

### 3.2 - PATCH /empresas/1/estoque/{id} (quantidade)

- **Body**: `{ "quantidade": 50 }`
- **Esperado**: 200, `{ produto_id, empresa_id, quantidade: 50, estoque_minimo }`

### 3.3 - PATCH /empresas/1/estoque/{id} (estoque_minimo)

- **Body**: `{ "estoque_minimo": 10 }`
- **Esperado**: 200, com estoque_minimo: 10

### 3.4 - PATCH /empresas/1/estoque/{id} (quantidade negativa)

- **Body**: `{ "quantidade": -5 }`
- **Esperado**: 400, `error: "quantidade..."`

### 3.5 - PATCH /empresas/1/estoque/999 (inexistente)

- **Esperado**: 404

### 3.6 - GET /empresas/1/estoque/baixo

- **Esperado**: 200, array com itens onde qty <= minimo

---

## ✅ PASSO 4: Pedidos + Transação (6 testes)

**Pré-requisito**: Produto com qty=100 e preço=45.50

### 4.0 - POST /empresas/1/pedidos (público, sem token)

- Esperado: 201 (criação de pedido permanece pública)

### 4.1 - POST /empresas/1/pedidos (entrega válida)

```json
{
  "cliente_nome": "João",
  "telefone": "11987654321",
  "tipo_recebimento": "entrega",
  "endereco": "Rua X, 123",
  "forma_pagamento": "dinheiro",
  "troco_para": 100.0,
  "itens": [{ "produto_id": 1, "quantidade": 2 }]
}
```

### 4.1 - POST /empresas/1/pedidos (entrega válida)

- Esperado: 201, valor_total: 91, itens com preco_unitario, subtotal

### 4.2 - POST /empresas/1/pedidos (retirada)

- Mesmo que 4.1, mas tipo_recebimento: "retirada" sem endereco
- Esperado: 201

### 4.3 - POST /empresas/1/pedidos (estoque insuficiente)

- qty: 200 (só há 100)
- Esperado: 400, error: "estoque insuficiente..."

### 4.4 - Validações (campos obrigatórios, formato, etc.)

- sem cliente_nome → 400
- sem telefone → 400
- tipo_recebimento: "xyz" → 400
- entrega sem endereco → 400
- forma_pagamento: "bitcoin" → 400
- dinheiro sem troco_para → 400
- itens vazio → 400
- produto inexistente → 404

### 4.5 - GET /empresas/1/pedidos

- Esperado: 200, array com pedidos

### 4.6 - Validar baixa de estoque

- Criar pedido com 2 unidades
- Consultar estoque do produto
- Esperado: qty = 98 (foi 100)

---

## ✅ PASSO 5: Status de Pedido (8 testes)

**Pré-requisito**: Pedido com status pendente

### 5.1 - PATCH /empresas/1/pedidos/{id}/status

- Body: { "status": "em_preparo" }
- Esperado: 200, status: "em_preparo"

### 5.2 - Transição em_preparo → saiu_para_entrega

- Body: { "status": "saiu_para_entrega" }
- Esperado: 200

### 5.3 - Transição saiu_para_entrega → entregue

- Body: { "status": "entregue" }
- Esperado: 200

### 5.4 - Transição inválida (entregue → cancelado)

- Body: { "status": "cancelado" }
- Esperado: 400, error: "transição inválida..."

### 5.5 - Pular status (pendente → entregue direto)

- Esperado: 400

### 5.6 - Status inválido

- Body: { "status": "xyz" }
- Esperado: 400

### 5.7 - Pedido inexistente

- URL: /empresas/1/pedidos/999/status
- Esperado: 404

### 5.8 - Empresa diferente

- URL: /empresas/999/pedidos/{id_empresa_1}/status
- Esperado: 403 (token válido, sem permissão para empresa da rota)

---

## ✅ PASSO 6: Detalhe + Filtros (8 testes)

### 6.1 - GET /empresas/1/pedidos/{id}

- Esperado: 200, pedido completo + itens expandido

### 6.2 - GET /empresas/1/pedidos/999

- Esperado: 404

### 6.3 - GET /empresas/1/pedidos (sem filtros)

- Esperado: 200, todos os pedidos

### 6.4 - GET /empresas/1/pedidos?status=em_preparo

- Esperado: 200, apenas status: "em_preparo"

### 6.5 - GET /empresas/1/pedidos?status=xyz

- Esperado: 400

### 6.6 - GET /empresas/1/pedidos?data_inicio=2026-03-20&data_fim=2026-03-24

- Esperado: 200, só pedidos no intervalo

### 6.7 - GET ...?data_inicio=abc

- Esperado: 400

### 6.8 - GET ...?status=pendente&data_inicio=...&data_fim=...

- Esperado: 200, filtros combinados (AND)

---

## ✅ PASSO 7: Configurações da Empresa (8 testes)

### 7.1 - GET /empresas/1/configuracoes

- Esperado: 200, { empresa_id, aceita_entrega, aceita_retirada, taxa_entrega, telefone, endereco, horario_abertura, horario_fechamento, formas_pagamento_aceitas }

### 7.2 - GET /empresas/999/configuracoes

- Esperado: 403 (rota protegida sem permissão)

### 7.9 - GET /empresas/999999/configuracoes (com permissão superadmin)

- Esperado: 404 (com permissão para acessar a empresa da rota, mas empresa inexistente)

### 7.3 - PATCH /empresas/1/configuracoes

- Body: { "taxa_entrega": 15.00 }
- Esperado: 200

### 7.4 - PATCH com taxa negativa

- Body: { "taxa_entrega": -5 }
- Esperado: 400

### 7.5 - PATCH com ambos false

- Body: { "aceita_entrega": false, "aceita_retirada": false }
- Esperado: 400, error: "empresa deve aceitar..."

### 7.6 - PATCH com horário válido

- Body: { "horario_abertura": "08:00:00", "horario_fechamento": "22:00:00" }
- Esperado: 200

### 7.7 - PATCH com horário inválido

- Body: { "horario_abertura": "25:00:00" }
- Esperado: 400

### 7.8 - PATCH múltiplos campos

- Esperado: 200, todos atualizados

---

## ✅ PASSO 8: Autenticação + JWT (15 testes)

**Pré-requisito**:

- Usuário criado:
- (Use senha: 123456 e faça hash com bcrypt antes)
- .env com JWT_SECRET=seu_secret e JWT_EXPIRES_IN=8h

### 8.1 - POST /auth/login (válido)

- Body: { "email": "admin@test.com", "senha": "123456" }
- Esperado: 200, { token: "eyJ...", usuario: { id, nome, email, perfil, empresa_id } }

### 8.2 - POST /auth/login (email inexistente)

- Body: { "email": "inexistente@test.com", "senha": "123456" }
- Esperado: 401, error: "credenciais inválidas"

### 8.3 - POST /auth/login (senha errada)

- Body: { "email": "admin@test.com", "senha": "errada" }
- Esperado: 401

### 8.4 - POST /auth/login (email vazio)

- Body: { "email": "", "senha": "123456" }
- Esperado: 400

### 8.5 - POST /auth/login (senha vazia)

- Body: { "email": "admin@test.com", "senha": "" }
- Esperado: 400

### 8.6 - GET /empresas/1/produtos (sem token, público)

- Esperado: 200 (endpoint público)

### 8.7 - POST /empresas/1/produtos (sem token, protegido)

- Esperado: 401, error: "token ausente"

### 8.8 - POST /empresas/1/produtos (com token válido)

- Header: Authorization: Bearer {token_de_8.1}
- Body: produto válido
- Esperado: 201

### 8.9 - POST /empresas/1/produtos (token fake)

- Header: Authorization: Bearer token_fake_xyz
- Esperado: 401, error: "token inválido ou expirado"

### 8.10 - POST /empresas/1/produtos (token expirado)

- Nota: Precisa de token vencido, ignore se não conseguir simular
- Esperado: 401, error: "token inválido ou expirado"

### 8.11 - PATCH /empresas/1/pedidos/{id}/status (token de outra empresa)

- Ação: Criar usuário em empresa 2, fazer login
- Header: Authorization: Bearer {token_empresa_2}
- URL: /empresas/1/pedidos/{id_empresa_1}/status
- Esperado: 403, error: "acesso negado..."

### 8.12 - GET /empresas/1/estoque (token válido)

- Esperado: 200

### 8.13 - PATCH /empresas/1/estoque/{id} (token válido)

- Esperado: 200

### 8.14 - GET /empresas/1/configuracoes (token válido)

- Esperado: 200

### 8.15 - PATCH /empresas/1/configuracoes (token válido)

- Esperado: 200

---

## ✅ PASSO 9: Webhook WhatsApp (fundação + idempotência) (5 testes)

### 9.1 - GET /webhook/whatsapp (handshake válido)

- Query: `hub.mode=subscribe`, `hub.verify_token={token_correto}`, `hub.challenge=12345`
- Esperado: 200, body `12345`

### 9.2 - GET /webhook/whatsapp (handshake inválido)

- Query: `hub.mode=subscribe`, `hub.verify_token=token_invalido`, `hub.challenge=12345`
- Esperado: 403, `error: "verificação inválida"`

### 9.3 - POST /webhook/whatsapp (evento válido)

- Esperado: 200, `status: "processado"`
- Persistência mínima: `id_externo`, `empresa_id` (quando presente), `telefone_origem`, `payload_bruto`, `status_processamento`, timestamps

### 9.4 - POST /webhook/whatsapp (evento duplicado)

- Enviar o mesmo `id_externo` duas vezes
- Esperado: segunda resposta com `status: "duplicado"`
- Garantia: sem novo processamento e sem novo registro para o mesmo `id_externo`

### 9.5 - POST /webhook/whatsapp (payload inválido)

- Sem identificador único da mensagem/evento
- Esperado: 400, `error: "payload inválido"`
- Persistência: evento auditável com `status_processamento: "invalido"`

---

## ✅ PASSO 10: Máquina de estados WhatsApp (MVP seguro) (6 testes)

### 10.1 - Fluxo feliz até `pronto_para_confirmacao`

- Primeira mensagem inicia sessão em `aguardando_nome`
- Nome válido avança para `aguardando_item_menu` com cardápio numerado
- Item válido avança para `aguardando_quantidade_item`
- Quantidade válida avança para `aguardando_mais_itens`
- Opção `2` (não adicionar mais) avança para `pronto_para_confirmacao`
- Esperado: pré-resumo do carrinho sem criar pedido definitivo

### 10.2 - Item inválido no menu

- Em `aguardando_item_menu`, enviar número inexistente
- Esperado: mensagem guiada de erro e permanência em `aguardando_item_menu`

### 10.3 - Quantidade inválida

- Em `aguardando_quantidade_item`, enviar valor inválido
- Esperado: mensagem guiada e permanência em `aguardando_quantidade_item`

### 10.4 - Opção inválida no “mais itens”

- Em `aguardando_mais_itens`, enviar opção diferente de `1` ou `2`
- Esperado: mensagem guiada e permanência em `aguardando_mais_itens`

### 10.5 - Reentrada com sessão existente

- Com sessão ativa, próxima mensagem deve seguir estado persistido
- Esperado: retomada determinística sem perder contexto

### 10.6 - Isolamento por empresa e telefone

- Sessões independentes para `(empresa_id, telefone)` distintos
- Esperado: estados/carrinhos isolados sem contaminação cruzada

---

## ✅ PASSO 11: WhatsApp segunda metade do fluxo (9 testes)

### 11.1 - Entrega completa até `pronto_para_criar_pedido`

- Após `pronto_para_confirmacao`, avançar para recebimento
- Escolher entrega, informar endereço, confirmar endereço, escolher dinheiro, informar troco
- Esperado: estado final `pronto_para_criar_pedido` com pré-resumo final

### 11.2 - Retirada completa até `pronto_para_criar_pedido`

- Escolher retirada e forma de pagamento não dinheiro
- Esperado: estado final `pronto_para_criar_pedido` sem endereço no resumo

### 11.3 - Empresa apenas entrega

- Configuração: `aceita_entrega=true`, `aceita_retirada=false`
- Esperado: após confirmação do carrinho, seguir direto para endereço

### 11.4 - Empresa apenas retirada

- Configuração: `aceita_entrega=false`, `aceita_retirada=true`
- Esperado: após confirmação do carrinho, seguir direto para forma de pagamento

### 11.5 - Endereço inválido e correção

- Endereço vazio deve manter estado `aguardando_endereco_entrega`
- Em confirmação, opção `2` deve permitir editar endereço

### 11.6 - Pagamento não permitido

- Opção inválida em `aguardando_forma_pagamento`
- Esperado: mensagem guiada e permanência no estado

### 11.7 - Dinheiro com troco sim e não

- Caminho `troco=não` vai direto para `pronto_para_criar_pedido`
- Caminho `troco=sim` exige valor e só então avança

### 11.8 - Isolamento por empresa e telefone

- Fluxos paralelos por `(empresa_id, telefone)` não se misturam

### 11.9 - Reentrada após estados críticos

- Retomada determinística em cada estado novo:
  `aguardando_tipo_recebimento`,
  `aguardando_endereco_entrega`,
  `aguardando_confirmacao_endereco`,
  `aguardando_forma_pagamento`,
  `aguardando_necessidade_troco`,
  `aguardando_troco_para`,
  `pronto_para_criar_pedido`

---

## 📌 COMO USAR

No Thunder Client, organize em pastas:

- Passo 1 - Bootstrap
- Passo 2 - Produtos
- Passo 3 - Estoque
- Passo 4 - Pedidos
- Passo 5 - Status
- Passo 6 - Filtros
- Passo 7 - Config
- Passo 8 - Auth

Antes de cada COMMIT:

- Execute testes do Passo 1 até Passo atual
- Se algum falhar, NÃO commita
- Dica: Salve templates de request, mude só IDs/bodies

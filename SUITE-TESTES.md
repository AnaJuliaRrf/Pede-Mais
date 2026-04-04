# SUITE DE TESTES CUMULATIVA - Pede Mais Backend (Manual Pratico)

Objetivo: manter exatamente os mesmos cenarios da suite, em formato rapido para executar no Thunder Client.

## Setup rapido (copiar e ajustar)

- BASE_URL: `http://localhost:3000`
- EMPRESA_PADRAO: `1`
- TOKEN_EMPRESA_1: `<token do login 8.1>`
- TOKEN_EMPRESA_2: `<token de outra empresa para testes 8.11 e 5.8>`
- PRODUTO_ID: `<id criado no passo 2.1>`
- PEDIDO_ID: `<id criado no passo 4.1>`

Headers padrao para rotas protegidas:

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

---

## PASSO 1 - Bootstrap Express (2 testes)

### 1.1 - Health

- Metodo: `GET`
- URL: `{{BASE_URL}}/health`
- Body: nao usa
- Retorno esperado: `200` e `{ "ok": true }`

### 1.2 - Server na porta correta

- Metodo: `GET`
- URL: `{{BASE_URL}}/health`
- Body: nao usa
- Retorno esperado: sem erro de conexao

---

## PASSO 2 - CRUD Produtos (7 testes)

### 2.1 - Criar produto valido

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "nome": "Pizza Brotinho Doce",
  "descricao": "chocolate com morangos frescos",
  "preco": 30,
  "categoria": "Pizza",
  "ativo": true
}
```

- Retorno esperado: `201` com `id` gerado

### 2.2 - Criar produto sem nome

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "preco": 30
}
```

- Retorno esperado: `400`, `error: "nome e obrigatorio"`

### 2.3 - Criar produto com preco negativo

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "nome": "Test",
  "preco": -10
}
```

- Retorno esperado: `400`, `error: "preco..."`

### 2.4 - Listar produtos da empresa

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Body: nao usa
- Retorno esperado: `200`, array com produtos

### 2.5 - Atualizar produto

- Metodo: `PUT`
- URL: `{{BASE_URL}}/empresas/1/produtos/{{PRODUTO_ID}}`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "nome": "Pizza Especial",
  "preco": 55,
  "descricao": "...",
  "categoria": "Pizza",
  "ativo": true
}
```

- Retorno esperado: `200`

### 2.6 - Remover produto

- Metodo: `DELETE`
- URL: `{{BASE_URL}}/empresas/1/produtos/{{PRODUTO_ID}}`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, `{ "message": "produto removido com sucesso" }`

### 2.7 - Multiempresa isolada

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/999/produtos`
- Body: nao usa
- Retorno esperado: `200`, array vazio

---

## PASSO 3 - Estoque (6 testes)

Pre-requisito: produto criado no passo 2.

### 3.1 - Listar estoque

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/estoque`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, array com produtos + estoque

### 3.2 - Atualizar quantidade

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/estoque/{{PRODUTO_ID}}`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "quantidade": 50
}
```

- Retorno esperado: `200`, com `quantidade: 50`

### 3.3 - Atualizar estoque minimo

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/estoque/{{PRODUTO_ID}}`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "estoque_minimo": 10
}
```

- Retorno esperado: `200`, com `estoque_minimo: 10`

### 3.4 - Quantidade negativa

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/estoque/{{PRODUTO_ID}}`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "quantidade": -5
}
```

- Retorno esperado: `400`, `error: "quantidade..."`

### 3.5 - Produto inexistente

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/estoque/999`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "quantidade": 10
}
```

- Retorno esperado: `404`

### 3.6 - Estoque baixo

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/estoque/baixo`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, itens com `quantidade <= estoque_minimo`

---

## PASSO 4 - Pedidos + Transacao (6 testes)

Pre-requisito: produto com `quantidade=100` e `preco=45.50`.

### 4.0 - Criacao publica de pedido (sem token)

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/pedidos`
- Body: usar mesmo formato do 4.1
- Retorno esperado: `201` (continua publico)

### 4.1 - Pedido entrega valido

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/pedidos`
- Body:

```json
{
  "cliente_nome": "Camilo",
  "telefone": "11987654321",
  "tipo_recebimento": "entrega",
  "endereco": "Avenida Brasil, 1000",
  "forma_pagamento": "dinheiro",
  "troco_para": 90,
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 2
    }
  ]
}
```

- Retorno esperado: `201`, `valor_total` e itens com `preco_unitario` e `subtotal`

### 4.2 - Pedido retirada valido

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/pedidos`
- Body: igual ao 4.1, mudando `tipo_recebimento` para `retirada` e sem `endereco`
- Retorno esperado: `201`

### 4.3 - Estoque insuficiente

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/pedidos`
- Body: igual ao 4.1, com `quantidade` acima do estoque
- Retorno esperado: `400`, `error: "estoque insuficiente..."`

### 4.4 - Validacoes obrigatorias

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/pedidos`
- Body: testar cada variacao abaixo separadamente
- Casos esperados:
  - sem `cliente_nome` -> `400`
  - sem `telefone` -> `400`
  - `tipo_recebimento: "xyz"` -> `400`
  - entrega sem endereco -> `400`
  - `forma_pagamento: "bitcoin"` -> `400`
  - dinheiro sem `troco_para` -> `400`
  - `itens` vazio -> `400`
  - produto inexistente -> `404`

### 4.5 - Listar pedidos

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, array com pedidos

### 4.6 - Validar baixa de estoque

- Metodo: fluxo combinado
- URL 1: `POST {{BASE_URL}}/empresas/1/pedidos` (pedido com 2 unidades)
- URL 2: `GET {{BASE_URL}}/empresas/1/estoque`
- Retorno esperado: quantidade final reduzida corretamente (exemplo: 100 -> 98)

---

## PASSO 5 - Status de Pedido (8 testes)

Pre-requisito: pedido com status inicial `pendente`.

### 5.1 - pendente -> em_preparo

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "em_preparo"
}
```

- Retorno esperado: `200`, status atualizado

### 5.2 - em_preparo -> saiu_para_entrega

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "saiu_para_entrega"
}
```

- Retorno esperado: `200`

### 5.3 - saiu_para_entrega -> entregue

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "entregue"
}
```

- Retorno esperado: `200`

### 5.4 - Transicao invalida (entregue -> cancelado)

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "cancelado"
}
```

- Retorno esperado: `400`, `error: "transicao invalida..."`

### 5.5 - Pular status (pendente -> entregue)

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "entregue"
}
```

- Retorno esperado: `400`

### 5.6 - Status invalido

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "xyz"
}
```

- Retorno esperado: `400`

### 5.7 - Pedido inexistente

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/999/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "em_preparo"
}
```

- Retorno esperado: `404`

### 5.8 - Empresa diferente sem permissao

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/999/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "status": "em_preparo"
}
```

- Retorno esperado: `403`

---

## PASSO 6 - Detalhe + Filtros (8 testes)

### 6.1 - Detalhar pedido existente

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, pedido completo com itens

### 6.2 - Detalhar pedido inexistente

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos/999`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `404`

### 6.3 - Listar sem filtros

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`

### 6.4 - Filtrar por status valido

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos?status=em_preparo`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, apenas `status=em_preparo`

### 6.5 - Filtrar por status invalido

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos?status=xyz`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `400`

### 6.6 - Filtrar por intervalo de datas

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos?data_inicio=2026-03-20&data_fim=2026-03-24`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, apenas intervalo informado

### 6.7 - Data invalida

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos?data_inicio=abc`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `400`

### 6.8 - Filtros combinados

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/pedidos?status=pendente&data_inicio=2026-03-20&data_fim=2026-03-24`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, aplicando regra AND

---

## PASSO 7 - Configuracoes da Empresa (8 testes)

### 7.1 - Buscar configuracoes da empresa

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`, objeto completo de configuracoes

### 7.2 - Sem permissao na empresa da rota

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/999/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `403`

### 7.9 - Empresa inexistente com permissao de rota

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/999999/configuracoes`
- Header: token com permissao de superadmin
- Body: nao usa
- Retorno esperado: `404`

### 7.3 - Atualizar taxa de entrega

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "taxa_entrega": 15
}
```

- Retorno esperado: `200`

### 7.4 - Taxa negativa

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "taxa_entrega": -5
}
```

- Retorno esperado: `400`

### 7.5 - Ambos recebimentos false

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "aceita_entrega": false,
  "aceita_retirada": false
}
```

- Retorno esperado: `400`, `error: "empresa deve aceitar..."`

### 7.6 - Horario valido

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "horario_abertura": "08:00:00",
  "horario_fechamento": "22:00:00"
}
```

- Retorno esperado: `200`

### 7.7 - Horario invalido

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "horario_abertura": "25:00:00"
}
```

- Retorno esperado: `400`

### 7.8 - Atualizacao multipla

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: combinar varios campos validos
- Retorno esperado: `200`, todos atualizados

---

## PASSO 8 - Autenticacao + JWT (15 testes)

Pre-requisito:

- usuario criado (`senha: 123456`, hash com bcrypt no banco)
- variaveis JWT configuradas

### 8.1 - Login valido

- Metodo: `POST`
- URL: `{{BASE_URL}}/auth/login`
- Body:

```json
{
  "email": "admin@test.com",
  "senha": "123456"
}
```

- Retorno esperado: `200`, token e dados de usuario

### 8.2 - Email inexistente

- Metodo: `POST`
- URL: `{{BASE_URL}}/auth/login`
- Body:

```json
{
  "email": "inexistente@test.com",
  "senha": "123456"
}
```

- Retorno esperado: `401`, `error: "credenciais invalidas"`

### 8.3 - Senha errada

- Metodo: `POST`
- URL: `{{BASE_URL}}/auth/login`
- Body:

```json
{
  "email": "admin@test.com",
  "senha": "errada"
}
```

- Retorno esperado: `401`

### 8.4 - Email vazio

- Metodo: `POST`
- URL: `{{BASE_URL}}/auth/login`
- Body:

```json
{
  "email": "",
  "senha": "123456"
}
```

- Retorno esperado: `400`

### 8.5 - Senha vazia

- Metodo: `POST`
- URL: `{{BASE_URL}}/auth/login`
- Body:

```json
{
  "email": "admin@test.com",
  "senha": ""
}
```

- Retorno esperado: `400`

### 8.6 - Rota publica sem token

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Body: nao usa
- Retorno esperado: `200`

### 8.7 - Rota protegida sem token

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Body: produto valido
- Retorno esperado: `401`, `error: "token ausente"`

### 8.8 - Rota protegida com token valido

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: produto valido
- Retorno esperado: `201`

### 8.9 - Token fake

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Header: `Authorization: Bearer token_fake_xyz`
- Body: produto valido
- Retorno esperado: `401`, `error: "token invalido ou expirado"`

### 8.10 - Token expirado

- Metodo: `POST`
- URL: `{{BASE_URL}}/empresas/1/produtos`
- Header: `Authorization: Bearer <token expirado>`
- Body: produto valido
- Retorno esperado: `401`, `error: "token invalido ou expirado"`

### 8.11 - Token de outra empresa

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/pedidos/{{PEDIDO_ID}}/status`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_2}}`
- Body:

```json
{
  "status": "em_preparo"
}
```

- Retorno esperado: `403`, `error: "acesso negado..."`

### 8.12 - Estoque com token valido

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/estoque`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`

### 8.13 - Atualizar estoque com token valido

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/estoque/{{PRODUTO_ID}}`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "quantidade": 60
}
```

- Retorno esperado: `200`

### 8.14 - Configuracoes com token valido

- Metodo: `GET`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body: nao usa
- Retorno esperado: `200`

### 8.15 - Atualizar configuracoes com token valido

- Metodo: `PATCH`
- URL: `{{BASE_URL}}/empresas/1/configuracoes`
- Header: `Authorization: Bearer {{TOKEN_EMPRESA_1}}`
- Body:

```json
{
  "taxa_entrega": 10
}
```

- Retorno esperado: `200`

---

## PASSO 9 - Webhook WhatsApp (fundacao + idempotencia) (5 testes)

### 9.1 - Handshake valido

- Metodo: `GET`
- URL: `{{BASE_URL}}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<token_correto>&hub.challenge=12345`
- Body: nao usa
- Retorno esperado: `200` com body `12345`

### 9.2 - Handshake invalido

- Metodo: `GET`
- URL: `{{BASE_URL}}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=token_invalido&hub.challenge=12345`
- Body: nao usa
- Retorno esperado: `403`, `error: "verificacao invalida"`

### 9.3 - Evento valido

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Body: payload valido com identificador unico (`id_externo`)
- Retorno esperado: `200`, `status: "processado"`

### 9.4 - Evento duplicado

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Body: reenviar exatamente o mesmo `id_externo`
- Retorno esperado: segunda resposta com `status: "duplicado"`

### 9.5 - Payload invalido

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Body: sem identificador unico
- Retorno esperado: `400`, `error: "payload invalido"`

---

## PASSO 10 - Maquina de estados WhatsApp (MVP seguro) (6 testes)

URL base para todos os cenarios do passo: `POST {{BASE_URL}}/webhook/whatsapp`

### 10.1 - Fluxo feliz ate pronto_para_confirmacao

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: enviar mensagens em sequencia (inicio -> nome -> item -> quantidade -> mais_itens=2)
- Retorno esperado: pre-resumo do carrinho, sem criar pedido definitivo

### 10.2 - Item invalido no menu

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: em `aguardando_item_menu`, enviar numero inexistente
- Retorno esperado: mensagem guiada e permanencia em `aguardando_item_menu`

### 10.3 - Quantidade invalida

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: em `aguardando_quantidade_item`, enviar valor invalido
- Retorno esperado: mensagem guiada e permanencia em `aguardando_quantidade_item`

### 10.4 - Opcao invalida em mais_itens

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: em `aguardando_mais_itens`, enviar diferente de `1` ou `2`
- Retorno esperado: mensagem guiada e permanencia em `aguardando_mais_itens`

### 10.5 - Reentrada com sessao existente

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: com sessao ativa, enviar proxima mensagem
- Retorno esperado: retomada deterministica no estado persistido

### 10.6 - Isolamento por empresa e telefone

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: rodar fluxos paralelos para pares `(empresa_id, telefone)` diferentes
- Retorno esperado: estados/carrinhos isolados

---

## PASSO 11 - WhatsApp segunda metade do fluxo (9 testes)

URL base para todos os cenarios do passo: `POST {{BASE_URL}}/webhook/whatsapp`

### 11.1 - Entrega completa ate pronto_para_criar_pedido

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: apos confirmacao do carrinho, seguir entrega + endereco + pagamento dinheiro + troco
- Retorno esperado: estado `pronto_para_criar_pedido` com pre-resumo final

### 11.2 - Retirada completa ate pronto_para_criar_pedido

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: escolher retirada + pagamento nao dinheiro
- Retorno esperado: `pronto_para_criar_pedido` sem endereco

### 11.3 - Empresa apenas entrega

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Pre-condicao: `aceita_entrega=true`, `aceita_retirada=false`
- Retorno esperado: avancar direto para endereco

### 11.4 - Empresa apenas retirada

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Pre-condicao: `aceita_entrega=false`, `aceita_retirada=true`
- Retorno esperado: avancar direto para forma de pagamento

### 11.5 - Endereco invalido e correcao

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: enviar endereco vazio e depois editar via opcao `2` na confirmacao
- Retorno esperado: permanecer/retornar corretamente para `aguardando_endereco_entrega`

### 11.6 - Pagamento nao permitido

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: opcao invalida em `aguardando_forma_pagamento`
- Retorno esperado: mensagem guiada e permanencia no estado

### 11.7 - Dinheiro com troco sim e nao

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: testar caminho `troco=nao` e `troco=sim`
- Retorno esperado: sem troco vai direto; com troco exige valor antes de avancar

### 11.8 - Isolamento por empresa e telefone

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: fluxos paralelos por empresa/telefone
- Retorno esperado: sem mistura de sessoes

### 11.9 - Reentrada apos estados criticos

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: retomar em cada estado critico listado na suite
- Retorno esperado: retomada deterministica em todos

---

## PASSO 12 - Finalizacao do pedido WhatsApp (9 testes)

URL base para todos os cenarios do passo: `POST {{BASE_URL}}/webhook/whatsapp`

### 12.1 - Fluxo feliz cria pedido e baixa estoque

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: em `pronto_para_criar_pedido`, confirmar com opcao `1`
- Retorno esperado: cria pedido + itens, baixa estoque e sessao `concluido`

### 12.2 - Reenvio da confirmacao nao duplica

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: apos concluido, reenviar confirmacao
- Retorno esperado: sem novo pedido; resposta idempotente

### 12.3 - Falha intermediaria com rollback

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: simular erro interno entre pedido/itens/estoque
- Retorno esperado: rollback total sem dados parciais

### 12.4 - Estoque insuficiente opcao 1

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: escolher opcao `1` (ajuste automatico para disponivel)
- Retorno esperado: retorna para nova confirmacao com carrinho ajustado

### 12.5 - Estoque insuficiente opcao 2

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: escolher opcao `2` (remover item insuficiente)
- Retorno esperado: estado e contexto preservados

### 12.6 - Estoque insuficiente opcao 3

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: escolher opcao `3` (cancelar finalizacao)
- Retorno esperado: permanece em `pronto_para_criar_pedido`

### 12.7 - Carrinho vazio apos ajustes

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: remover/ajustar ate carrinho zerar
- Retorno esperado: volta para `aguardando_item_menu`

### 12.8 - Isolamento por empresa e telefone

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: finalizar fluxos em paralelo para pares distintos
- Retorno esperado: criacao e estado isolados

### 12.9 - Regressao cumulativa completa

- Metodo: comando de regressao
- Comando:

```bash
npm --prefix backend test -- --runInBand --testPathPatterns tests/integration/suite.test.js
```

- Retorno esperado: tudo verde sem regressao

---

## PASSO 13 - Hardening de producao (5 testes)

### 13.1 - Assinatura valida aceita evento

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Header: `x-hub-signature-256: sha256=<hash_valido>`
- Body: payload valido
- Retorno esperado: `200`, `status: "processado"`

### 13.2 - Assinatura invalida rejeita evento

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Header: `x-hub-signature-256: sha256=<hash_invalido>`
- Body: payload valido
- Retorno esperado: `401`, `error: "assinatura invalida"`

### 13.3 - Rate limit bloqueia excesso

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: estourar chamadas acima de `WEBHOOK_RATE_LIMIT_MAX` na janela
- Retorno esperado: `429`, `error: "limite de requisicoes excedido"`

### 13.4 - Dentro do limite segue funcional

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Acao: enviar volume abaixo do limite
- Retorno esperado: `200`, processamento normal

### 13.5 - Correlacao e observabilidade minima

- Metodo: `POST`
- URL: `{{BASE_URL}}/webhook/whatsapp`
- Header: `x-correlation-id: <id_unico>`
- Body: payload valido
- Retorno esperado: `correlation_id` no response e log estruturado correlacionavel

---

## Como usar no Thunder Client (sem mudar a suite)

1. Crie uma collection chamada `Pede Mais - Suite Manual`.
2. Crie 13 pastas (Passo 1 ate Passo 13).
3. Em cada request, copie metodo/URL/body exatamente deste documento.
4. Execute em ordem cumulativa (nao pular passos).
5. Antes de commit, rode tambem a suite automatizada sem alteracoes:

```bash
npm --prefix backend run test:ci
```

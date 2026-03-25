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

## ✅ PASSO 4: Pedidos + Transação (7 testes)

**Pré-requisito**: Produto com qty=100 e preço=45.50

### 4.1 - POST /empresas/1/pedidos (entrega válida)
```json
{
  "cliente_nome": "João",
  "telefone": "11987654321",
  "tipo_recebimento": "entrega",
  "endereco": "Rua X, 123",
  "forma_pagamento": "dinheiro",
  "troco_para": 100.00,
  "itens": [{ "produto_id": 1, "quantidade": 2 }]
}

//em andamento
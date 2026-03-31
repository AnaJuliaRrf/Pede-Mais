# Pede Mais

## Testes automatizados (backend)

Os testes de integração dos passos 1 a 8 da suíte estão em `backend/tests/integration/suite.test.js` e usam `Jest + Supertest` com o app exportado em `backend/src/app.js` (sem subir listener).

### Variáveis obrigatórias para teste

Use `backend/.env.test.example` como base e crie `backend/.env.test` com:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=sua_senha_mysql
DB_NAME=pedidos_db
DB_PORT=3306
JWT_SECRET=test_secret_jwt
JWT_EXPIRES_IN=8h
```

### Comando único antes de commit

Na raiz do projeto:

```bash
npm --prefix backend run test:ci
```

Scripts disponíveis em `backend/package.json`:

- `npm --prefix backend run test`
- `npm --prefix backend run test:watch`
- `npm --prefix backend run test:ci`

## Operacao de producao

Checklist executavel de go-live, rollback e smoke tests:

- `OPERACAO-PRODUCAO.md`

## Roteiro de Demonstracao

1. Executar `GET /health` e mostrar status 200.
2. Executar login em `POST /auth/login` e validar retorno de token.
3. Executar `GET /empresas/1/produtos` sem token para evidenciar rota publica.
4. Demonstrar fluxo WhatsApp ate `pronto_para_criar_pedido` e confirmacao final com criacao de pedido.
5. Demonstrar idempotencia do webhook com mesmo `id_externo` (segunda chamada como `duplicado`).
6. Demonstrar hardening do webhook:
   - assinatura invalida retorna 401,
   - excesso de chamadas retorna 429.
7. Mostrar evidencia da suite cumulativa executada 2x consecutivas com 100% verde.

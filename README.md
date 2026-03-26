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

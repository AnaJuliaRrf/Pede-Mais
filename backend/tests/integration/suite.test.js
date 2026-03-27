const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../src/app");
const pedidoModel = require("../../src/models/pedidoModel");
const {
  db,
  TEST_PREFIX,
  TEST_CATEGORY,
  TEST_USERS,
  ensureBaseData,
  cleanupTestData,
} = require("../helpers/testData");
const {
  authHeader,
  login,
  getTokenEmpresa1,
  getTokenEmpresa2,
  buildExpiredToken,
} = require("../helpers/auth");

function buildProdutoPayload(overrides = {}) {
  return {
    nome: `${TEST_PREFIX} Pizza Calabresa`,
    descricao: "Pizza clássica de teste",
    preco: 45.5,
    categoria: TEST_CATEGORY,
    ativo: true,
    ...overrides,
  };
}

function buildPedidoPayload(produtoId, overrides = {}) {
  return {
    cliente_nome: `${TEST_PREFIX} João`,
    telefone: "11987654321",
    tipo_recebimento: "entrega",
    endereco: `${TEST_PREFIX} Rua X, 123`,
    forma_pagamento: "dinheiro",
    troco_para: 100,
    itens: [{ produto_id: produtoId, quantidade: 2 }],
    ...overrides,
  };
}

async function createProdutoAutenticado(token, empresaId = 1, overrides = {}) {
  const response = await request(app)
    .post(`/empresas/${empresaId}/produtos`)
    .set(authHeader(token))
    .send(buildProdutoPayload(overrides));

  return response;
}

async function patchEstoque(token, produtoId, payload, empresaId = 1) {
  return request(app)
    .patch(`/empresas/${empresaId}/estoque/${produtoId}`)
    .set(authHeader(token))
    .send(payload);
}

async function createPedido(empresaId, payload) {
  return request(app).post(`/empresas/${empresaId}/pedidos`).send(payload);
}

function buildSuperadminToken({ userId = 9999 } = {}) {
  const secret = process.env.JWT_SECRET || "test_secret_jwt";

  return jwt.sign({ empresa_id: 1, perfil: "superadmin" }, secret, {
    subject: String(userId),
    expiresIn: "1h",
  });
}

beforeAll(async () => {
  await cleanupTestData();
  await ensureBaseData();
});

beforeEach(async () => {
  await cleanupTestData();
  await ensureBaseData();
});

afterAll(async () => {
  await cleanupTestData();
  await db.end();
});

describe("PASSO 1 - Bootstrap Express", () => {
  test("1.1 GET /health retorna 200 e {ok:true}", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  test("1.2 /health responde sem erro de conexão", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
  });
});

describe("PASSO 2 - CRUD Produtos", () => {
  test("2.1 cria produto válido", async () => {
    const token = await getTokenEmpresa1();

    const response = await createProdutoAutenticado(token);

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
  });

  test("2.2 retorna 400 quando nome falta", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .post("/empresas/1/produtos")
      .set(authHeader(token))
      .send({ preco: 30 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("nome é obrigatório");
  });

  test("2.3 retorna 400 quando preço é negativo", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .post("/empresas/1/produtos")
      .set(authHeader(token))
      .send({ nome: `${TEST_PREFIX} Test`, preco: -10 });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("preco");
  });

  test("2.4 lista produtos da empresa", async () => {
    const token = await getTokenEmpresa1();
    await createProdutoAutenticado(token);

    const response = await request(app).get("/empresas/1/produtos");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("2.5 atualiza produto", async () => {
    const token = await getTokenEmpresa1();
    const created = await createProdutoAutenticado(token);

    const response = await request(app)
      .put(`/empresas/1/produtos/${created.body.id}`)
      .set(authHeader(token))
      .send(
        buildProdutoPayload({
          nome: `${TEST_PREFIX} Pizza Especial`,
          preco: 55,
        }),
      );

    expect(response.status).toBe(200);
    expect(response.body.nome).toContain("Pizza Especial");
  });

  test("2.6 remove produto", async () => {
    const token = await getTokenEmpresa1();
    const created = await createProdutoAutenticado(token);

    const response = await request(app)
      .delete(`/empresas/1/produtos/${created.body.id}`)
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "produto removido com sucesso" });
  });

  test("2.7 multiempresa retorna array vazio para empresa sem produtos", async () => {
    const response = await request(app).get("/empresas/999/produtos");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("PASSO 3 - Estoque", () => {
  test("3.1 lista estoque", async () => {
    const token = await getTokenEmpresa1();
    const created = await createProdutoAutenticado(token);
    await patchEstoque(token, created.body.id, { quantidade: 20 });

    const response = await request(app)
      .get("/empresas/1/estoque")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("3.2 atualiza quantidade", async () => {
    const token = await getTokenEmpresa1();
    const created = await createProdutoAutenticado(token);

    const response = await patchEstoque(token, created.body.id, {
      quantidade: 50,
    });

    expect(response.status).toBe(200);
    expect(response.body.quantidade).toBe(50);
  });

  test("3.3 atualiza estoque mínimo", async () => {
    const token = await getTokenEmpresa1();
    const created = await createProdutoAutenticado(token);

    const response = await patchEstoque(token, created.body.id, {
      estoque_minimo: 10,
    });

    expect(response.status).toBe(200);
    expect(response.body.estoque_minimo).toBe(10);
  });

  test("3.4 quantidade negativa retorna 400", async () => {
    const token = await getTokenEmpresa1();
    const created = await createProdutoAutenticado(token);

    const response = await patchEstoque(token, created.body.id, {
      quantidade: -5,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("quantidade");
  });

  test("3.5 produto inexistente retorna 404", async () => {
    const token = await getTokenEmpresa1();

    const response = await patchEstoque(token, 999999, { quantidade: 10 });

    expect(response.status).toBe(404);
  });

  test("3.6 lista estoque baixo", async () => {
    const token = await getTokenEmpresa1();

    const baixo = await createProdutoAutenticado(token, 1, {
      nome: `${TEST_PREFIX} Baixo`,
    });
    const alto = await createProdutoAutenticado(token, 1, {
      nome: `${TEST_PREFIX} Alto`,
    });

    await patchEstoque(token, baixo.body.id, {
      quantidade: 5,
      estoque_minimo: 10,
    });
    await patchEstoque(token, alto.body.id, {
      quantidade: 100,
      estoque_minimo: 10,
    });

    const response = await request(app)
      .get("/empresas/1/estoque/baixo")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(
      response.body.some((item) => item.produto_id === baixo.body.id),
    ).toBe(true);
    expect(response.body.some((item) => item.produto_id === alto.body.id)).toBe(
      false,
    );
  });
});

describe("PASSO 4 - Pedidos + transação", () => {
  async function prepararProdutoComEstoque(token, quantidade = 100) {
    const created = await createProdutoAutenticado(token);
    await patchEstoque(token, created.body.id, {
      quantidade,
      estoque_minimo: 5,
    });
    return created.body.id;
  }

  test("4.0 criação de pedido permanece pública (sem token)", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 100);

    const response = await createPedido(1, buildPedidoPayload(produtoId));

    expect(response.status).toBe(201);
  });

  test("4.1 cria pedido entrega válido", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 100);

    const response = await createPedido(1, buildPedidoPayload(produtoId));

    expect(response.status).toBe(201);
    expect(response.body.valor_total).toBe(91);
    expect(response.body.itens[0].subtotal).toBe(91);
  });

  test("4.2 cria pedido retirada válido", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 100);

    const response = await createPedido(
      1,
      buildPedidoPayload(produtoId, {
        tipo_recebimento: "retirada",
        endereco: undefined,
      }),
    );

    expect(response.status).toBe(201);
    expect(response.body.tipo_recebimento).toBe("retirada");
  });

  test("4.3 estoque insuficiente retorna 400", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 100);

    const response = await createPedido(
      1,
      buildPedidoPayload(produtoId, {
        itens: [{ produto_id: produtoId, quantidade: 200 }],
      }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("estoque insuficiente");
  });

  test("4.4 valida campos obrigatórios e formato", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 100);

    const casos = [
      [
        { ...buildPedidoPayload(produtoId), cliente_nome: "" },
        400,
        "cliente_nome",
      ],
      [{ ...buildPedidoPayload(produtoId), telefone: "" }, 400, "telefone"],
      [
        { ...buildPedidoPayload(produtoId), tipo_recebimento: "xyz" },
        400,
        "tipo_recebimento",
      ],
      [
        {
          ...buildPedidoPayload(produtoId),
          endereco: "",
          tipo_recebimento: "entrega",
        },
        400,
        "endereco",
      ],
      [
        { ...buildPedidoPayload(produtoId), forma_pagamento: "bitcoin" },
        400,
        "forma_pagamento",
      ],
      [
        { ...buildPedidoPayload(produtoId), troco_para: null },
        400,
        "troco_para",
      ],
      [{ ...buildPedidoPayload(produtoId), itens: [] }, 400, "itens"],
    ];

    for (const [payload, expectedStatus, expectedError] of casos) {
      const response = await createPedido(1, payload);
      expect(response.status).toBe(expectedStatus);
      expect(response.body.error).toContain(expectedError);
    }

    const produtoInexistente = await createPedido(
      1,
      buildPedidoPayload(999999, {
        itens: [{ produto_id: 999999, quantidade: 1 }],
      }),
    );

    expect(produtoInexistente.status).toBe(404);
  });

  test("4.5 lista pedidos", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 100);
    await createPedido(1, buildPedidoPayload(produtoId));

    const response = await request(app)
      .get("/empresas/1/pedidos")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("4.6 baixa estoque após pedido", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 100);
    await createPedido(1, buildPedidoPayload(produtoId));

    const estoqueResponse = await request(app)
      .get("/empresas/1/estoque")
      .set(authHeader(token));

    const item = estoqueResponse.body.find(
      (row) => row.produto_id === produtoId,
    );

    expect(estoqueResponse.status).toBe(200);
    expect(item.quantidade).toBe(98);
  });

  test("4.7 rollback completo quando falha após inserir pedido e itens", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 10);
    const clienteNome = `${TEST_PREFIX} Rollback Intermediario`;

    const [beforePedido] = await db.query(
      "SELECT COUNT(*) AS total FROM pedidos WHERE cliente_nome = ?",
      [clienteNome],
    );
    const [beforeItens] = await db.query(
      "SELECT COUNT(*) AS total FROM itens_pedido WHERE produto_id = ?",
      [produtoId],
    );
    const [beforeEstoqueRows] = await db.query(
      "SELECT quantidade FROM estoque WHERE produto_id = ? LIMIT 1",
      [produtoId],
    );

    const estoqueAntes = Number(beforeEstoqueRows[0]?.quantidade ?? 0);

    const spyBaixaEstoque = jest
      .spyOn(pedidoModel, "baixarEstoque")
      .mockImplementationOnce(async () => {
        throw new Error("falha intermediaria simulada");
      });

    try {
      const response = await createPedido(
        1,
        buildPedidoPayload(produtoId, { cliente_nome: clienteNome }),
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("erro interno do servidor");
    } finally {
      spyBaixaEstoque.mockRestore();
    }

    const [afterPedido] = await db.query(
      "SELECT COUNT(*) AS total FROM pedidos WHERE cliente_nome = ?",
      [clienteNome],
    );
    const [afterItens] = await db.query(
      "SELECT COUNT(*) AS total FROM itens_pedido WHERE produto_id = ?",
      [produtoId],
    );
    const [afterEstoqueRows] = await db.query(
      "SELECT quantidade FROM estoque WHERE produto_id = ? LIMIT 1",
      [produtoId],
    );

    const estoqueDepois = Number(afterEstoqueRows[0]?.quantidade ?? 0);

    expect(afterPedido[0].total).toBe(beforePedido[0].total);
    expect(afterItens[0].total).toBe(beforeItens[0].total);
    expect(estoqueDepois).toBe(estoqueAntes);
  });

  test("4.8 concorrencia no mesmo estoque evita over-selling", async () => {
    const token = await getTokenEmpresa1();
    const produtoId = await prepararProdutoComEstoque(token, 1);

    const payloadA = buildPedidoPayload(produtoId, {
      cliente_nome: `${TEST_PREFIX} Concorrencia A`,
      itens: [{ produto_id: produtoId, quantidade: 1 }],
    });
    const payloadB = buildPedidoPayload(produtoId, {
      cliente_nome: `${TEST_PREFIX} Concorrencia B`,
      itens: [{ produto_id: produtoId, quantidade: 1 }],
    });

    const [responseA, responseB] = await Promise.all([
      createPedido(1, payloadA),
      createPedido(1, payloadB),
    ]);

    const statusOrdenados = [responseA.status, responseB.status].sort(
      (a, b) => a - b,
    );
    expect(statusOrdenados).toEqual([201, 400]);

    const falha = [responseA, responseB].find(
      (response) => response.status === 400,
    );
    expect(falha.body.error).toContain("estoque insuficiente");

    const [estoqueRows] = await db.query(
      "SELECT quantidade FROM estoque WHERE produto_id = ? LIMIT 1",
      [produtoId],
    );
    const estoqueFinal = Number(estoqueRows[0]?.quantidade ?? 0);

    expect(estoqueFinal).toBe(0);
    expect(estoqueFinal).toBeGreaterThanOrEqual(0);

    const [pedidoCountRows] = await db.query(
      "SELECT COUNT(*) AS total FROM pedidos WHERE cliente_nome IN (?, ?)",
      [payloadA.cliente_nome, payloadB.cliente_nome],
    );

    expect(pedidoCountRows[0].total).toBe(1);
  });
});

describe("PASSO 5 - Status de pedido", () => {
  async function criarPedidoPendente() {
    const token = await getTokenEmpresa1();
    const produto = await createProdutoAutenticado(token);
    await patchEstoque(token, produto.body.id, {
      quantidade: 50,
      estoque_minimo: 5,
    });
    const pedido = await createPedido(1, buildPedidoPayload(produto.body.id));
    return { token, pedidoId: pedido.body.id };
  }

  test("5.1 atualiza para em_preparo", async () => {
    const { token, pedidoId } = await criarPedidoPendente();

    const response = await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "em_preparo" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("em_preparo");
  });

  test("5.2 transição em_preparo -> saiu_para_entrega", async () => {
    const { token, pedidoId } = await criarPedidoPendente();

    await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "em_preparo" });

    const response = await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "saiu_para_entrega" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("saiu_para_entrega");
  });

  test("5.3 transição saiu_para_entrega -> entregue", async () => {
    const { token, pedidoId } = await criarPedidoPendente();

    await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "em_preparo" });
    await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "saiu_para_entrega" });

    const response = await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "entregue" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("entregue");
  });

  test("5.4 bloqueia transição inválida entregue -> cancelado", async () => {
    const { token, pedidoId } = await criarPedidoPendente();

    await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "em_preparo" });
    await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "saiu_para_entrega" });
    await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "entregue" });

    const response = await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "cancelado" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("transição de status inválida");
  });

  test("5.5 bloqueia pulo de status pendente -> entregue", async () => {
    const { token, pedidoId } = await criarPedidoPendente();

    const response = await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "entregue" });

    expect(response.status).toBe(400);
  });

  test("5.6 status inválido retorna 400", async () => {
    const { token, pedidoId } = await criarPedidoPendente();

    const response = await request(app)
      .patch(`/empresas/1/pedidos/${pedidoId}/status`)
      .set(authHeader(token))
      .send({ status: "xyz" });

    expect(response.status).toBe(400);
  });

  test("5.7 pedido inexistente retorna 404", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/pedidos/999999/status")
      .set(authHeader(token))
      .send({ status: "em_preparo" });

    expect(response.status).toBe(404);
  });

  test("5.8 empresa diferente sem permissão retorna 403", async () => {
    const { pedidoId } = await criarPedidoPendente();
    const tokenEmpresa2 = await getTokenEmpresa2();

    const response = await request(app)
      .patch(`/empresas/999/pedidos/${pedidoId}/status`)
      .set(authHeader(tokenEmpresa2))
      .send({ status: "em_preparo" });

    expect(response.status).toBe(403);
  });
});

describe("PASSO 6 - Detalhe + filtros", () => {
  async function criarPedidosParaFiltro() {
    const token = await getTokenEmpresa1();
    const produto = await createProdutoAutenticado(token);
    await patchEstoque(token, produto.body.id, {
      quantidade: 200,
      estoque_minimo: 5,
    });

    const pedidoPendente = await createPedido(
      1,
      buildPedidoPayload(produto.body.id),
    );

    const pedidoEmPreparo = await createPedido(
      1,
      buildPedidoPayload(produto.body.id, {
        cliente_nome: `${TEST_PREFIX} Maria`,
      }),
    );

    await request(app)
      .patch(`/empresas/1/pedidos/${pedidoEmPreparo.body.id}/status`)
      .set(authHeader(token))
      .send({ status: "em_preparo" });

    return {
      token,
      pedidoPendenteId: pedidoPendente.body.id,
      pedidoEmPreparoId: pedidoEmPreparo.body.id,
    };
  }

  test("6.1 detalhe de pedido existente", async () => {
    const { token, pedidoPendenteId } = await criarPedidosParaFiltro();

    const response = await request(app)
      .get(`/empresas/1/pedidos/${pedidoPendenteId}`)
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.itens)).toBe(true);
    expect(response.body.itens.length).toBeGreaterThan(0);
  });

  test("6.2 detalhe inexistente retorna 404", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .get("/empresas/1/pedidos/999999")
      .set(authHeader(token));

    expect(response.status).toBe(404);
  });

  test("6.3 lista sem filtros", async () => {
    const { token } = await criarPedidosParaFiltro();

    const response = await request(app)
      .get("/empresas/1/pedidos")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("6.4 filtra por status", async () => {
    const { token, pedidoEmPreparoId } = await criarPedidosParaFiltro();

    const response = await request(app)
      .get("/empresas/1/pedidos?status=em_preparo")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(
      response.body.every((pedido) => pedido.status === "em_preparo"),
    ).toBe(true);
    expect(
      response.body.some((pedido) => pedido.id === pedidoEmPreparoId),
    ).toBe(true);
  });

  test("6.5 status inválido em filtro retorna 400", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .get("/empresas/1/pedidos?status=xyz")
      .set(authHeader(token));

    expect(response.status).toBe(400);
  });

  test("6.6 filtra por intervalo de datas", async () => {
    const { token, pedidoPendenteId } = await criarPedidosParaFiltro();

    await db.query("UPDATE pedidos SET criado_em = ? WHERE id = ?", [
      "2026-03-22 12:00:00",
      pedidoPendenteId,
    ]);

    const response = await request(app)
      .get("/empresas/1/pedidos?data_inicio=2026-03-20&data_fim=2026-03-24")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.some((pedido) => pedido.id === pedidoPendenteId)).toBe(
      true,
    );
  });

  test("6.7 data inválida retorna 400", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .get("/empresas/1/pedidos?data_inicio=abc")
      .set(authHeader(token));

    expect(response.status).toBe(400);
  });

  test("6.8 filtros combinados (status + data)", async () => {
    const { token, pedidoPendenteId } = await criarPedidosParaFiltro();

    await db.query("UPDATE pedidos SET criado_em = ? WHERE id = ?", [
      "2026-03-21 10:00:00",
      pedidoPendenteId,
    ]);

    const response = await request(app)
      .get(
        "/empresas/1/pedidos?status=pendente&data_inicio=2026-03-20&data_fim=2026-03-24",
      )
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.every((pedido) => pedido.status === "pendente")).toBe(
      true,
    );
  });
});

describe("PASSO 7 - Configurações da empresa", () => {
  test("7.1 busca configurações", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .get("/empresas/1/configuracoes")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.empresa_id).toBe(1);
    expect(response.body.formas_pagamento_aceitas).toEqual([
      "dinheiro",
      "cartao",
      "pix",
    ]);
  });

  test("7.2 rota protegida sem permissão retorna 403", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .get("/empresas/999999/configuracoes")
      .set(authHeader(token));

    expect(response.status).toBe(403);
  });

  test("7.9 com permissão e empresa inexistente retorna 404", async () => {
    const superadminToken = buildSuperadminToken();

    const response = await request(app)
      .get("/empresas/999999/configuracoes")
      .set(authHeader(superadminToken));

    expect(response.status).toBe(404);
  });

  test("7.3 atualiza taxa_entrega", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/configuracoes")
      .set(authHeader(token))
      .send({ taxa_entrega: 15 });

    expect(response.status).toBe(200);
    expect(response.body.taxa_entrega).toBe(15);
  });

  test("7.4 taxa negativa retorna 400", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/configuracoes")
      .set(authHeader(token))
      .send({ taxa_entrega: -5 });

    expect(response.status).toBe(400);
  });

  test("7.5 bloqueia aceita_entrega e aceita_retirada ambos false", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/configuracoes")
      .set(authHeader(token))
      .send({ aceita_entrega: false, aceita_retirada: false });

    expect(response.status).toBe(400);
  });

  test("7.6 atualiza horários válidos", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/configuracoes")
      .set(authHeader(token))
      .send({ horario_abertura: "08:00:00", horario_fechamento: "22:00:00" });

    expect(response.status).toBe(200);
    expect(response.body.horario_abertura).toBe("08:00:00");
  });

  test("7.7 horário inválido retorna 400", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/configuracoes")
      .set(authHeader(token))
      .send({ horario_abertura: "25:00:00" });

    expect(response.status).toBe(400);
  });

  test("7.8 atualiza múltiplos campos", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/configuracoes")
      .set(authHeader(token))
      .send({
        taxa_entrega: 12,
        telefone: "11988887777",
        endereco: `${TEST_PREFIX} Endereço atualizado`,
      });

    expect(response.status).toBe(200);
    expect(response.body.taxa_entrega).toBe(12);
    expect(response.body.telefone).toBe("11988887777");
  });
});

describe("PASSO 8 - Auth + JWT", () => {
  test("8.1 login válido retorna token e usuário", async () => {
    const response = await login(TEST_USERS.empresa1.email);

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.usuario.email).toBe(TEST_USERS.empresa1.email);
  });

  test("8.2 login com email inexistente retorna 401", async () => {
    const response = await login("inexistente@itest.pedemais.local");

    expect(response.status).toBe(401);
  });

  test("8.3 login com senha errada retorna 401", async () => {
    const response = await login(TEST_USERS.empresa1.email, "senha_errada");

    expect(response.status).toBe(401);
  });

  test("8.4 login com email vazio retorna 400", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "", senha: "123456" });

    expect(response.status).toBe(400);
  });

  test("8.5 login com senha vazia retorna 400", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: TEST_USERS.empresa1.email, senha: "" });

    expect(response.status).toBe(400);
  });

  test("8.6 GET produtos sem token permanece público", async () => {
    const response = await request(app).get("/empresas/1/produtos");

    expect(response.status).toBe(200);
  });

  test("8.7 POST produtos sem token retorna 401", async () => {
    const response = await request(app)
      .post("/empresas/1/produtos")
      .send(buildProdutoPayload());

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("token ausente");
  });

  test("8.8 POST produtos com token válido retorna 201", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .post("/empresas/1/produtos")
      .set(authHeader(token))
      .send(buildProdutoPayload());

    expect(response.status).toBe(201);
  });

  test("8.9 token fake retorna 401", async () => {
    const response = await request(app)
      .post("/empresas/1/produtos")
      .set(authHeader("token_fake_xyz"))
      .send(buildProdutoPayload());

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("token inválido ou expirado");
  });

  test("8.10 token expirado retorna 401", async () => {
    const expiredToken = buildExpiredToken();

    const response = await request(app)
      .post("/empresas/1/produtos")
      .set(authHeader(expiredToken))
      .send(buildProdutoPayload());

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("token inválido ou expirado");
  });

  test("8.11 token de outra empresa retorna 403 no status do pedido", async () => {
    const tokenEmpresa1 = await getTokenEmpresa1();
    const tokenEmpresa2 = await getTokenEmpresa2();

    const produto = await createProdutoAutenticado(tokenEmpresa1);
    await patchEstoque(tokenEmpresa1, produto.body.id, { quantidade: 20 });
    const pedido = await createPedido(1, buildPedidoPayload(produto.body.id));

    const response = await request(app)
      .patch(`/empresas/1/pedidos/${pedido.body.id}/status`)
      .set(authHeader(tokenEmpresa2))
      .send({ status: "em_preparo" });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("acesso negado");
  });

  test("8.12 GET estoque com token válido", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .get("/empresas/1/estoque")
      .set(authHeader(token));

    expect(response.status).toBe(200);
  });

  test("8.13 PATCH estoque com token válido", async () => {
    const token = await getTokenEmpresa1();
    const produto = await createProdutoAutenticado(token);

    const response = await patchEstoque(token, produto.body.id, {
      quantidade: 25,
    });

    expect(response.status).toBe(200);
  });

  test("8.14 GET configurações com token válido", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .get("/empresas/1/configuracoes")
      .set(authHeader(token));

    expect(response.status).toBe(200);
  });

  test("8.15 PATCH configurações com token válido", async () => {
    const token = await getTokenEmpresa1();

    const response = await request(app)
      .patch("/empresas/1/configuracoes")
      .set(authHeader(token))
      .send({ taxa_entrega: 9 });

    expect(response.status).toBe(200);
  });
});

describe("PASSO 9 - Webhook WhatsApp (fundação)", () => {
  beforeAll(() => {
    process.env.WHATSAPP_VERIFY_TOKEN =
      process.env.WHATSAPP_VERIFY_TOKEN || "test_verify_token";
  });

  test("9.1 handshake válido retorna challenge", async () => {
    const response = await request(app).get("/webhook/whatsapp").query({
      "hub.mode": "subscribe",
      "hub.verify_token": process.env.WHATSAPP_VERIFY_TOKEN,
      "hub.challenge": "12345",
    });

    expect(response.status).toBe(200);
    expect(response.text).toBe("12345");
  });

  test("9.2 handshake inválido retorna 403", async () => {
    const response = await request(app).get("/webhook/whatsapp").query({
      "hub.mode": "subscribe",
      "hub.verify_token": "token_invalido",
      "hub.challenge": "12345",
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("verificação inválida");
  });

  test("9.3 evento válido é persistido e marcado como processado", async () => {
    const idExterno = `${TEST_PREFIX}-WA-VALIDO-${Date.now()}`;
    const payload = {
      empresa_id: 1,
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: idExterno,
                    from: "5511999999999",
                    text: { body: "oi" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const response = await request(app).post("/webhook/whatsapp").send(payload);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("processado");
    expect(response.body.id_externo).toBe(idExterno);

    const [rows] = await db.query(
      `SELECT id_externo, empresa_id, telefone_origem, status_processamento
       FROM whatsapp_eventos
       WHERE id_externo = ?
       LIMIT 1`,
      [idExterno],
    );

    expect(rows.length).toBe(1);
    expect(rows[0].id_externo).toBe(idExterno);
    expect(Number(rows[0].empresa_id)).toBe(1);
    expect(rows[0].telefone_origem).toBe("5511999999999");
    expect(rows[0].status_processamento).toBe("processado");
  });

  test("9.4 evento duplicado não gera novo processamento", async () => {
    const idExterno = `${TEST_PREFIX}-WA-DUP-${Date.now()}`;
    const payload = {
      empresa_id: 1,
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: idExterno,
                    from: "5511888888888",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const primeira = await request(app).post("/webhook/whatsapp").send(payload);
    const duplicada = await request(app)
      .post("/webhook/whatsapp")
      .send(payload);

    expect(primeira.status).toBe(200);
    expect(primeira.body.status).toBe("processado");
    expect(duplicada.status).toBe(200);
    expect(duplicada.body.status).toBe("duplicado");

    const [countRows] = await db.query(
      "SELECT COUNT(*) AS total FROM whatsapp_eventos WHERE id_externo = ?",
      [idExterno],
    );

    const [statusRows] = await db.query(
      "SELECT status_processamento FROM whatsapp_eventos WHERE id_externo = ? LIMIT 1",
      [idExterno],
    );

    expect(countRows[0].total).toBe(1);
    expect(statusRows[0].status_processamento).toBe("duplicado");
  });

  test("9.5 payload inválido retorna 400 e registra auditoria", async () => {
    const payloadInvalido = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "5511777777777",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post("/webhook/whatsapp")
      .send(payloadInvalido);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("payload inválido");

    const [rows] = await db.query(
      `SELECT status_processamento, telefone_origem
       FROM whatsapp_eventos
       WHERE status_processamento = 'invalido'
         AND telefone_origem = ?
       ORDER BY id DESC
       LIMIT 1`,
      ["5511777777777"],
    );

    expect(rows.length).toBe(1);
    expect(rows[0].status_processamento).toBe("invalido");
    expect(rows[0].telefone_origem).toBe("5511777777777");
  });
});

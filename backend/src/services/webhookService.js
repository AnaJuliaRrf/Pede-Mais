const webhookModel = require("../models/webhookModel");
const configuracaoService = require("./configuracaoService");
const pedidoModel = require("../models/pedidoModel");
const crypto = require("crypto");

const rateLimitState = new Map();

function getVerifyToken() {
  return (
    process.env.WEBHOOK_VERIFY_TOKEN ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    "test_verify_token"
  );
}

function getWebhookRateLimitConfig() {
  const parsedWindow = Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS);
  const parsedMax = Number(process.env.WEBHOOK_RATE_LIMIT_MAX);

  const windowMs =
    Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 60000;
  const max = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 0;

  return { windowMs, max };
}

function applyRateLimit(origin) {
  const { windowMs, max } = getWebhookRateLimitConfig();
  if (!max) {
    return { blocked: false };
  }

  const now = Date.now();
  const key = String(origin || "desconhecida");
  const current = rateLimitState.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitState.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { blocked: false };
  }

  if (current.count >= max) {
    return { blocked: true, retryAfterMs: current.resetAt - now };
  }

  current.count += 1;
  rateLimitState.set(key, current);
  return { blocked: false };
}

function timingSafeEqualsHex(expectedHex, receivedHex) {
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

function isValidSignature({ headers = {}, rawBody = "" }) {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return { valid: true, skipped: true };
  }

  const signatureHeaderRaw =
    headers["x-hub-signature-256"] || headers["X-Hub-Signature-256"];

  const signatureHeader =
    typeof signatureHeaderRaw === "string" ? signatureHeaderRaw.trim() : "";

  if (!signatureHeader.startsWith("sha256=")) {
    return { valid: false };
  }

  const receivedHex = signatureHeader.replace("sha256=", "");
  if (!/^[a-fA-F0-9]+$/.test(receivedHex)) {
    return { valid: false };
  }

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(rawBody || "", "utf8")
    .digest("hex");

  return { valid: timingSafeEqualsHex(expectedHex, receivedHex) };
}

function logStructured(eventName, data = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    component: "webhook_whatsapp",
    event: eventName,
    ...data,
  };

  console.log(JSON.stringify(payload));
}

const ESTADOS = {
  AGUARDANDO_NOME: "aguardando_nome",
  AGUARDANDO_ITEM_MENU: "aguardando_item_menu",
  AGUARDANDO_QUANTIDADE_ITEM: "aguardando_quantidade_item",
  AGUARDANDO_MAIS_ITENS: "aguardando_mais_itens",
  PRONTO_PARA_CONFIRMACAO: "pronto_para_confirmacao",
  AGUARDANDO_TIPO_RECEBIMENTO: "aguardando_tipo_recebimento",
  AGUARDANDO_ENDERECO_ENTREGA: "aguardando_endereco_entrega",
  AGUARDANDO_CONFIRMACAO_ENDERECO: "aguardando_confirmacao_endereco",
  AGUARDANDO_FORMA_PAGAMENTO: "aguardando_forma_pagamento",
  AGUARDANDO_NECESSIDADE_TROCO: "aguardando_necessidade_troco",
  AGUARDANDO_TROCO_PARA: "aguardando_troco_para",
  PRONTO_PARA_CRIAR_PEDIDO: "pronto_para_criar_pedido",
  AGUARDANDO_TRATATIVA_ESTOQUE: "aguardando_tratativa_estoque",
  CONCLUIDO: "concluido",
};

function verifyChallenge(query) {
  const mode =
    typeof query["hub.mode"] === "string" ? query["hub.mode"].trim() : "";
  const verifyToken =
    typeof query["hub.verify_token"] === "string"
      ? query["hub.verify_token"].trim()
      : "";
  const challenge =
    typeof query["hub.challenge"] === "string" ? query["hub.challenge"] : "";

  const expectedToken = getVerifyToken();

  if (mode !== "subscribe" || !challenge || verifyToken !== expectedToken) {
    return { status: 403, error: "verificação inválida" };
  }

  return { challenge };
}

function extractEventData(payload) {
  const safePayload = payload && typeof payload === "object" ? payload : null;
  if (!safePayload) {
    return {
      invalid: true,
      empresa_id: null,
      telefone_origem: null,
      id_externo: null,
    };
  }

  const entry = Array.isArray(safePayload.entry) ? safePayload.entry[0] : null;
  const change =
    entry && Array.isArray(entry.changes) ? entry.changes[0] : null;
  const value = change?.value || null;
  const message =
    value && Array.isArray(value.messages) ? value.messages[0] : null;

  const rawIdExterno =
    safePayload.id_externo || safePayload.event_id || message?.id || null;

  const id_externo =
    typeof rawIdExterno === "string" && rawIdExterno.trim()
      ? rawIdExterno.trim()
      : null;

  const rawTelefone = safePayload.telefone_origem || message?.from || null;
  const telefone_origem =
    typeof rawTelefone === "string" && rawTelefone.trim()
      ? rawTelefone.trim()
      : null;

  const empresaBruta = safePayload.empresa_id;
  const empresaNumero = Number(empresaBruta);
  const empresa_id =
    Number.isInteger(empresaNumero) && empresaNumero > 0 ? empresaNumero : null;

  const textoMensagem =
    typeof safePayload.mensagem === "string"
      ? safePayload.mensagem.trim()
      : typeof message?.text?.body === "string"
        ? message.text.body.trim()
        : "";

  return {
    invalid: !id_externo,
    id_externo,
    empresa_id,
    telefone_origem,
    texto_mensagem: textoMensagem,
  };
}

function parsePositiveInteger(texto) {
  if (!/^\d+$/.test(texto || "")) {
    return null;
  }

  const numero = Number(texto);
  if (!Number.isInteger(numero) || numero <= 0) {
    return null;
  }

  return numero;
}

function buildMenuText(produtos) {
  if (!produtos.length) {
    return "No momento não há itens ativos no cardápio.";
  }

  const linhas = produtos.map(
    (produto, index) =>
      `${index + 1} - ${produto.nome} (R$ ${Number(produto.preco).toFixed(2)})`,
  );

  return `Cardápio:\n${linhas.join("\n")}\nDigite o número do item desejado.`;
}

function buildPreResumo(nomeCliente, itens) {
  const linhasItens = itens.map((item, index) => {
    const subtotal = Number(item.preco_unitario) * Number(item.quantidade);
    return `${index + 1}. ${item.produto_nome} x${item.quantidade} = R$ ${subtotal.toFixed(2)}`;
  });

  const total = itens.reduce(
    (acc, item) => acc + Number(item.preco_unitario) * Number(item.quantidade),
    0,
  );

  return [
    `Perfeito, ${nomeCliente || "cliente"}.`,
    "Pré-resumo do seu pedido:",
    ...linhasItens,
    `Total parcial: R$ ${total.toFixed(2)}`,
    "No próximo passo vamos confirmar os detalhes finais.",
  ].join("\n");
}

function buildFormasPagamentoText(formas) {
  const linhas = formas.map((forma, index) => `${index + 1} - ${forma}`);

  return `Escolha a forma de pagamento:\n${linhas.join("\n")}`;
}

function parseMoneyValue(texto) {
  const normalized = String(texto || "")
    .trim()
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Number(value.toFixed(2));
}

async function getEmpresaConfig(empresaId) {
  const result = await configuracaoService.getConfiguracoes(empresaId);
  if (result.error) {
    return null;
  }

  const formas = Array.isArray(result.data.formas_pagamento_aceitas)
    ? result.data.formas_pagamento_aceitas
    : ["dinheiro", "cartao", "pix"];

  return {
    aceita_entrega: Boolean(result.data.aceita_entrega),
    aceita_retirada: Boolean(result.data.aceita_retirada),
    formas_pagamento_aceitas: formas,
  };
}

function buildPreResumoCompleto(sessao, itens) {
  const base = buildPreResumo(sessao.nome_cliente, itens);
  const detalhes = [
    `Forma de recebimento: ${sessao.tipo_recebimento || "não definida"}`,
  ];

  if (sessao.tipo_recebimento === "entrega") {
    detalhes.push(`Endereço: ${sessao.endereco || "não informado"}`);
  }

  detalhes.push(`Pagamento: ${sessao.forma_pagamento || "não definido"}`);

  if (sessao.forma_pagamento === "dinheiro") {
    if (Number(sessao.precisa_troco) === 1) {
      detalhes.push(
        `Troco para: R$ ${Number(sessao.troco_para || 0).toFixed(2)}`,
      );
    } else {
      detalhes.push("Troco: não");
    }
  }

  return `Pré-resumo final:\n${base}\n${detalhes.join("\n")}\nResponda 1 para confirmar o pedido.`;
}

function buildResumoConclusao({ pedidoId, valorTotal }) {
  return [
    `Pedido confirmado com sucesso! Número do pedido: ${pedidoId}.`,
    `Valor total: R$ ${Number(valorTotal).toFixed(2)}`,
  ].join("\n");
}

function buildMensagemEstoqueInsuficiente({
  produtoNome,
  solicitado,
  disponivel,
}) {
  return [
    `Estoque insuficiente para ${produtoNome}. Solicitado: ${solicitado}, disponível: ${disponivel}.`,
    "Escolha como deseja continuar:",
    "1 - Ajustar automaticamente para o disponível",
    "2 - Remover item",
    "3 - Cancelar finalização",
  ].join("\n");
}

async function finalizarPedidoDefinitivo(sessao, empresaId) {
  if (!Number.isInteger(Number(empresaId)) || Number(empresaId) <= 0) {
    return { invalidEmpresa: true };
  }

  const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(sessao.id);
  if (!itensCarrinho.length) {
    return { carrinhoVazio: true };
  }

  const connection = await pedidoModel.getConnection();

  try {
    await connection.beginTransaction();

    const itensCalculados = [];
    let valorTotal = 0;

    for (const item of itensCarrinho) {
      const produto = await pedidoModel.findProdutoParaPedido(
        connection,
        empresaId,
        item.produto_id,
      );

      if (!produto || !produto.ativo) {
        await connection.rollback();
        return {
          indisponivel: true,
          produto_id: item.produto_id,
        };
      }

      const solicitado = Number(item.quantidade);
      const disponivel = Number(produto.quantidade_estoque);

      if (disponivel < solicitado) {
        await connection.rollback();
        return {
          estoqueInsuficiente: {
            produto_id: item.produto_id,
            produto_nome: item.produto_nome || produto.nome,
            solicitado,
            disponivel,
          },
        };
      }

      const precoUnitario = Number(produto.preco);
      const subtotal = precoUnitario * solicitado;
      valorTotal += subtotal;

      itensCalculados.push({
        produto_id: item.produto_id,
        quantidade: solicitado,
        preco_unitario: precoUnitario,
      });
    }

    if (!itensCalculados.length) {
      await connection.rollback();
      return { carrinhoVazio: true };
    }

    const pedidoId = await pedidoModel.insertPedido(connection, {
      empresa_id: Number(empresaId),
      cliente_nome: sessao.nome_cliente || "Cliente",
      telefone: sessao.telefone_origem,
      tipo_recebimento: sessao.tipo_recebimento,
      endereco: sessao.tipo_recebimento === "entrega" ? sessao.endereco : null,
      forma_pagamento: sessao.forma_pagamento,
      troco_para:
        sessao.forma_pagamento === "dinheiro" ? sessao.troco_para : null,
      valor_total: valorTotal,
    });

    await pedidoModel.insertItensPedido(connection, pedidoId, itensCalculados);

    for (const item of itensCalculados) {
      await pedidoModel.baixarEstoque(
        connection,
        item.produto_id,
        item.quantidade,
      );
    }

    await connection.commit();

    return {
      success: true,
      pedidoId,
      valorTotal,
    };
  } catch (error) {
    await connection.rollback();
    return { internalError: true };
  } finally {
    connection.release();
  }
}

async function resetSessaoInconsistente(sessaoId) {
  await webhookModel.clearCarrinhoBySessaoId(sessaoId);
  await webhookModel.updateSessaoById(sessaoId, {
    estado_atual: ESTADOS.AGUARDANDO_NOME,
    nome_cliente: null,
    item_menu_pendente: null,
    tipo_recebimento: null,
    endereco: null,
    endereco_confirmado: null,
    forma_pagamento: null,
    precisa_troco: null,
    troco_para: null,
    pedido_id_criado: null,
    estoque_produto_pendente: null,
    estoque_disponivel_pendente: null,
    ultima_opcao_estoque: null,
  });

  return {
    estado_atual: ESTADOS.AGUARDANDO_NOME,
    resposta:
      "Houve uma inconsistência na sessão. Vamos recomeçar com segurança. Qual é o seu nome?",
  };
}

async function processarEstado(sessao, empresaId, textoMensagem) {
  if (sessao.estado_atual === ESTADOS.CONCLUIDO) {
    return {
      estado_atual: ESTADOS.CONCLUIDO,
      resposta: `Seu pedido já foi confirmado anteriormente. Número: ${sessao.pedido_id_criado || "indisponível"}.`,
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_NOME) {
    const nome = (textoMensagem || "").trim();
    if (!nome) {
      return {
        estado_atual: ESTADOS.AGUARDANDO_NOME,
        resposta: "Por favor, informe seu nome para iniciarmos o atendimento.",
      };
    }

    await webhookModel.updateSessaoById(sessao.id, {
      nome_cliente: nome,
      estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
    });

    const produtos = await webhookModel.listProdutosAtivosByEmpresa(empresaId);
    return {
      estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
      resposta: `Prazer, ${nome}!\n${buildMenuText(produtos)}`,
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_ITEM_MENU) {
    const produtos = await webhookModel.listProdutosAtivosByEmpresa(empresaId);
    const escolha = parsePositiveInteger(textoMensagem);

    if (!escolha || escolha > produtos.length) {
      return {
        estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
        resposta: `Item inválido.\n${buildMenuText(produtos)}`,
      };
    }

    const produtoSelecionado = produtos[escolha - 1];

    await webhookModel.updateSessaoById(sessao.id, {
      estado_atual: ESTADOS.AGUARDANDO_QUANTIDADE_ITEM,
      item_menu_pendente: produtoSelecionado.id,
    });

    return {
      estado_atual: ESTADOS.AGUARDANDO_QUANTIDADE_ITEM,
      resposta: `Você escolheu ${produtoSelecionado.nome}. Informe a quantidade desejada (inteiro positivo).`,
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_QUANTIDADE_ITEM) {
    if (!sessao.item_menu_pendente) {
      return resetSessaoInconsistente(sessao.id);
    }

    const quantidade = parsePositiveInteger(textoMensagem);
    if (!quantidade) {
      return {
        estado_atual: ESTADOS.AGUARDANDO_QUANTIDADE_ITEM,
        resposta:
          "Quantidade inválida. Informe um número inteiro positivo para este item.",
      };
    }

    const produto = await webhookModel.findProdutoAtivoByEmpresaAndId(
      empresaId,
      sessao.item_menu_pendente,
    );

    if (!produto) {
      return resetSessaoInconsistente(sessao.id);
    }

    await webhookModel.upsertCarrinhoItem({
      sessao_id: sessao.id,
      produto_id: produto.id,
      quantidade,
      preco_unitario: produto.preco,
    });

    await webhookModel.updateSessaoById(sessao.id, {
      estado_atual: ESTADOS.AGUARDANDO_MAIS_ITENS,
      item_menu_pendente: null,
    });

    return {
      estado_atual: ESTADOS.AGUARDANDO_MAIS_ITENS,
      resposta: `Item ${produto.nome} adicionado ao carrinho.\nDeseja adicionar mais itens?\n1 - Sim\n2 - Não`,
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_MAIS_ITENS) {
    if (textoMensagem === "1") {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
      });

      const produtos =
        await webhookModel.listProdutosAtivosByEmpresa(empresaId);
      return {
        estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
        resposta: buildMenuText(produtos),
      };
    }

    if (textoMensagem === "2") {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.PRONTO_PARA_CONFIRMACAO,
      });

      const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(
        sessao.id,
      );
      return {
        estado_atual: ESTADOS.PRONTO_PARA_CONFIRMACAO,
        resposta: buildPreResumo(sessao.nome_cliente, itensCarrinho),
      };
    }

    return {
      estado_atual: ESTADOS.AGUARDANDO_MAIS_ITENS,
      resposta: "Opção inválida. Responda 1 para Sim ou 2 para Não.",
    };
  }

  if (sessao.estado_atual === ESTADOS.PRONTO_PARA_CONFIRMACAO) {
    const config = await getEmpresaConfig(empresaId);
    if (!config) {
      return resetSessaoInconsistente(sessao.id);
    }

    if (config.aceita_entrega && config.aceita_retirada) {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_TIPO_RECEBIMENTO,
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_TIPO_RECEBIMENTO,
        resposta: "Como você prefere receber?\n1 - Entrega\n2 - Retirada",
      };
    }

    if (config.aceita_entrega) {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_ENDERECO_ENTREGA,
        tipo_recebimento: "entrega",
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_ENDERECO_ENTREGA,
        resposta:
          "Esta empresa atende somente por entrega. Informe seu endereço completo.",
      };
    }

    await webhookModel.updateSessaoById(sessao.id, {
      estado_atual: ESTADOS.AGUARDANDO_FORMA_PAGAMENTO,
      tipo_recebimento: "retirada",
    });

    return {
      estado_atual: ESTADOS.AGUARDANDO_FORMA_PAGAMENTO,
      resposta: `Esta empresa atende somente retirada.\n${buildFormasPagamentoText(config.formas_pagamento_aceitas)}`,
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_TIPO_RECEBIMENTO) {
    const config = await getEmpresaConfig(empresaId);
    if (!config) {
      return resetSessaoInconsistente(sessao.id);
    }

    if (textoMensagem === "1" && config.aceita_entrega) {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_ENDERECO_ENTREGA,
        tipo_recebimento: "entrega",
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_ENDERECO_ENTREGA,
        resposta: "Perfeito. Informe seu endereço completo para entrega.",
      };
    }

    if (textoMensagem === "2" && config.aceita_retirada) {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_FORMA_PAGAMENTO,
        tipo_recebimento: "retirada",
        endereco: null,
        endereco_confirmado: null,
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_FORMA_PAGAMENTO,
        resposta: buildFormasPagamentoText(config.formas_pagamento_aceitas),
      };
    }

    return {
      estado_atual: ESTADOS.AGUARDANDO_TIPO_RECEBIMENTO,
      resposta: "Opção inválida. Escolha 1 para Entrega ou 2 para Retirada.",
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_ENDERECO_ENTREGA) {
    const endereco = (textoMensagem || "").trim();

    if (!endereco) {
      return {
        estado_atual: ESTADOS.AGUARDANDO_ENDERECO_ENTREGA,
        resposta:
          "Endereço inválido. Informe o endereço completo para entrega.",
      };
    }

    await webhookModel.updateSessaoById(sessao.id, {
      estado_atual: ESTADOS.AGUARDANDO_CONFIRMACAO_ENDERECO,
      endereco,
      endereco_confirmado: 0,
    });

    return {
      estado_atual: ESTADOS.AGUARDANDO_CONFIRMACAO_ENDERECO,
      resposta: `Confirma este endereço?\n${endereco}\n1 - Sim\n2 - Alterar`,
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_CONFIRMACAO_ENDERECO) {
    if (textoMensagem === "1") {
      const config = await getEmpresaConfig(empresaId);
      if (!config) {
        return resetSessaoInconsistente(sessao.id);
      }

      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_FORMA_PAGAMENTO,
        endereco_confirmado: 1,
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_FORMA_PAGAMENTO,
        resposta: buildFormasPagamentoText(config.formas_pagamento_aceitas),
      };
    }

    if (textoMensagem === "2") {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_ENDERECO_ENTREGA,
        endereco: null,
        endereco_confirmado: 0,
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_ENDERECO_ENTREGA,
        resposta: "Sem problema. Informe novamente o endereço completo.",
      };
    }

    return {
      estado_atual: ESTADOS.AGUARDANDO_CONFIRMACAO_ENDERECO,
      resposta: "Opção inválida. Responda 1 para confirmar ou 2 para alterar.",
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_FORMA_PAGAMENTO) {
    const config = await getEmpresaConfig(empresaId);
    if (!config) {
      return resetSessaoInconsistente(sessao.id);
    }

    const escolha = parsePositiveInteger(textoMensagem);
    if (!escolha || escolha > config.formas_pagamento_aceitas.length) {
      return {
        estado_atual: ESTADOS.AGUARDANDO_FORMA_PAGAMENTO,
        resposta: `Forma de pagamento inválida.\n${buildFormasPagamentoText(config.formas_pagamento_aceitas)}`,
      };
    }

    const formaSelecionada = config.formas_pagamento_aceitas[escolha - 1];

    if (formaSelecionada === "dinheiro") {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_NECESSIDADE_TROCO,
        forma_pagamento: "dinheiro",
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_NECESSIDADE_TROCO,
        resposta: "Precisa de troco?\n1 - Sim\n2 - Não",
      };
    }

    await webhookModel.updateSessaoById(sessao.id, {
      estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
      forma_pagamento: formaSelecionada,
      precisa_troco: 0,
      troco_para: null,
    });

    const sessaoAtualizada = await webhookModel.findSessaoByEmpresaTelefone(
      empresaId,
      sessao.telefone_origem,
    );
    const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(sessao.id);

    return {
      estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
      resposta: buildPreResumoCompleto(sessaoAtualizada, itensCarrinho),
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_NECESSIDADE_TROCO) {
    if (textoMensagem === "1") {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.AGUARDANDO_TROCO_PARA,
        precisa_troco: 1,
      });

      return {
        estado_atual: ESTADOS.AGUARDANDO_TROCO_PARA,
        resposta: "Informe o valor para troco (ex.: 50 ou 50.00).",
      };
    }

    if (textoMensagem === "2") {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        precisa_troco: 0,
        troco_para: null,
      });

      const sessaoAtualizada = await webhookModel.findSessaoByEmpresaTelefone(
        empresaId,
        sessao.telefone_origem,
      );
      const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(
        sessao.id,
      );

      return {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        resposta: buildPreResumoCompleto(sessaoAtualizada, itensCarrinho),
      };
    }

    return {
      estado_atual: ESTADOS.AGUARDANDO_NECESSIDADE_TROCO,
      resposta: "Opção inválida. Responda 1 para Sim ou 2 para Não.",
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_TROCO_PARA) {
    const trocoPara = parseMoneyValue(textoMensagem);
    if (!trocoPara) {
      return {
        estado_atual: ESTADOS.AGUARDANDO_TROCO_PARA,
        resposta:
          "Valor de troco inválido. Informe um valor numérico positivo.",
      };
    }

    await webhookModel.updateSessaoById(sessao.id, {
      estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
      precisa_troco: 1,
      troco_para: trocoPara,
    });

    const sessaoAtualizada = await webhookModel.findSessaoByEmpresaTelefone(
      empresaId,
      sessao.telefone_origem,
    );
    const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(sessao.id);

    return {
      estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
      resposta: buildPreResumoCompleto(sessaoAtualizada, itensCarrinho),
    };
  }

  if (sessao.estado_atual === ESTADOS.AGUARDANDO_TRATATIVA_ESTOQUE) {
    const produtoPendente = Number(sessao.estoque_produto_pendente || 0);
    const disponivel = Number(sessao.estoque_disponivel_pendente || 0);

    if (!produtoPendente) {
      return resetSessaoInconsistente(sessao.id);
    }

    if (textoMensagem === "1") {
      if (disponivel > 0) {
        await webhookModel.updateCarrinhoItemQuantidade(
          sessao.id,
          produtoPendente,
          disponivel,
        );
      } else {
        await webhookModel.removeCarrinhoItem(sessao.id, produtoPendente);
      }

      const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(
        sessao.id,
      );

      if (!itensCarrinho.length) {
        const produtos =
          await webhookModel.listProdutosAtivosByEmpresa(empresaId);
        await webhookModel.updateSessaoById(sessao.id, {
          estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
          estoque_produto_pendente: null,
          estoque_disponivel_pendente: null,
          ultima_opcao_estoque: "ajustar",
        });

        return {
          estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
          resposta: `Carrinho ficou vazio após ajuste. Vamos escolher itens novamente.\n${buildMenuText(produtos)}`,
        };
      }

      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        estoque_produto_pendente: null,
        estoque_disponivel_pendente: null,
        ultima_opcao_estoque: "ajustar",
      });

      const sessaoAtualizada = await webhookModel.findSessaoByEmpresaTelefone(
        empresaId,
        sessao.telefone_origem,
      );
      return {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        resposta: buildPreResumoCompleto(sessaoAtualizada, itensCarrinho),
      };
    }

    if (textoMensagem === "2") {
      await webhookModel.removeCarrinhoItem(sessao.id, produtoPendente);
      const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(
        sessao.id,
      );

      if (!itensCarrinho.length) {
        const produtos =
          await webhookModel.listProdutosAtivosByEmpresa(empresaId);
        await webhookModel.updateSessaoById(sessao.id, {
          estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
          estoque_produto_pendente: null,
          estoque_disponivel_pendente: null,
          ultima_opcao_estoque: "remover",
        });

        return {
          estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
          resposta: `Item removido. Carrinho ficou vazio e voltamos ao cardápio.\n${buildMenuText(produtos)}`,
        };
      }

      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        estoque_produto_pendente: null,
        estoque_disponivel_pendente: null,
        ultima_opcao_estoque: "remover",
      });

      const sessaoAtualizada = await webhookModel.findSessaoByEmpresaTelefone(
        empresaId,
        sessao.telefone_origem,
      );
      return {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        resposta: buildPreResumoCompleto(sessaoAtualizada, itensCarrinho),
      };
    }

    if (textoMensagem === "3") {
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        estoque_produto_pendente: null,
        estoque_disponivel_pendente: null,
        ultima_opcao_estoque: "cancelar",
      });

      const sessaoAtualizada = await webhookModel.findSessaoByEmpresaTelefone(
        empresaId,
        sessao.telefone_origem,
      );
      const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(
        sessao.id,
      );

      return {
        estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
        resposta: `Finalização cancelada. Você pode ajustar seu pedido e confirmar novamente.\n${buildPreResumoCompleto(sessaoAtualizada, itensCarrinho)}`,
      };
    }

    return {
      estado_atual: ESTADOS.AGUARDANDO_TRATATIVA_ESTOQUE,
      resposta:
        "Opção inválida. Responda 1 para ajustar, 2 para remover ou 3 para cancelar a finalização.",
    };
  }

  if (sessao.estado_atual === ESTADOS.PRONTO_PARA_CRIAR_PEDIDO) {
    if (textoMensagem === "1") {
      if (sessao.pedido_id_criado) {
        await webhookModel.updateSessaoById(sessao.id, {
          estado_atual: ESTADOS.CONCLUIDO,
        });

        return {
          estado_atual: ESTADOS.CONCLUIDO,
          resposta: `Seu pedido já foi confirmado anteriormente. Número: ${sessao.pedido_id_criado}.`,
        };
      }

      const finalizacao = await finalizarPedidoDefinitivo(sessao, empresaId);

      if (finalizacao.invalidEmpresa) {
        return {
          estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
          resposta:
            "Não foi possível confirmar o pedido porque a empresa da sessão é inválida.",
        };
      }

      if (finalizacao.carrinhoVazio) {
        const produtos =
          await webhookModel.listProdutosAtivosByEmpresa(empresaId);
        await webhookModel.updateSessaoById(sessao.id, {
          estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
          estoque_produto_pendente: null,
          estoque_disponivel_pendente: null,
          ultima_opcao_estoque: null,
        });

        return {
          estado_atual: ESTADOS.AGUARDANDO_ITEM_MENU,
          resposta: `Seu carrinho está vazio no momento. Vamos escolher itens novamente.\n${buildMenuText(produtos)}`,
        };
      }

      if (finalizacao.estoqueInsuficiente) {
        await webhookModel.updateSessaoById(sessao.id, {
          estado_atual: ESTADOS.AGUARDANDO_TRATATIVA_ESTOQUE,
          estoque_produto_pendente: finalizacao.estoqueInsuficiente.produto_id,
          estoque_disponivel_pendente:
            finalizacao.estoqueInsuficiente.disponivel,
        });

        return {
          estado_atual: ESTADOS.AGUARDANDO_TRATATIVA_ESTOQUE,
          resposta: buildMensagemEstoqueInsuficiente({
            produtoNome: finalizacao.estoqueInsuficiente.produto_nome,
            solicitado: finalizacao.estoqueInsuficiente.solicitado,
            disponivel: finalizacao.estoqueInsuficiente.disponivel,
          }),
        };
      }

      if (finalizacao.indisponivel) {
        return {
          estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
          resposta:
            "Um item do carrinho não está mais disponível. Revise os itens antes de confirmar.",
        };
      }

      if (finalizacao.internalError) {
        return {
          estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
          resposta:
            "Ocorreu um erro interno ao confirmar o pedido. Tente novamente em instantes.",
        };
      }

      await webhookModel.clearCarrinhoBySessaoId(sessao.id);
      await webhookModel.updateSessaoById(sessao.id, {
        estado_atual: ESTADOS.CONCLUIDO,
        pedido_id_criado: finalizacao.pedidoId,
        estoque_produto_pendente: null,
        estoque_disponivel_pendente: null,
        ultima_opcao_estoque: null,
      });

      return {
        estado_atual: ESTADOS.CONCLUIDO,
        resposta: buildResumoConclusao({
          pedidoId: finalizacao.pedidoId,
          valorTotal: finalizacao.valorTotal,
        }),
      };
    }

    const sessaoAtualizada = await webhookModel.findSessaoByEmpresaTelefone(
      empresaId,
      sessao.telefone_origem,
    );
    const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(sessao.id);

    return {
      estado_atual: ESTADOS.PRONTO_PARA_CRIAR_PEDIDO,
      resposta: buildPreResumoCompleto(sessaoAtualizada, itensCarrinho),
    };
  }

  return resetSessaoInconsistente(sessao.id);
}

async function receiveEvent(payload, context = {}) {
  const correlationId = context.correlationId || "sem_correlation_id";
  const origin = context.origin || "desconhecida";

  const rateLimit = applyRateLimit(origin);
  if (rateLimit.blocked) {
    logStructured("webhook_rate_limit_blocked", {
      correlation_id: correlationId,
      origin,
      retry_after_ms: rateLimit.retryAfterMs,
      status_processamento: "limite_excedido",
    });

    return {
      status: 429,
      code: "WEBHOOK_RATE_LIMIT_EXCEEDED",
      error: "limite de requisições excedido",
    };
  }

  const signatureCheck = isValidSignature({
    headers: context.headers || {},
    rawBody:
      typeof context.rawBody === "string"
        ? context.rawBody
        : JSON.stringify(payload ?? null),
  });

  if (!signatureCheck.valid) {
    logStructured("webhook_signature_invalid", {
      correlation_id: correlationId,
      origin,
      status_processamento: "nao_autorizado",
    });

    return {
      status: 401,
      code: "WEBHOOK_UNAUTHORIZED",
      error: "assinatura inválida",
    };
  }

  await webhookModel.ensureWebhookTable();

  const payloadBruto = JSON.stringify(payload ?? null);
  const extracted = extractEventData(payload);

  logStructured("webhook_event_received", {
    correlation_id: correlationId,
    origin,
    empresa_id: extracted.empresa_id ?? null,
    telefone_origem: extracted.telefone_origem ?? null,
    id_externo: extracted.id_externo ?? null,
    status_processamento: "recebido",
  });

  if (extracted.invalid) {
    await webhookModel.insertEvento({
      id_externo: null,
      empresa_id: extracted.empresa_id,
      telefone_origem: extracted.telefone_origem,
      payload_bruto: payloadBruto,
      status_processamento: "invalido",
    });

    logStructured("webhook_event_result", {
      correlation_id: correlationId,
      origin,
      empresa_id: extracted.empresa_id ?? null,
      telefone_origem: extracted.telefone_origem ?? null,
      id_externo: extracted.id_externo ?? null,
      status_processamento: "invalido",
      resultado: "erro",
      code: "WEBHOOK_INVALID_PAYLOAD",
    });

    return {
      status: 400,
      code: "WEBHOOK_INVALID_PAYLOAD",
      error: "payload inválido",
    };
  }

  try {
    await webhookModel.insertEvento({
      id_externo: extracted.id_externo,
      empresa_id: extracted.empresa_id,
      telefone_origem: extracted.telefone_origem,
      payload_bruto: payloadBruto,
      status_processamento: "recebido",
    });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      await webhookModel.updateStatusByIdExterno(
        extracted.id_externo,
        "duplicado",
      );

      return {
        status: 200,
        data: {
          status: "duplicado",
          code: "WEBHOOK_DUPLICATE_EVENT",
          id_externo: extracted.id_externo,
        },
      };
    }

    throw error;
  }

  let respostaFluxo = "Evento recebido com sucesso.";
  let estadoAtual = null;

  if (extracted.empresa_id && extracted.telefone_origem) {
    let sessao = await webhookModel.findSessaoByEmpresaTelefone(
      extracted.empresa_id,
      extracted.telefone_origem,
    );

    if (!sessao) {
      const sessaoId = await webhookModel.createSessao({
        empresa_id: extracted.empresa_id,
        telefone_origem: extracted.telefone_origem,
        estado_atual: ESTADOS.AGUARDANDO_NOME,
      });

      sessao = {
        id: sessaoId,
        empresa_id: extracted.empresa_id,
        telefone_origem: extracted.telefone_origem,
        estado_atual: ESTADOS.AGUARDANDO_NOME,
        nome_cliente: null,
        item_menu_pendente: null,
      };

      respostaFluxo = "Olá! Vamos começar seu atendimento. Qual é o seu nome?";
      estadoAtual = ESTADOS.AGUARDANDO_NOME;
    } else {
      const resultadoEstado = await processarEstado(
        sessao,
        extracted.empresa_id,
        extracted.texto_mensagem,
      );

      respostaFluxo = resultadoEstado.resposta;
      estadoAtual = resultadoEstado.estado_atual;
    }
  }

  await webhookModel.updateStatusByIdExterno(
    extracted.id_externo,
    "processado",
  );

  logStructured("webhook_event_result", {
    correlation_id: correlationId,
    origin,
    empresa_id: extracted.empresa_id ?? null,
    telefone_origem: extracted.telefone_origem ?? null,
    id_externo: extracted.id_externo ?? null,
    estado_atual: estadoAtual,
    status_processamento: "processado",
    resultado: "sucesso",
  });

  return {
    status: 200,
    data: {
      status: "processado",
      code: "WEBHOOK_PROCESSED",
      id_externo: extracted.id_externo,
      estado_atual: estadoAtual,
      resposta: respostaFluxo,
    },
  };
}

module.exports = {
  verifyChallenge,
  receiveEvent,
  __resetWebhookSecurityStateForTests() {
    rateLimitState.clear();
  },
};

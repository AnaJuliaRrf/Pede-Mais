const webhookModel = require("../models/webhookModel");

const ESTADOS = {
  AGUARDANDO_NOME: "aguardando_nome",
  AGUARDANDO_ITEM_MENU: "aguardando_item_menu",
  AGUARDANDO_QUANTIDADE_ITEM: "aguardando_quantidade_item",
  AGUARDANDO_MAIS_ITENS: "aguardando_mais_itens",
  PRONTO_PARA_CONFIRMACAO: "pronto_para_confirmacao",
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

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "test_verify_token";

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

async function resetSessaoInconsistente(sessaoId) {
  await webhookModel.clearCarrinhoBySessaoId(sessaoId);
  await webhookModel.updateSessaoById(sessaoId, {
    estado_atual: ESTADOS.AGUARDANDO_NOME,
    nome_cliente: null,
    item_menu_pendente: null,
  });

  return {
    estado_atual: ESTADOS.AGUARDANDO_NOME,
    resposta:
      "Houve uma inconsistência na sessão. Vamos recomeçar com segurança. Qual é o seu nome?",
  };
}

async function processarEstado(sessao, empresaId, textoMensagem) {
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
    const itensCarrinho = await webhookModel.listCarrinhoBySessaoId(sessao.id);
    return {
      estado_atual: ESTADOS.PRONTO_PARA_CONFIRMACAO,
      resposta: buildPreResumo(sessao.nome_cliente, itensCarrinho),
    };
  }

  return resetSessaoInconsistente(sessao.id);
}

async function receiveEvent(payload) {
  await webhookModel.ensureWebhookTable();

  const payloadBruto = JSON.stringify(payload ?? null);
  const extracted = extractEventData(payload);

  if (extracted.invalid) {
    await webhookModel.insertEvento({
      id_externo: null,
      empresa_id: extracted.empresa_id,
      telefone_origem: extracted.telefone_origem,
      payload_bruto: payloadBruto,
      status_processamento: "invalido",
    });

    return { status: 400, error: "payload inválido" };
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

  return {
    status: 200,
    data: {
      status: "processado",
      id_externo: extracted.id_externo,
      estado_atual: estadoAtual,
      resposta: respostaFluxo,
    },
  };
}

module.exports = {
  verifyChallenge,
  receiveEvent,
};

const webhookModel = require("../models/webhookModel");
const configuracaoService = require("./configuracaoService");

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

  return `Pré-resumo final:\n${base}\n${detalhes.join("\n")}`;
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

  if (sessao.estado_atual === ESTADOS.PRONTO_PARA_CRIAR_PEDIDO) {
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

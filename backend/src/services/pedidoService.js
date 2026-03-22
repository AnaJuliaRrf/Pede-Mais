const pedidoModel = require("../models/pedidoModel");

const TIPOS_RECEBIMENTO = ["entrega", "retirada"];
const FORMAS_PAGAMENTO = ["dinheiro", "cartao", "pix"];

function validatePayload(payload) {
  const clienteNome =
    typeof payload.cliente_nome === "string" ? payload.cliente_nome.trim() : "";
  const telefone =
    typeof payload.telefone === "string" ? payload.telefone.trim() : "";
  const tipoRecebimento =
    typeof payload.tipo_recebimento === "string"
      ? payload.tipo_recebimento.trim().toLowerCase()
      : "";
  const formaPagamento =
    typeof payload.forma_pagamento === "string"
      ? payload.forma_pagamento.trim().toLowerCase()
      : "";
  const endereco =
    typeof payload.endereco === "string" ? payload.endereco.trim() : "";
  const itens = Array.isArray(payload.itens) ? payload.itens : [];

  if (!clienteNome) {
    return { status: 400, error: "cliente_nome é obrigatório" };
  }

  if (!telefone) {
    return { status: 400, error: "telefone é obrigatório" };
  }

  if (!TIPOS_RECEBIMENTO.includes(tipoRecebimento)) {
    return {
      status: 400,
      error: "tipo_recebimento deve ser entrega ou retirada",
    };
  }

  if (tipoRecebimento === "entrega" && !endereco) {
    return { status: 400, error: "endereco é obrigatório para entrega" };
  }

  if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
    return {
      status: 400,
      error: "forma_pagamento deve ser dinheiro, cartao ou pix",
    };
  }

  if (!itens.length) {
    return {
      status: 400,
      error: "itens é obrigatório e deve ter ao menos 1 item",
    };
  }

  const trocoPara =
    payload.troco_para == null || payload.troco_para === ""
      ? null
      : Number(payload.troco_para);

  if (formaPagamento === "dinheiro") {
    if (!Number.isFinite(trocoPara) || trocoPara < 0) {
      return {
        status: 400,
        error:
          "troco_para é obrigatório para pagamento em dinheiro e não pode ser negativo",
      };
    }
  }

  if (
    formaPagamento !== "dinheiro" &&
    payload.troco_para != null &&
    payload.troco_para !== ""
  ) {
    return {
      status: 400,
      error: "troco_para só pode ser enviado para pagamento em dinheiro",
    };
  }

  const itensMap = new Map();
  for (const item of itens) {
    const produtoId = Number(item.produto_id);
    const quantidade = Number(item.quantidade);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return { status: 400, error: "produto_id inválido em itens" };
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return {
        status: 400,
        error: `quantidade inválida para o produto ${produtoId}`,
      };
    }

    const quantidadeAtual = itensMap.get(produtoId) || 0;
    itensMap.set(produtoId, quantidadeAtual + quantidade);
  }

  const normalizedItens = Array.from(itensMap.entries()).map(
    ([produto_id, quantidade]) => ({
      produto_id,
      quantidade,
    }),
  );

  return {
    data: {
      cliente_nome: clienteNome,
      telefone,
      tipo_recebimento: tipoRecebimento,
      endereco: tipoRecebimento === "entrega" ? endereco : null,
      forma_pagamento: formaPagamento,
      troco_para: formaPagamento === "dinheiro" ? trocoPara : null,
      itens: normalizedItens,
    },
  };
}

async function createPedido(empresaId, payload) {
  const validation = validatePayload(payload);
  if (validation.error) {
    return { status: validation.status, error: validation.error };
  }

  const connection = await pedidoModel.getConnection();

  try {
    await connection.beginTransaction();

    const itensCalculados = [];
    let valorTotal = 0;

    for (const item of validation.data.itens) {
      const produto = await pedidoModel.findProdutoParaPedido(
        connection,
        empresaId,
        item.produto_id,
      );

      if (!produto) {
        await connection.rollback();
        return {
          status: 404,
          error: `produto ${item.produto_id} não encontrado para esta empresa`,
        };
      }

      if (!produto.ativo) {
        await connection.rollback();
        return {
          status: 400,
          error: `produto ${item.produto_id} está inativo`,
        };
      }

      if (Number(produto.quantidade_estoque) < item.quantidade) {
        await connection.rollback();
        return {
          status: 400,
          error: `estoque insuficiente para produto ${item.produto_id}. disponível: ${produto.quantidade_estoque}, solicitado: ${item.quantidade}`,
        };
      }

      const precoUnitario = Number(produto.preco);
      const subtotal = precoUnitario * item.quantidade;
      valorTotal += subtotal;

      itensCalculados.push({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: precoUnitario,
        subtotal,
      });
    }

    const pedidoId = await pedidoModel.insertPedido(connection, {
      empresa_id: Number(empresaId),
      cliente_nome: validation.data.cliente_nome,
      telefone: validation.data.telefone,
      tipo_recebimento: validation.data.tipo_recebimento,
      endereco: validation.data.endereco,
      forma_pagamento: validation.data.forma_pagamento,
      troco_para: validation.data.troco_para,
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
      status: 201,
      data: {
        id: pedidoId,
        empresa_id: Number(empresaId),
        cliente_nome: validation.data.cliente_nome,
        telefone: validation.data.telefone,
        tipo_recebimento: validation.data.tipo_recebimento,
        endereco: validation.data.endereco,
        forma_pagamento: validation.data.forma_pagamento,
        troco_para: validation.data.troco_para,
        valor_total: valorTotal,
        itens: itensCalculados,
      },
    };
  } catch (error) {
    await connection.rollback();
    return { status: 500, error: "erro interno do servidor" };
  } finally {
    connection.release();
  }
}

async function listPedidos(empresaId) {
  const rows = await pedidoModel.listPedidosByEmpresa(empresaId);

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        empresa_id: row.empresa_id,
        cliente_nome: row.cliente_nome,
        telefone: row.telefone,
        tipo_recebimento: row.tipo_recebimento,
        endereco: row.endereco,
        forma_pagamento: row.forma_pagamento,
        troco_para: row.troco_para,
        valor_total: row.valor_total,
        itens: [],
      });
    }

    if (row.produto_id != null) {
      const subtotal = Number(row.preco_unitario) * Number(row.quantidade);
      map.get(row.id).itens.push({
        produto_id: row.produto_id,
        produto_nome: row.produto_nome,
        quantidade: row.quantidade,
        preco_unitario: row.preco_unitario,
        subtotal,
      });
    }
  }

  return { status: 200, data: Array.from(map.values()) };
}

module.exports = {
  createPedido,
  listPedidos,
};

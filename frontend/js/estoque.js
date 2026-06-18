let produtosEstoque = [];

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAutenticacao()) {
    return;
  }

  const filtroCategoria = document.getElementById("filtroCategoria");
  if (filtroCategoria) {
    filtroCategoria.addEventListener("change", aplicarFiltroCategoria);
  }

  carregarEstoque();
});

async function carregarEstoque() {
  try {
    const empresaId = localStorage.getItem("empresaId");

    produtosEstoque = await apiRequest(
      `/empresas/${empresaId}/estoque`,
      "GET",
      null,
      true,
    );

    popularCategorias(produtosEstoque);
    renderizarTabela(produtosEstoque);
  } catch (error) {
    console.error("Erro ao carregar estoque:", error);
  }
}

function popularCategorias(produtos) {
  const filtroCategoria = document.getElementById("filtroCategoria");
  if (!filtroCategoria) {
    return;
  }

  const categoriaAtual = filtroCategoria.value;
  const categorias = [...new Set(produtos.map((produto) => produto.categoria))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  filtroCategoria.innerHTML = '<option value="">Todas as categorias</option>';

  categorias.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    filtroCategoria.appendChild(option);
  });

  if (categorias.includes(categoriaAtual)) {
    filtroCategoria.value = categoriaAtual;
  }
}

function aplicarFiltroCategoria() {
  const categoria = document.getElementById("filtroCategoria").value;
  const produtosFiltrados = categoria
    ? produtosEstoque.filter((produto) => produto.categoria === categoria)
    : produtosEstoque;

  renderizarTabela(produtosFiltrados);
}

function renderizarTabela(produtos) {
  const tabela = document.getElementById("tabelaEstoque");
  tabela.innerHTML = "";

  produtos.forEach((produto) => {
    const quantidade = Number(produto.quantidade || 0);
    const estoqueMinimo = Number(produto.estoque_minimo || 0);
    let status = "";
    let statusClass = "";

    if (quantidade <= 0) {
      status = "Sem estoque";
      statusClass = "danger";
    } else if (quantidade <= estoqueMinimo) {
      status = "Baixo";
      statusClass = "warning";
    } else {
      status = "Em estoque";
      statusClass = "success";
    }

    tabela.innerHTML += `
      <tr>
        <td>${produto.nome}</td>
        <td>${produto.categoria || "-"}</td>
        <td>${quantidade}</td>
        <td>${estoqueMinimo}</td>
        <td>
          <span class="status ${statusClass}">
            ${status}
          </span>
        </td>
        <td class="actions">
          <button
            class="edit-btn"
            onclick="editarProduto(${produto.produto_id})"
          >
            <i class="fa-solid fa-pen"></i>
          </button>
          <button
            class="delete-btn"
            onclick="deletarProduto(${produto.produto_id})"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

function editarProduto(id) {
  console.log("Editar produto:", id);
}

async function deletarProduto(id) {
  const confirmar = confirm("Deseja excluir esse produto?");

  if (!confirmar) return;

  try {
    await apiRequest(`/produtos/${id}`, "DELETE", null, true);

    carregarEstoque();
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
  }
}

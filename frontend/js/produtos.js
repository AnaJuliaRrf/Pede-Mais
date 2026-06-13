const productState = {
  produtos: [],
  editingId: null,
};

document.addEventListener("DOMContentLoaded", () => {
  const productsGrid = document.querySelector(".products-grid");
  if (!productsGrid) return;

  verificarAutenticacao();
  bindProdutoEventos();
  carregarProdutos();
});

function bindProdutoEventos() {
  document.querySelector(".new-product")?.addEventListener("click", () => {
    abrirProdutoSidebar();
  });

  document.getElementById("closeSidebar")?.addEventListener("click", closeSidebar);
  document.querySelector(".cancel-btn")?.addEventListener("click", closeSidebar);
  document.getElementById("overlay")?.addEventListener("click", closeSidebar);
  document.getElementById("searchInput")?.addEventListener("input", renderizarProdutos);
  document.getElementById("categoryFilter")?.addEventListener("change", renderizarProdutos);
  document.querySelector(".save-btn")?.addEventListener("click", salvarProduto);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
}

async function carregarProdutos() {
  try {
    const empresaId = getEmpresaId();
    productState.produtos = await apiRequest(
      `/empresas/${empresaId}/produtos`,
      "GET",
      null,
      true,
    );
    renderizarProdutos();
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    alert(error.message);
  }
}

function renderizarProdutos() {
  const productsGrid = document.querySelector(".products-grid");
  if (!productsGrid) return;

  const searchText = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const selectedCategory =
    document.getElementById("categoryFilter")?.value.toLowerCase() || "all";

  const produtosFiltrados = productState.produtos.filter((produto) => {
    const nome = String(produto.nome || "").toLowerCase();
    const categoria = String(produto.categoria || "").toLowerCase();
    const matchesSearch = nome.includes(searchText);
    const matchesCategory = selectedCategory === "all" || categoria.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  if (!produtosFiltrados.length) {
    productsGrid.innerHTML = `<p>Nenhum produto encontrado.</p>`;
    return;
  }

  productsGrid.innerHTML = produtosFiltrados
    .map((produto) => {
      const ativo = Boolean(produto.ativo);
      return `
        <div class="product-card" data-id="${produto.id}">
          <div class="product-image"></div>
          <div class="product-info">
            <h3>${escapeHtml(produto.nome)}</h3>
            <div class="category">${escapeHtml(produto.categoria || "Sem categoria")}</div>
            <div class="price">${formatCurrency(produto.preco)}</div>
            <div class="status">${ativo ? "Disponivel" : "Indisponivel"}</div>
            <div class="card-footer">
              <button class="edit-btn" type="button" onclick="editarProduto(${produto.id})">
                <i class="fa-solid fa-pen"></i>
                Editar
              </button>
              <div class="right-actions">
                <label class="switch">
                  <input type="checkbox" ${ativo ? "checked" : ""} onchange="alternarProduto(${produto.id}, this.checked)">
                  <span class="slider"></span>
                </label>
                <i class="fa-regular fa-trash-can delete-btn" onclick="deletarProduto(${produto.id})"></i>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function abrirProdutoSidebar(produto = null) {
  productState.editingId = produto?.id || null;
  document.getElementById("productSidebarTitle").textContent = produto
    ? "Editar produto"
    : "Novo produto";

  document.getElementById("produtoNome").value = produto?.nome || "";
  document.getElementById("produtoCategoria").value = produto?.categoria || "Selecione uma categoria";
  document.getElementById("produtoPreco").value = produto?.preco
    ? String(produto.preco).replace(".", ",")
    : "";
  document.getElementById("produtoDescricao").value = produto?.descricao || "";
  document.getElementById("produtoAtivo").checked = produto?.ativo ?? true;

  document.getElementById("productSidebar").classList.add("active");
  document.getElementById("overlay").classList.add("active");
}

function closeSidebar() {
  document.getElementById("productSidebar")?.classList.remove("active");
  document.getElementById("overlay")?.classList.remove("active");
  productState.editingId = null;
}

async function salvarProduto() {
  const nome = document.getElementById("produtoNome").value.trim();
  const categoria = document.getElementById("produtoCategoria").value;
  const preco = parseMoney(document.getElementById("produtoPreco").value);
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const ativo = document.getElementById("produtoAtivo").checked;

  if (!nome || !Number.isFinite(preco) || preco <= 0) {
    alert("Informe nome e preco valido.");
    return;
  }

  const payload = {
    nome,
    categoria: categoria === "Selecione uma categoria" ? null : categoria,
    preco,
    descricao: descricao || null,
    ativo,
  };

  try {
    const empresaId = getEmpresaId();
    const endpoint = productState.editingId
      ? `/empresas/${empresaId}/produtos/${productState.editingId}`
      : `/empresas/${empresaId}/produtos`;
    const method = productState.editingId ? "PUT" : "POST";

    await apiRequest(endpoint, method, payload, true);
    await carregarProdutos();
    closeSidebar();
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    alert(error.message);
  }
}

function editarProduto(id) {
  const produto = productState.produtos.find((item) => Number(item.id) === Number(id));
  if (produto) abrirProdutoSidebar(produto);
}

async function alternarProduto(id, ativo) {
  const produto = productState.produtos.find((item) => Number(item.id) === Number(id));
  if (!produto) return;

  try {
    await apiRequest(
      `/empresas/${getEmpresaId()}/produtos/${id}`,
      "PUT",
      { ...produto, ativo },
      true,
    );
    await carregarProdutos();
  } catch (error) {
    console.error("Erro ao alterar status do produto:", error);
    alert(error.message);
    await carregarProdutos();
  }
}

async function deletarProduto(id) {
  if (!confirm("Deseja excluir esse produto?")) return;

  try {
    await apiRequest(`/empresas/${getEmpresaId()}/produtos/${id}`, "DELETE", null, true);
    await carregarProdutos();
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    alert(error.message);
  }
}

function parseMoney(value) {
  return Number(String(value).replace(/\./g, "").replace(",", "."));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

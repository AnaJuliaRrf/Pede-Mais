const newProductBtn = document.querySelector(".new-product");
const sidebar = document.getElementById("productSidebar");
const overlay = document.getElementById("overlay");
const closeSidebarBtn = document.getElementById("closeSidebar");
const cancelBtn = document.querySelector(".cancel-btn");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const productsGrid = document.querySelector(".products-grid");
const saveBtn = document.querySelector(".save-btn");

let produtosCardapio = [];

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAutenticacao()) {
    return;
  }

  configurarAcoes();
  carregarProdutos();
});

function configurarAcoes() {
  newProductBtn.addEventListener("click", abrirSidebar);
  closeSidebarBtn.addEventListener("click", closeSidebar);
  cancelBtn.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  searchInput.addEventListener("input", filterProducts);
  categoryFilter.addEventListener("change", filterProducts);
  saveBtn.addEventListener("click", () => {
    alert("Produto salvo com sucesso!");
    closeSidebar();
  });
}

async function carregarProdutos() {
  try {
    const empresaId = localStorage.getItem("empresaId");
    produtosCardapio = await apiRequest(
      `/empresas/${empresaId}/produtos`,
      "GET",
      null,
      true,
    );

    popularCategorias(produtosCardapio);
    renderizarProdutos(produtosCardapio);
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
  }
}

function popularCategorias(produtos) {
  const categoriaAtual = categoryFilter.value;
  const categorias = [...new Set(produtos.map((produto) => produto.categoria))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  categoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';

  categorias.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    categoryFilter.appendChild(option);
  });

  if (categorias.includes(categoriaAtual)) {
    categoryFilter.value = categoriaAtual;
  }
}

function renderizarProdutos(produtos) {
  productsGrid.innerHTML = "";

  produtos.forEach((produto) => {
    productsGrid.innerHTML += `
      <div class="product-card" data-categoria="${produto.categoria || ""}">
        <div class="product-info">
          <h3>${produto.nome}</h3>
          <div class="category">${produto.categoria || "-"}</div>
          <div class="price">${formatarMoeda(produto.preco)}</div>
          <div class="status">${produto.ativo ? "Disponível" : "Indisponível"}</div>
          <div class="card-footer">
            <button class="edit-btn" type="button">
              <i class="fa-solid fa-pen"></i>
              Editar
            </button>
            <div class="right-actions">
              <label class="switch">
                <input type="checkbox" ${produto.ativo ? "checked" : ""}>
                <span class="slider"></span>
              </label>
              <i class="fa-regular fa-trash-can delete-btn"></i>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  conectarBotoesCards();
}

function filterProducts() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const produtosFiltrados =
    selectedCategory === "all"
      ? produtosCardapio
      : produtosCardapio.filter(
          (produto) => produto.categoria === selectedCategory,
        );

  renderizarProdutos(
    produtosFiltrados.filter((produto) =>
      produto.nome.toLowerCase().includes(searchText),
    ),
  );
}

function conectarBotoesCards() {
  document.querySelectorAll(".switch input").forEach((item) => {
    item.addEventListener("change", () => {
      console.log("Status alterado");
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      card.remove();
    });
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", abrirSidebar);
  });
}

function abrirSidebar() {
  sidebar.classList.add("active");
  overlay.classList.add("active");
}

function closeSidebar() {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
}

function formatarMoeda(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

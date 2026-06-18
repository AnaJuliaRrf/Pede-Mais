const PAGE_ROUTES = {
  dashboard: "dashboard.html",
  pedidos: "pedidos.html",
  estoque: "estoque.html",
  produtos: "produtos.html",
};

function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function configurarMenuLateral() {
  const currentPage = window.location.pathname.split("/").pop();
  const menuItems = document.querySelectorAll(".sidebar .menu li");

  menuItems.forEach((item) => {
    const label = normalizarTexto(
      item.querySelector(".txt-link")?.textContent || item.textContent,
    );
    const route = PAGE_ROUTES[label];

    item.classList.toggle("active", route === currentPage);

    if (!route) {
      item.classList.add("disabled");
      item.setAttribute("aria-disabled", "true");
      return;
    }

    item.setAttribute("role", "link");
    item.setAttribute("tabindex", "0");
    item.addEventListener("click", () => {
      if (route !== currentPage) {
        window.location.href = route;
      }
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        item.click();
      }
    });
  });

  const settings = document.querySelector(".sidebar .settings");
  if (settings) {
    settings.setAttribute("href", "#");
    settings.setAttribute("aria-disabled", "true");
    settings.classList.add("disabled");
    settings.addEventListener("click", (event) => {
      event.preventDefault();
    });
  }
}

document.addEventListener("DOMContentLoaded", configurarMenuLateral);

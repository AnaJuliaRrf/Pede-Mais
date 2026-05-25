// =========================
// ELEMENTOS
// =========================

const newProductBtn = document.querySelector(".new-product")

const sidebar = document.getElementById("productSidebar")

const overlay = document.getElementById("overlay")

const closeSidebarBtn = document.getElementById("closeSidebar")

const cancelBtn = document.querySelector(".cancel-btn")

const searchInput = document.getElementById("searchInput")

const categoryFilter = document.getElementById("categoryFilter")

const productsGrid = document.querySelector(".products-grid")


// =========================
// ABRIR SIDEBAR
// =========================

newProductBtn.addEventListener("click", () => {

  sidebar.classList.add("active")

  overlay.classList.add("active")

})


// =========================
// FECHAR SIDEBAR
// =========================

function closeSidebar(){

  sidebar.classList.remove("active")

  overlay.classList.remove("active")

}


// BOTÃO X
closeSidebarBtn.addEventListener("click", closeSidebar)


// BOTÃO CANCELAR
cancelBtn.addEventListener("click", closeSidebar)


// CLICAR NO FUNDO ESCURO
overlay.addEventListener("click", closeSidebar)


// =========================
// FECHAR COM ESC
// =========================

document.addEventListener("keydown", (event) => {

  if(event.key === "Escape"){

    closeSidebar()

  }

})


// =========================
// BUSCAR PRODUTOS
// =========================

searchInput.addEventListener("input", filterProducts)

categoryFilter.addEventListener("change", filterProducts)


function filterProducts(){

  const searchText = searchInput.value.toLowerCase()

  const selectedCategory = categoryFilter.value.toLowerCase()

  const cards = document.querySelectorAll(".product-card")

  cards.forEach(card => {

    const title = card.querySelector("h3").textContent.toLowerCase()

    const category = card.querySelector(".category").textContent.toLowerCase()

    const matchesSearch = title.includes(searchText)

    const matchesCategory =
      selectedCategory === "all" ||
      category.includes(selectedCategory)

    if(matchesSearch && matchesCategory){

      card.style.display = "flex"

    }else{

      card.style.display = "none"

    }

  })

}


// =========================
// SWITCH STATUS
// =========================

const switches = document.querySelectorAll(".switch input")

switches.forEach(item => {

  item.addEventListener("change", () => {

    console.log("Status alterado")

  })

})


// =========================
// BOTÃO DELETE
// =========================

const deleteButtons = document.querySelectorAll(".delete-btn")

deleteButtons.forEach(button => {

  button.addEventListener("click", () => {

    const card = button.closest(".product-card")

    card.remove()

  })

})


// =========================
// BOTÃO EDITAR
// =========================

const editButtons = document.querySelectorAll(".edit-btn")

editButtons.forEach(button => {

  button.addEventListener("click", () => {

    sidebar.classList.add("active")

    overlay.classList.add("active")

  })

})


// =========================
// SIMULAÇÃO SALVAR PRODUTO
// =========================

const saveBtn = document.querySelector(".save-btn")

saveBtn.addEventListener("click", () => {

  alert("Produto salvo com sucesso!")

  closeSidebar()

})
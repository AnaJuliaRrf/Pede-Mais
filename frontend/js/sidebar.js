async function loadSidebar() {

  const container =
    document.getElementById("sidebar-container");

  const response =
    await fetch("./components/sidebar.html");

  const html = await response.text();

  container.innerHTML = html;

  setActiveMenu();

}

function setActiveMenu() {

  const currentPage =
    window.location.pathname.split("/").pop();

  const navLinks =
    document.querySelectorAll(".nav-item");

  navLinks.forEach((link) => {

    const href = link.getAttribute("href");

    if (href === currentPage) {

      link.classList.add("active");

    } else {

      link.classList.remove("active");

    }

  });

}

loadSidebar();
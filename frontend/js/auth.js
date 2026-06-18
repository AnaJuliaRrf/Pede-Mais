const loginForm = document.getElementById("loginForm");
const showPassword = document.getElementById("showPassword");
const passwordInput = document.getElementById("password");

if (showPassword && passwordInput) {
  showPassword.addEventListener("change", () => {
    passwordInput.type = showPassword.checked ? "text" : "password";
  });
}

async function login(email, senha) {
  const resposta = await apiRequest("/auth/login", "POST", {
    email,
    senha,
  });

  localStorage.setItem("token", resposta.token);
  localStorage.setItem("empresaId", resposta.usuario.empresa_id);
  localStorage.setItem("usuario", JSON.stringify(resposta.usuario));

  window.location.href = "dashboard.html";
}

function verificarAutenticacao() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
    return false;
  }

  return true;
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

if (loginForm && passwordInput) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = passwordInput.value;

    if (email === "" || senha === "") {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      await login(email, senha);
    } catch (error) {
      console.error("Erro no login:", error);
      alert(error.message || "Email ou senha invalidos!");
    }
  });
}

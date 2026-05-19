const loginForm = document.getElementById("loginForm");
const showPassword = document.getElementById("showPassword");
const passwordInput = document.getElementById("password");

// Mostrar ou ocultar senha
showPassword.addEventListener("change", () => {
  if (showPassword.checked) {
    passwordInput.type = "text";
  } else {
    passwordInput.type = "password";
  }
});

// Função de login integrada com o backend
async function login(email, senha) {
  const resposta = await apiRequest("/auth/login", "POST", {
    email,
    senha
  });

  // Salva token JWT
  localStorage.setItem("token", resposta.token);

  // Salva ID da empresa
  localStorage.setItem("empresaId", resposta.empresa.id);

  // Redireciona para o dashboard
  window.location.href = "dashboard.html";
}

// Verifica se o usuário está autenticado
function verificarAutenticacao() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "index.html";
  }
}

// Logout
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// Submit do formulário
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const senha = passwordInput.value;

  // Validação simples
  if (email === "" || senha === "") {
    alert("Preencha todos os campos!");
    return;
  }

  try {
    await login(email, senha);
  } catch (error) {
    console.error("Erro no login:", error);
    alert("Email ou senha inválidos!");
  }
});
const loginForm = document.getElementById("loginForm");
const showPassword = document.getElementById("showPassword");
const passwordInput = document.getElementById("password");

// Mostrar senha
showPassword.addEventListener("change", () => {

  if (showPassword.checked) {
    passwordInput.type = "text";
  } else {
    passwordInput.type = "password";
  }

});

// Submit do formulário
loginForm.addEventListener("submit", (event) => {

  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = passwordInput.value;

  // Simulação login
  if (email === "" || password === "") {
    alert("Preencha todos os campos!");
    return;
  }

  console.log({
    email,
    password
  });

  alert("Login realizado com sucesso!");

  // Futuramente:
  // window.location.href = "dashboard.html";

});
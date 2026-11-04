const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("message");
  const button = document.getElementById("loginButton");
  button.disabled = true;
  button.textContent = "Authenticating...";
  message.textContent = "";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed.");

    window.location.assign(data.redirect);
  } catch (error) {
    message.style.color = "#ef4444";
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Access Secure Vault";
  }
});

const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("message");
  const button = document.getElementById("registerButton");
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  message.textContent = "";

  if (password !== confirmPassword) {
    message.style.color = "#ef4444";
    message.textContent = "Passwords do not match.";
    return;
  }

  if (new TextEncoder().encode(password).length > 72) {
    message.style.color = "#ef4444";
    message.textContent = "Password is too long. Use at most 72 UTF-8 bytes.";
    return;
  }

  button.disabled = true;
  button.textContent = "Creating Account...";

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("fullName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        password
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Registration failed.");

    message.style.color = "#c5a059";
    message.textContent = data.message;
    window.location.assign(data.redirect);
  } catch (error) {
    message.style.color = "#ef4444";
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Create My Account";
  }
});

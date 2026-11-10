document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/me");
    if (!response.ok) {
      window.location.replace("/login.html");
      return;
    }
    const data = await response.json();
    document.getElementById("customerName").textContent = data.user.name;
  } catch (error) {
    window.location.replace("/login.html");
    return;
  }

  const searchInput = document.getElementById("vaultSearch");
  const noResults = document.getElementById("noResults");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    let visible = 0;

    document.querySelectorAll(".product-card").forEach(card => {
      const title = card.querySelector(".watch-title").textContent.toLowerCase();
      const meta = card.querySelector(".watch-meta").textContent.toLowerCase();
      const match = title.includes(query) || meta.includes(query);
      card.style.display = match ? "flex" : "none";
      if (match) visible++;
    });

    noResults.hidden = visible !== 0;
  });

  document.querySelectorAll(".flip-btn").forEach(button => {
    button.addEventListener("click", () => {
      const inner = button.closest(".product-card").querySelector(".watch-inner-card");
      inner.classList.toggle("flipped");
      button.textContent = inner.classList.contains("flipped") ? "View Front" : "Flip Watch";
    });
  });

  let cartCount = 0;
  const cartDisplay = document.getElementById("cartCount");

  document.querySelectorAll(".add-cart-btn").forEach(button => {
    button.addEventListener("click", () => {
      cartCount++;
      cartDisplay.textContent = cartCount;
      button.textContent = "Added ✓";
      alert("Added to cart")
      window.setTimeout(() => { button.textContent = "Add to Cart"; }, 900);
    });
  });

  document.getElementById("resetCart").addEventListener("click", () => {
    cartCount = 0;
    cartDisplay.textContent = "0";
  });

  document.getElementById("logoutButton").addEventListener("click", async () => {
    const button = document.getElementById("logoutButton");
    button.disabled = true;
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed.");
      window.location.replace("/login.html");
    } catch (error) {
      button.disabled = false;
      alert(error.message);
    }
  });
});

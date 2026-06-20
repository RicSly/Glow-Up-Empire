(function () {
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const form = document.getElementById("loginForm");
    const status = document.getElementById("loginStatus");

    if (sessionStorage.getItem("glow-admin-auth") === "true") {
      window.location.href = "admin.html";
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const username = document.getElementById("adminUsername").value.trim();
      const password = document.getElementById("adminPassword").value;
      const passwordHash = await sha256(password);

      if (username === window.GlowStore.config.adminUsername && passwordHash === window.GlowStore.config.adminPasswordHash) {
        sessionStorage.setItem("glow-admin-auth", "true");
        window.location.href = "admin.html";
        return;
      }

      status.textContent = "Invalid username or password.";
    });

    window.GlowStore.refreshIcons();
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const buffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
})();

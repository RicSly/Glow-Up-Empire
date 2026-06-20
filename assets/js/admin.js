(function () {
  const state = {
    products: [],
    editingId: "",
    canUseUploadServer: false,
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (sessionStorage.getItem("glow-admin-auth") !== "true") {
      window.location.href = "login.html";
      return;
    }

    cacheElements();
    bindEvents();
    await loadProducts();
    await checkUploadServer();
    window.GlowStore.refreshIcons();
  }

  function cacheElements() {
    els.adminStatus = document.getElementById("adminStatus");
    els.logoutButton = document.getElementById("logoutButton");
    els.importJsonInput = document.getElementById("importJsonInput");
    els.dressForm = document.getElementById("dressForm");
    els.formTitle = document.getElementById("formTitle");
    els.editingId = document.getElementById("editingId");
    els.dressName = document.getElementById("dressName");
    els.dressDescription = document.getElementById("dressDescription");
    els.dressSizes = document.getElementById("dressSizes");
    els.dressPrice = document.getElementById("dressPrice");
    els.frontImagePreview = document.getElementById("frontImagePreview");
    els.backImagePreview = document.getElementById("backImagePreview");
    els.frontImagePath = document.getElementById("frontImagePath");
    els.backImagePath = document.getElementById("backImagePath");
    els.dressAvailable = document.getElementById("dressAvailable");
    els.dressFeatured = document.getElementById("dressFeatured");
    els.resetFormButton = document.getElementById("resetFormButton");
    els.saveCatalogueButton = document.getElementById("saveCatalogueButton");
    els.uploadCommitButton = document.getElementById("uploadCommitButton");
    els.downloadCatalogueButton = document.getElementById("downloadCatalogueButton");
    els.productList = document.getElementById("adminProductList");
    els.adminCount = document.getElementById("adminCount");
  }

  function bindEvents() {
    els.logoutButton.addEventListener("click", handleLogout);
    els.importJsonInput.addEventListener("change", importJson);
    els.dressForm.addEventListener("submit", saveDress);
    els.resetFormButton.addEventListener("click", resetFormToActiveSlot);
    els.saveCatalogueButton.addEventListener("click", saveCatalogue);
    els.uploadCommitButton.addEventListener("click", uploadAndPush);
    els.downloadCatalogueButton.addEventListener("click", downloadCatalogue);
    els.productList.addEventListener("click", handleProductAction);
  }

  function handleLogout() {
    sessionStorage.removeItem("glow-admin-auth");
    window.location.href = "login.html";
  }

  async function loadProducts() {
    state.products = await window.GlowStore.loadProducts();
    renderProducts();

    if (!state.editingId && state.products.length) {
      editProduct(state.products[0]);
    }

    setStatus("100 fixed image slots loaded. Edit text only; images are read from the hard-coded paths.");
  }

  async function checkUploadServer() {
    try {
      const response = await fetch("api/admin-status", { cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      state.canUseUploadServer = Boolean(payload && payload.canCommit);
      els.uploadCommitButton.disabled = !state.canUseUploadServer;

      if (state.canUseUploadServer) {
        setStatus("Upload server connected. Upload & push will commit JSON edits and manually added images.");
      } else {
        setStatus("100 fixed image slots loaded. Start the local admin server to use Upload & push.");
      }
    } catch (error) {
      state.canUseUploadServer = false;
      els.uploadCommitButton.disabled = true;
      setStatus("100 fixed image slots loaded. Start the local admin server to use Upload & push.");
    }
  }

  async function saveDress(event) {
    event.preventDefault();

    if (!state.editingId) {
      setStatus("Select a slot before saving.");
      return;
    }

    const product = state.products.find((item) => item.id === state.editingId);
    if (!product) {
      setStatus("The selected slot could not be found.");
      return;
    }

    product.name = els.dressName.value.trim();
    product.description = els.dressDescription.value.trim();
    product.sizes = parseNumericSizes(els.dressSizes.value);
    product.price = Number(els.dressPrice.value || 0);
    product.available = els.dressAvailable.checked;
    product.featured = els.dressFeatured.checked;
    product.updatedAt = new Date().toISOString().slice(0, 10);

    if (product.featured) {
      state.products = state.products.map((item) => Object.assign(item, { featured: item.id === product.id }));
    }

    renderProducts();
    editProduct(product);
    setStatus(`Text edits saved for slot ${window.GlowStore.formatSlot(product.slotNumber)}. Use Upload & push to publish.`);
  }

  function saveCatalogue() {
    downloadCatalogue();
  }

  async function uploadAndPush() {
    if (!state.canUseUploadServer) {
      setStatus("Start the local admin server with node tools/admin-server.js 8080, then reopen admin.html.");
      return;
    }

    setStatus("Saving text edits, staging images, committing, and pushing...");
    els.uploadCommitButton.disabled = true;

    try {
      const response = await fetch("api/upload-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: state.products,
          files: [],
          message: buildCommitMessage(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed.");
      }

      setStatus(payload.message || "Text edits and images uploaded.");
      await loadProducts();
    } catch (error) {
      setStatus(error.message || "Upload & push failed.");
    } finally {
      els.uploadCommitButton.disabled = !state.canUseUploadServer;
    }
  }

  async function importJson(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const products = JSON.parse(await file.text());
      state.products = window.GlowStore.mergeWithFixedSlots(products);
      renderProducts();
      editProduct(state.products[0]);
      setStatus("JSON catalogue imported into the 100 fixed slots.");
    } catch (error) {
      setStatus("The selected JSON file could not be imported.");
    } finally {
      event.target.value = "";
    }
  }

  function renderProducts() {
    const sorted = state.products.slice().sort((a, b) => a.slotNumber - b.slotNumber);
    els.productList.innerHTML = sorted.map(renderAdminProduct).join("");
    els.adminCount.textContent = `${state.products.length} slots`;
    window.GlowStore.refreshIcons();
  }

  function renderAdminProduct(product) {
    const slot = window.GlowStore.formatSlot(product.slotNumber);
    const status = product.available ? '<span class="pill">Visible</span>' : '<span class="pill muted">Hidden</span>';
    const active = product.id === state.editingId ? " active" : "";

    return `
      <article class="admin-product${active}">
        <img src="${window.GlowStore.escapeHtml(product.frontImage)}" alt="Slot ${slot} front image" onerror="window.GlowStore.useFallbackImage(this)">
        <div>
          <h3>Slot ${slot}: ${window.GlowStore.escapeHtml(window.GlowStore.getProductTitle(product))}</h3>
          <p>${window.GlowStore.escapeHtml(product.frontImage)}</p>
          <div class="mini-pills">${status}${product.featured ? '<span class="pill accent">Featured</span>' : ""}</div>
        </div>
        <div class="admin-actions">
          <button class="icon-button" type="button" data-action="edit" data-id="${window.GlowStore.escapeHtml(product.id)}" aria-label="Edit slot ${slot}">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
        </div>
      </article>
    `;
  }

  function handleProductAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const product = state.products.find((item) => item.id === button.dataset.id);
    if (product) {
      editProduct(product);
    }
  }

  function editProduct(product) {
    state.editingId = product.id;
    els.editingId.value = product.id;
    els.formTitle.textContent = `Slot ${window.GlowStore.formatSlot(product.slotNumber)}`;
    els.dressName.value = product.name;
    els.dressDescription.value = product.description;
    els.dressSizes.value = product.sizes.join(", ");
    els.dressPrice.value = product.price || "";
    els.dressAvailable.checked = product.available;
    els.dressFeatured.checked = product.featured;
    els.frontImagePreview.src = product.frontImage;
    els.frontImagePreview.onerror = function () {
      window.GlowStore.useFallbackImage(this);
    };
    els.backImagePreview.src = product.backImage;
    els.backImagePreview.onerror = function () {
      window.GlowStore.useFallbackImage(this);
    };
    els.frontImagePath.textContent = product.frontImage;
    els.backImagePath.textContent = product.backImage;
    renderProducts();
  }

  function resetFormToActiveSlot() {
    const product = state.products.find((item) => item.id === state.editingId) || state.products[0];
    if (product) {
      editProduct(product);
      setStatus(`Reloaded slot ${window.GlowStore.formatSlot(product.slotNumber)}.`);
    }
  }

  function setStatus(message) {
    els.adminStatus.textContent = message;
  }

  function parseNumericSizes(value) {
    return String(value || "")
      .split(",")
      .map((size) => size.trim().replace(/[^\d]/g, ""))
      .filter(Boolean);
  }

  function buildCommitMessage() {
    return "Update dress slot text and images";
  }

  function downloadCatalogue() {
    downloadBlob(window.GlowStore.toCatalogueJson(state.products), "dresses.json", "application/json");
    setStatus("dresses.json downloaded.");
  }

  function downloadBlob(content, fileName, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
})();

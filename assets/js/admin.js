(function () {
  const state = {
    products: [],
    pendingFiles: new Map(),
    selectedFile: null,
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
    els.dressImage = document.getElementById("dressImage");
    els.imagePreview = document.getElementById("imagePreview");
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
    els.dressImage.addEventListener("change", previewSelectedImage);
    els.resetFormButton.addEventListener("click", resetForm);
    els.saveCatalogueButton.addEventListener("click", saveCatalogue);
    els.uploadCommitButton.addEventListener("click", uploadAndPush);
    els.downloadCatalogueButton.addEventListener("click", downloadCatalogue);
    els.productList.addEventListener("click", handleProductAction);
  }

  function handleLogout() {
    sessionStorage.removeItem("glow-admin-auth");
    state.pendingFiles.clear();
    window.location.href = "login.html";
  }

  async function loadProducts() {
    state.products = await window.GlowStore.loadProducts();
    renderProducts();
    setStatus("Catalogue loaded.");
  }

  async function checkUploadServer() {
    try {
      const response = await fetch("api/admin-status", { cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      state.canUseUploadServer = Boolean(payload && payload.canCommit);
      els.uploadCommitButton.disabled = !state.canUseUploadServer;

      if (state.canUseUploadServer) {
        setStatus("Upload server connected. Upload & push will commit to GitHub from this computer.");
      } else {
        setStatus("Static mode. Start the local admin server to use Upload & push.");
      }
    } catch (error) {
      state.canUseUploadServer = false;
      els.uploadCommitButton.disabled = true;
      setStatus("Static mode. Start the local admin server to use Upload & push.");
    }
  }

  function previewSelectedImage() {
    const file = els.dressImage.files[0];
    state.selectedFile = file || null;

    if (file) {
      els.imagePreview.src = URL.createObjectURL(file);
    }
  }

  async function saveDress(event) {
    event.preventDefault();
    const name = els.dressName.value.trim();
    const sizes = parseNumericSizes(els.dressSizes.value);

    if (!sizes.length) {
      setStatus("Enter at least one numeric size, for example 36, 38, 40.");
      return;
    }

    const id = state.editingId || uniqueId(window.GlowStore.slugify(name));
    const existingProduct = state.products.find((product) => product.id === state.editingId);
    const imageFile = state.selectedFile;
    const imagePath = imageFile
      ? `assets/uploads/${buildImageFileName(id, imageFile.name)}`
      : existingProduct && existingProduct.image
        ? existingProduct.image
        : "assets/uploads/rose-wrap-midi.png";

    const product = window.GlowStore.normalizeProduct({
      id,
      name,
      description: els.dressDescription.value,
      sizes,
      price: els.dressPrice.value,
      image: imagePath,
      available: els.dressAvailable.checked,
      featured: els.dressFeatured.checked,
      createdAt: existingProduct ? existingProduct.createdAt : new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    });

    if (product.featured) {
      state.products = state.products.map((item) => Object.assign({}, item, { featured: item.id === product.id }));
    }

    if (imageFile) {
      state.pendingFiles.set(product.id, {
        file: imageFile,
        path: imagePath,
      });
    }

    const index = state.products.findIndex((item) => item.id === product.id);
    if (index >= 0) {
      state.products.splice(index, 1, product);
    } else {
      state.products.unshift(product);
    }

    renderProducts();
    resetForm();
    setStatus("Dress saved in the catalogue draft. Use Upload & push to publish it.");
  }

  function saveCatalogue() {
    downloadCatalogue();
    downloadPendingImages();
  }

  async function uploadAndPush() {
    if (!state.canUseUploadServer) {
      setStatus("Start the local admin server with node tools/admin-server.js 8080, then reopen admin.html.");
      return;
    }

    setStatus("Uploading catalogue, committing, and pushing...");
    els.uploadCommitButton.disabled = true;

    try {
      const files = [];
      for (const pending of state.pendingFiles.values()) {
        files.push(await fileToPayload(pending));
      }

      const response = await fetch("api/upload-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: state.products,
          files,
          message: buildCommitMessage(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed.");
      }

      state.pendingFiles.clear();
      setStatus(payload.message || "Catalogue uploaded and pushed.");
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
      state.products = products.map(window.GlowStore.normalizeProduct);
      state.pendingFiles.clear();
      resetForm();
      renderProducts();
      setStatus("JSON catalogue imported.");
    } catch (error) {
      setStatus("The selected JSON file could not be imported.");
    } finally {
      event.target.value = "";
    }
  }

  function renderProducts() {
    const sorted = window.GlowStore.sortProducts(state.products, "featured");
    els.productList.innerHTML = sorted.map(renderAdminProduct).join("");
    els.adminCount.textContent = `${state.products.length} ${state.products.length === 1 ? "dress" : "dresses"}`;
    window.GlowStore.refreshIcons();
  }

  function renderAdminProduct(product) {
    const pending = state.pendingFiles.has(product.id) ? '<span class="pill alert">Image pending</span>' : "";
    const status = product.available ? '<span class="pill">Available</span>' : '<span class="pill muted">Hidden</span>';

    return `
      <article class="admin-product">
        <img src="${window.GlowStore.escapeHtml(product.image)}" alt="${window.GlowStore.escapeHtml(product.name)}">
        <div>
          <h3>${window.GlowStore.escapeHtml(product.name)}</h3>
          <p>Sizes ${window.GlowStore.escapeHtml(product.sizes.join(", "))} - ${window.GlowStore.formatPrice(product.price)}</p>
          <div class="mini-pills">${status}${product.featured ? '<span class="pill accent">Featured</span>' : ""}${pending}</div>
        </div>
        <div class="admin-actions">
          <button class="icon-button" type="button" data-action="edit" data-id="${window.GlowStore.escapeHtml(product.id)}" aria-label="Edit ${window.GlowStore.escapeHtml(product.name)}">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="icon-button danger" type="button" data-action="delete" data-id="${window.GlowStore.escapeHtml(product.id)}" aria-label="Delete ${window.GlowStore.escapeHtml(product.name)}">
            <i data-lucide="trash-2" aria-hidden="true"></i>
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
    if (!product) {
      return;
    }

    if (button.dataset.action === "edit") {
      editProduct(product);
    }

    if (button.dataset.action === "delete") {
      deleteProduct(product);
    }
  }

  function editProduct(product) {
    state.editingId = product.id;
    els.editingId.value = product.id;
    els.formTitle.textContent = "Edit Dress";
    els.dressName.value = product.name;
    els.dressDescription.value = product.description;
    els.dressSizes.value = product.sizes.join(", ");
    els.dressPrice.value = product.price;
    els.dressAvailable.checked = product.available;
    els.dressFeatured.checked = product.featured;
    els.imagePreview.src = product.image;
    els.dressImage.value = "";
    state.selectedFile = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteProduct(product) {
    state.products = state.products.filter((item) => item.id !== product.id);
    state.pendingFiles.delete(product.id);
    if (state.editingId === product.id) {
      resetForm();
    }
    renderProducts();
    setStatus(`${product.name} removed from the catalogue draft. Use Upload & push to publish the change.`);
  }

  function resetForm() {
    state.editingId = "";
    state.selectedFile = null;
    els.dressForm.reset();
    els.editingId.value = "";
    els.formTitle.textContent = "Add Dress";
    els.dressAvailable.checked = true;
    els.dressFeatured.checked = false;
    els.imagePreview.src = "assets/uploads/rose-wrap-midi.png";
  }

  function setStatus(message) {
    els.adminStatus.textContent = message;
  }

  function uniqueId(baseId) {
    let candidate = baseId;
    let count = 2;

    while (state.products.some((product) => product.id === candidate)) {
      candidate = `${baseId}-${count}`;
      count += 1;
    }

    return candidate;
  }

  function parseNumericSizes(value) {
    return String(value || "")
      .split(",")
      .map((size) => size.trim().replace(/[^\d]/g, ""))
      .filter(Boolean);
  }

  function buildImageFileName(id, originalName) {
    const extension = originalName.includes(".") ? originalName.split(".").pop().toLowerCase() : "jpg";
    return `${id}.${extension.replace(/[^a-z0-9]/g, "") || "jpg"}`;
  }

  function buildCommitMessage() {
    const editedCount = state.products.length;
    return `Update dress catalogue (${editedCount} ${editedCount === 1 ? "item" : "items"})`;
  }

  async function fileToPayload(pending) {
    const dataUrl = await readAsDataUrl(pending.file);
    const base64 = dataUrl.split(",")[1] || "";
    return {
      path: pending.path,
      name: pending.file.name,
      type: pending.file.type || "application/octet-stream",
      data: base64,
    };
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function downloadCatalogue() {
    downloadBlob(window.GlowStore.toCatalogueJson(state.products), "dresses.json", "application/json");
    setStatus("dresses.json downloaded.");
  }

  function downloadPendingImages() {
    let delay = 250;
    state.pendingFiles.forEach((pending) => {
      window.setTimeout(() => {
        downloadBlob(pending.file, pending.path.split("/").pop(), pending.file.type || "application/octet-stream");
      }, delay);
      delay += 250;
    });
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

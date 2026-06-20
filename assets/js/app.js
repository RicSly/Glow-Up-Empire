(function () {
  const state = {
    products: [],
    filteredProducts: [],
    activeProduct: null,
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();

    state.products = (await window.GlowStore.loadProducts()).filter((product) => product.available);
    applyFilters();
    renderSpotlight();
    window.GlowStore.refreshIcons();
  }

  function cacheElements() {
    els.grid = document.getElementById("productGrid");
    els.emptyState = document.getElementById("emptyState");
    els.resultCount = document.getElementById("resultCount");
    els.searchInput = document.getElementById("searchInput");
    els.sortSelect = document.getElementById("sortSelect");
    els.productModal = document.getElementById("productModal");
    els.offerModal = document.getElementById("offerModal");
    els.modalImage = document.getElementById("modalImage");
    els.modalTitle = document.getElementById("modalTitle");
    els.modalPrice = document.getElementById("modalPrice");
    els.modalDescription = document.getElementById("modalDescription");
    els.modalSizes = document.getElementById("modalSizes");
    els.openOfferButton = document.getElementById("openOfferButton");
    els.selectedDressText = document.getElementById("selectedDressText");
    els.offerForm = document.getElementById("offerForm");
    els.spotlightImage = document.getElementById("spotlightImage");
    els.spotlightName = document.getElementById("spotlightName");
    els.spotlightPrice = document.getElementById("spotlightPrice");
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", applyFilters);
    els.sortSelect.addEventListener("change", applyFilters);
    els.grid.addEventListener("click", handleGridClick);
    els.openOfferButton.addEventListener("click", openOfferModal);
    els.offerForm.addEventListener("submit", submitOffer);

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", closeProductModal);
    });

    document.querySelectorAll("[data-close-offer]").forEach((button) => {
      button.addEventListener("click", closeOfferModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeOfferModal();
        closeProductModal();
      }
    });
  }

  function applyFilters() {
    const query = els.searchInput.value.trim().toLowerCase();

    const filtered = state.products.filter((product) => {
      const matchesQuery = [product.name, product.description, product.sizes.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);
      return matchesQuery;
    });

    state.filteredProducts = window.GlowStore.sortProducts(filtered, els.sortSelect.value);
    renderProducts();
  }

  function renderProducts() {
    els.grid.innerHTML = state.filteredProducts.map(renderProductCard).join("");
    els.emptyState.hidden = state.filteredProducts.length > 0;
    els.resultCount.textContent = `${state.filteredProducts.length} ${state.filteredProducts.length === 1 ? "dress" : "dresses"}`;
    window.GlowStore.refreshIcons();
  }

  function renderProductCard(product) {
    return `
      <article class="product-card">
        <button class="product-image-button" type="button" data-product-id="${window.GlowStore.escapeHtml(product.id)}" aria-label="Open ${window.GlowStore.escapeHtml(product.name)} details">
          <img src="${window.GlowStore.escapeHtml(product.image)}" alt="${window.GlowStore.escapeHtml(product.name)}" loading="lazy">
          ${product.featured ? '<span class="image-badge">Featured</span>' : ""}
        </button>
        <div class="product-card-body">
          <div>
            <h3>${window.GlowStore.escapeHtml(product.name)}</h3>
            <p>${window.GlowStore.escapeHtml(product.description)}</p>
          </div>
          <div class="card-meta">
            <strong>${window.GlowStore.formatPrice(product.price)}</strong>
            <span>Sizes ${product.sizes.map(window.GlowStore.escapeHtml).join(", ")}</span>
          </div>
          <button class="secondary-button full-width" type="button" data-product-id="${window.GlowStore.escapeHtml(product.id)}">
            <i data-lucide="eye" aria-hidden="true"></i>
            View dress
          </button>
        </div>
      </article>
    `;
  }

  function renderSpotlight() {
    const featured = state.products.find((product) => product.featured) || state.products[0];
    if (!featured) {
      return;
    }

    els.spotlightImage.src = featured.image;
    els.spotlightImage.alt = featured.name;
    els.spotlightName.textContent = featured.name;
    els.spotlightPrice.textContent = window.GlowStore.formatPrice(featured.price);
  }

  function handleGridClick(event) {
    const trigger = event.target.closest("[data-product-id]");
    if (!trigger) {
      return;
    }

    const product = state.products.find((item) => item.id === trigger.dataset.productId);
    if (product) {
      openProductModal(product);
    }
  }

  function openProductModal(product) {
    state.activeProduct = product;
    els.modalImage.src = product.image;
    els.modalImage.alt = product.name;
    els.modalTitle.textContent = product.name;
    els.modalPrice.textContent = window.GlowStore.formatPrice(product.price);
    els.modalDescription.textContent = product.description;
    els.modalSizes.innerHTML = product.sizes.map((size) => `<span class="chip">${window.GlowStore.escapeHtml(size)}</span>`).join("");
    showModal(els.productModal);
    window.GlowStore.refreshIcons();
  }

  function closeProductModal() {
    hideModal(els.productModal);
  }

  function openOfferModal() {
    if (!state.activeProduct) {
      return;
    }

    els.selectedDressText.textContent = `${state.activeProduct.name} - ${window.GlowStore.formatPrice(state.activeProduct.price)}`;
    showModal(els.offerModal);
    document.getElementById("customerName").focus();
  }

  function closeOfferModal() {
    hideModal(els.offerModal);
  }

  function submitOffer(event) {
    event.preventDefault();
    if (!state.activeProduct) {
      return;
    }

    const formData = new FormData(els.offerForm);
    const customer = {
      name: formData.get("name").trim(),
      location: formData.get("location").trim(),
      room: formData.get("room").trim(),
    };

    const whatsappUrl = window.GlowStore.buildWhatsAppUrl(state.activeProduct, customer);
    window.open(whatsappUrl, "_blank", "noopener");
    els.offerForm.reset();
    closeOfferModal();
    closeProductModal();
  }

  function showModal(modal) {
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function hideModal(modal) {
    modal.hidden = true;
    if (els.productModal.hidden && els.offerModal.hidden) {
      document.body.classList.remove("modal-open");
    }
  }
})();

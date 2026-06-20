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
    els.modalFrontImage = document.getElementById("modalFrontImage");
    els.modalBackImage = document.getElementById("modalBackImage");
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
      return [
        window.GlowStore.getProductTitle(product),
        window.GlowStore.getProductDescription(product),
        product.sizes.join(" "),
        window.GlowStore.formatSlot(product.slotNumber),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
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
    const title = window.GlowStore.getProductTitle(product);
    const description = window.GlowStore.getProductDescription(product);
    const slot = window.GlowStore.formatSlot(product.slotNumber);

    return `
      <article class="product-card">
        <button class="product-image-button" type="button" data-product-id="${window.GlowStore.escapeHtml(product.id)}" aria-label="Open ${window.GlowStore.escapeHtml(title)} details">
          <img src="${window.GlowStore.escapeHtml(product.frontImage)}" alt="${window.GlowStore.escapeHtml(title)} front view" loading="lazy" onerror="window.GlowStore.useFallbackImage(this)">
          ${product.featured ? '<span class="image-badge">Featured</span>' : ""}
        </button>
        <div class="product-card-body">
          <div>
            <p class="slot-label">Slot ${slot}</p>
            <h3>${window.GlowStore.escapeHtml(title)}</h3>
            <p>${window.GlowStore.escapeHtml(description)}</p>
          </div>
          <div class="card-meta">
            <strong>${window.GlowStore.formatPrice(product.price)}</strong>
            <span>Sizes ${window.GlowStore.escapeHtml(window.GlowStore.getSizeText(product))}</span>
          </div>
          <button class="secondary-button full-width" type="button" data-product-id="${window.GlowStore.escapeHtml(product.id)}">
            <i data-lucide="eye" aria-hidden="true"></i>
            View front & back
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

    const title = window.GlowStore.getProductTitle(featured);
    els.spotlightImage.src = featured.frontImage;
    els.spotlightImage.onerror = function () {
      window.GlowStore.useFallbackImage(this);
    };
    els.spotlightImage.alt = `${title} front view`;
    els.spotlightName.textContent = title;
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
    const title = window.GlowStore.getProductTitle(product);
    state.activeProduct = product;
    els.modalImage.src = product.frontImage;
    els.modalImage.onerror = function () {
      window.GlowStore.useFallbackImage(this);
    };
    els.modalImage.alt = `${title} front view`;
    els.modalFrontImage.src = product.frontImage;
    els.modalFrontImage.alt = `${title} front view`;
    els.modalFrontImage.onerror = function () {
      window.GlowStore.useFallbackImage(this);
    };
    els.modalBackImage.src = product.backImage;
    els.modalBackImage.alt = `${title} back view`;
    els.modalBackImage.onerror = function () {
      window.GlowStore.useFallbackImage(this);
    };
    els.modalTitle.textContent = title;
    els.modalPrice.textContent = window.GlowStore.formatPrice(product.price);
    els.modalDescription.textContent = window.GlowStore.getProductDescription(product);
    els.modalSizes.innerHTML = product.sizes.length
      ? product.sizes.map((size) => `<span class="chip">${window.GlowStore.escapeHtml(size)}</span>`).join("")
      : '<span class="chip">Ask for availability</span>';
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

    els.selectedDressText.textContent = `${window.GlowStore.getProductTitle(state.activeProduct)} - ${window.GlowStore.formatPrice(state.activeProduct.price)}`;
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

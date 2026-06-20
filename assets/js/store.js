(function () {
  const STORE_CONFIG = {
    businessName: "GlowUp Empire",
    dataUrl: "data/dresses.json",
    whatsappNumber: "233546904688",
    currency: "GHS",
    adminUsername: "admin",
    adminPasswordHash: "b9eb5dc799f31a2d2e761dcfc04cc46a62da0bf2199cede38867ac85447d587f",
    slotCount: 100,
    imageBasePath: "assets/uploads/dress-slots",
    fallbackImage: "assets/uploads/dress-placeholder.svg",
  };

  function createDefaultProducts() {
    return Array.from({ length: STORE_CONFIG.slotCount }, (_, index) => {
      const slotNumber = index + 1;
      const slot = formatSlot(slotNumber);

      return {
        id: `dress-${slot}`,
        slotNumber,
        name: "",
        description: "",
        sizes: [],
        price: 0,
        frontImage: `${STORE_CONFIG.imageBasePath}/dress-${slot}-front.jpg`,
        backImage: `${STORE_CONFIG.imageBasePath}/dress-${slot}-back.jpg`,
        available: true,
        featured: slotNumber === 1,
        createdAt: "2026-06-20",
        updatedAt: "",
      };
    });
  }

  const fallbackProducts = createDefaultProducts();

  function formatSlot(value) {
    return String(Number(value || 1)).padStart(3, "0");
  }

  function normalizeSizes(value) {
    const clean = (size) => String(size).trim().replace(/[^\d]/g, "");

    if (Array.isArray(value)) {
      return value.map(clean).filter(Boolean);
    }

    return String(value || "")
      .split(",")
      .map(clean)
      .filter(Boolean);
  }

  function normalizeProduct(product) {
    const id = String(product.id || "").trim();
    const slotNumber = Number(product.slotNumber || id.replace(/[^\d]/g, "") || 1);
    const slot = formatSlot(slotNumber);
    const defaultProduct = fallbackProducts[slotNumber - 1] || fallbackProducts[0];
    const legacyImage = String(product.image || "").trim();

    return {
      id: `dress-${slot}`,
      slotNumber,
      name: String(product.name || "").trim(),
      description: String(product.description || "").trim(),
      sizes: normalizeSizes(product.sizes),
      price: Number(product.price || 0),
      frontImage: String(product.frontImage || legacyImage || defaultProduct.frontImage).trim(),
      backImage: String(product.backImage || defaultProduct.backImage).trim(),
      available: product.available !== false,
      featured: Boolean(product.featured),
      createdAt: product.createdAt || defaultProduct.createdAt,
      updatedAt: product.updatedAt || "",
    };
  }

  async function loadProducts(options) {
    const settings = Object.assign({ allowFallback: true }, options);

    try {
      const response = await fetch(STORE_CONFIG.dataUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Unable to load ${STORE_CONFIG.dataUrl}`);
      }

      const payload = await response.json();
      const products = Array.isArray(payload) ? payload : payload.products;

      if (!Array.isArray(products)) {
        throw new Error("Catalogue data must be an array.");
      }

      return mergeWithFixedSlots(products);
    } catch (error) {
      if (!settings.allowFallback) {
        throw error;
      }

      return fallbackProducts.map(normalizeProduct);
    }
  }

  function mergeWithFixedSlots(products) {
    const byId = new Map(products.map((product) => {
      const normalized = normalizeProduct(product);
      return [normalized.id, normalized];
    }));

    return fallbackProducts.map((defaultProduct) => {
      const saved = byId.get(defaultProduct.id) || {};
      return normalizeProduct(Object.assign({}, defaultProduct, saved, {
        id: defaultProduct.id,
        slotNumber: defaultProduct.slotNumber,
        frontImage: defaultProduct.frontImage,
        backImage: defaultProduct.backImage,
      }));
    });
  }

  function sortProducts(products, mode) {
    const list = products.slice();

    if (mode === "price-low") {
      return list.sort((a, b) => a.price - b.price || a.slotNumber - b.slotNumber);
    }

    if (mode === "price-high") {
      return list.sort((a, b) => b.price - a.price || a.slotNumber - b.slotNumber);
    }

    if (mode === "name") {
      return list.sort((a, b) => getProductTitle(a).localeCompare(getProductTitle(b)));
    }

    return list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.slotNumber - b.slotNumber);
  }

  function formatPrice(value) {
    const amount = Number(value || 0);

    if (!amount) {
      return "Contact for price";
    }

    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: STORE_CONFIG.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getProductTitle(product) {
    return product.name || `Dress ${formatSlot(product.slotNumber)}`;
  }

  function getProductDescription(product) {
    return product.description || "Front and back views are available. Ask for the current details before purchase.";
  }

  function getSizeText(product) {
    return product.sizes.length ? product.sizes.join(", ") : "Ask for availability";
  }

  function slugify(value) {
    return String(value || "dress")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "dress";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildWhatsAppUrl(product, customer) {
    const roomLine = customer.room ? `Hall/House/Room: ${customer.room}` : "Hall/House/Room: Not provided";
    const lines = [
      `Hello ${STORE_CONFIG.businessName}, I want to place an order.`,
      "",
      `Dress: ${getProductTitle(product)}`,
      `Slot: ${formatSlot(product.slotNumber)}`,
      `Available sizes: ${getSizeText(product)}`,
      `Price: ${formatPrice(product.price)}`,
      "",
      `Name: ${customer.name}`,
      `Location: ${customer.location}`,
      roomLine,
    ];

    return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function toCatalogueJson(products) {
    const cleanProducts = mergeWithFixedSlots(products);
    return `${JSON.stringify(cleanProducts, null, 2)}\n`;
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function useFallbackImage(image) {
    image.onerror = null;
    image.src = STORE_CONFIG.fallbackImage;
  }

  window.GlowStore = {
    config: STORE_CONFIG,
    fallbackProducts,
    createDefaultProducts,
    normalizeProduct,
    normalizeSizes,
    mergeWithFixedSlots,
    loadProducts,
    sortProducts,
    formatPrice,
    formatSlot,
    getProductTitle,
    getProductDescription,
    getSizeText,
    slugify,
    escapeHtml,
    buildWhatsAppUrl,
    toCatalogueJson,
    refreshIcons,
    useFallbackImage,
  };
})();

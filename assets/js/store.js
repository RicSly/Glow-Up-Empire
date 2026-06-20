(function () {
  const STORE_CONFIG = {
    businessName: "GlowUp Empire",
    dataUrl: "data/dresses.json",
    whatsappNumber: "233546904688",
    currency: "GHS",
    adminUsername: "admin",
    adminPasswordHash: "b9eb5dc799f31a2d2e761dcfc04cc46a62da0bf2199cede38867ac85447d587f",
  };

  const fallbackProducts = [
    {
      id: "rose-wrap-midi",
      name: "Rose Wrap Midi Dress",
      description: "Soft rose wrap dress with a flattering tie waist and easy midi length. A polished choice for church, dinners, dates, and campus events.",
      sizes: ["36", "38", "40"],
      price: 180,
      image: "assets/uploads/rose-wrap-midi.png",
      available: true,
      featured: true,
      createdAt: "2026-06-19",
    },
    {
      id: "emerald-evening-maxi",
      name: "Emerald Evening Maxi",
      description: "Elegant emerald maxi dress with a graceful sleeve and a smooth flowing skirt. Made for receptions, programs, and evening occasions.",
      sizes: ["38", "40", "42"],
      price: 260,
      image: "assets/uploads/emerald-evening-maxi.png",
      available: true,
      featured: false,
      createdAt: "2026-06-19",
    },
    {
      id: "floral-day-dress",
      name: "Floral Day Dress",
      description: "Light ivory day dress with navy floral detail and a relaxed fit. Fresh, simple, and comfortable for everyday wear.",
      sizes: ["36", "38", "40", "42"],
      price: 150,
      image: "assets/uploads/floral-day-dress.png",
      available: true,
      featured: false,
      createdAt: "2026-06-19",
    },
  ];

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
    const name = String(product.name || "Untitled Dress").trim();
    const id = String(product.id || slugify(name)).trim();

    return {
      id,
      name,
      description: String(product.description || "").trim(),
      sizes: normalizeSizes(product.sizes),
      price: Number(product.price || 0),
      image: String(product.image || "").trim(),
      available: product.available !== false,
      featured: Boolean(product.featured),
      createdAt: product.createdAt || new Date().toISOString().slice(0, 10),
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

      return products.map(normalizeProduct);
    } catch (error) {
      if (!settings.allowFallback) {
        throw error;
      }

      return fallbackProducts.map(normalizeProduct);
    }
  }

  function sortProducts(products, mode) {
    const list = products.slice();

    if (mode === "price-low") {
      return list.sort((a, b) => a.price - b.price);
    }

    if (mode === "price-high") {
      return list.sort((a, b) => b.price - a.price);
    }

    if (mode === "name") {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: STORE_CONFIG.currency,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
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
      `Dress: ${product.name}`,
      `Available sizes: ${product.sizes.join(", ") || "Ask for availability"}`,
      `Price: ${formatPrice(product.price)}`,
      "",
      `Name: ${customer.name}`,
      `Location: ${customer.location}`,
      roomLine,
    ];

    return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function toCatalogueJson(products) {
    const cleanProducts = products.map(normalizeProduct);
    return `${JSON.stringify(cleanProducts, null, 2)}\n`;
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  window.GlowStore = {
    config: STORE_CONFIG,
    fallbackProducts,
    normalizeProduct,
    normalizeSizes,
    loadProducts,
    sortProducts,
    formatPrice,
    slugify,
    escapeHtml,
    buildWhatsAppUrl,
    toCatalogueJson,
    refreshIcons,
  };
})();

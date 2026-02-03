// =============================================
// CONFIGURATION
// =============================================
const CONFIG = {
  SUPABASE_URL: "https://mpwyzefkazbgnastcahd.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wd3l6ZWZrYXpiZ25hc3RjYWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDg4NTUsImV4cCI6MjA4NTAyNDg1NX0.9bcksevoXtniNvcUiFYhcmWzd8xHDmsY75FJljPO-_4",
  COMPANY_ID: "18b94000-046c-476b-a0f9-ab813e57e3d7",
  CURRENCY: { code: "KZT", symbol: "₸" },
  PAYMENT_METHODS: {
    cash: "8ddd9274-7a24-44c7-bc85-40c6766426a5",
    cashless: "e62fc640-b951-45cb-a27c-dd371cc5e16e"
  }
};

// =============================================
// UTILITIES
// =============================================
const Utils = {
  showToast(text) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = text;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
  },

  formatMoney(amount) {
    return Number(amount || 0).toLocaleString("ru-RU") + " " + CONFIG.CURRENCY.symbol;
  },

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  },

  formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  },

  getPeriodDates(period) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start;
    
    if (period === 'day') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'week') {
      const dayOfWeek = now.getDay() || 7;
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek + 1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
};

// =============================================
// MODE CONFIG
// =============================================
const MODE_CONFIG = {
  sale: { title: "Продажа", action: "ПРОДАТЬ", hasReport: true, reportTitle: "Продажи" },
  receive: { title: "Приход товара", action: "ОПРИХОДОВАТЬ", hasReport: true, reportTitle: "Приходы" },
  return: { title: "Возврат клиенту", action: "ВЕРНУТЬ", hasReport: false },
  writeoff: { title: "Списание", action: "СПИСАТЬ", hasReport: true, reportTitle: "Списания" },
  supplier_refund: { title: "Возврат поставщику", action: "ВЕРНУТЬ ПОСТАВЩИКУ", hasReport: true, reportTitle: "Возвраты поставщику" }
};

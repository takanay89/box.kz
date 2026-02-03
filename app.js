// =============================================
// MAIN APP
// =============================================

let currentUser = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Инициализация auth и проверка авторизации
    await auth.init();
    currentUser = await auth.checkAuth();
    
    if (!currentUser) return;
    
    // Инициализация API
    await api.init();
    
    // Загрузка данных пользователя
    document.getElementById('userName').textContent = currentUser.email;
    
    // Загрузка начального раздела
    changeSection('trading');
    
    // Загрузка товаров и поставщиков
    await products.loadProducts();
    await suppliers.loadSuppliers();
    await customers.loadCustomers();
    
  } catch (error) {
    console.error('App initialization error:', error);
    Utils.showToast('Ошибка инициализации приложения');
  }
});

// =============================================
// NAVIGATION
// =============================================
function changeSection(section) {
  // Обновляем активную ссылку
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === section);
  });
  
  // Загружаем контент раздела
  const content = document.getElementById('mainContent');
  
  switch (section) {
    case 'trading':
      renderTradingSection();
      break;
    case 'products':
      renderProductsSection();
      break;
    case 'suppliers':
      renderSuppliersSection();
      break;
    case 'customers':
      renderCustomersSection();
      break;
    case 'expenses':
      renderExpensesSection();
      break;
    case 'money':
      renderMoneySection();
      break;
    case 'reports':
      renderReportsSection();
      break;
  }
}

// =============================================
// TRADING SECTION
// =============================================
function renderTradingSection() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <div class="section-header flex-between mb-3">
      <h1>Торговля</h1>
    </div>

    <!-- Mode Selector -->
    <div class="period-selector mb-3">
      <button class="period-btn active" onclick="changeTradingMode('sale')">Продажа</button>
      <button class="period-btn" onclick="changeTradingMode('receive')">Приход</button>
      <button class="period-btn" onclick="changeTradingMode('return')">Возврат</button>
      <button class="period-btn" onclick="changeTradingMode('writeoff')">Списание</button>
      <button class="period-btn" onclick="changeTradingMode('supplier_refund')">Возврат поставщику</button>
    </div>

    <div id="tradingContent"></div>
  `;
  
  changeTradingMode('sale');
}

function changeTradingMode(mode) {
  sales.mode = mode;
  
  // Обновляем кнопки
  document.querySelectorAll('#mainContent .period-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  const content = document.getElementById('tradingContent');
  
  if (mode === 'sale') {
    renderSaleMode();
  } else if (mode === 'receive') {
    renderReceiveMode();
  } else if (mode === 'return') {
    renderReturnMode();
  } else if (mode === 'writeoff') {
    renderWriteoffMode();
  } else if (mode === 'supplier_refund') {
    renderSupplierRefundMode();
  }
}

function renderSaleMode() {
  const content = document.getElementById('tradingContent');
  
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 300px 1fr 350px; gap: 1.5rem;">
      <!-- Mini Report -->
      <div class="mini-report">
        <div class="period-selector mb-2">
          <button class="period-btn active" data-period="day" onclick="sales.changePeriod('day')">День</button>
          <button class="period-btn" data-period="week" onclick="sales.changePeriod('week')">Неделя</button>
          <button class="period-btn" data-period="month" onclick="sales.changePeriod('month')">Месяц</button>
        </div>
        
        <div class="report-stats">
          <div class="stat-card">
            <div class="stat-label">Продажи</div>
            <div class="stat-value" id="miniReportCount">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Сумма</div>
            <div class="stat-value" id="miniReportSum">0 ₸</div>
          </div>
        </div>
        
        <div class="mini-operations-list" id="miniOperationsList"></div>
      </div>
      
      <!-- Products -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Товары и услуги</div>
        </div>
        
        <div class="search-container">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Поиск товара..."
            oninput="products.searchProducts(this.value)"
          >
        </div>
        
        <div class="products-grid" id="productsList"></div>
      </div>
      
      <!-- Cart -->
      <div class="cart-container">
        <div class="cart-header">
          <div class="cart-title">Корзина</div>
          <button class="btn-icon" onclick="sales.clearCart()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
            </svg>
          </button>
        </div>
        
        <div class="cart-list" id="cartList">
          <div class="cart-empty">Корзина пуста</div>
        </div>
        
        <div class="cart-summary">
          <div class="summary-row">
            <span>Подытог:</span>
            <span id="cartSubtotal">0 ₸</span>
          </div>
          <div class="summary-row">
            <span>Скидка:</span>
            <span id="cartDiscount">0 ₸</span>
          </div>
          <div class="summary-row total">
            <span>Итого:</span>
            <span id="cartTotal">0 ₸</span>
          </div>
        </div>
        
        <div class="cart-actions">
          <button class="btn btn-secondary" onclick="showDiscountModal()">Скидка</button>
          <button class="btn btn-success" onclick="showPaymentModal()">ПРОДАТЬ</button>
        </div>
      </div>
    </div>
  `;
  
  products.renderProducts();
  sales.loadMiniReport();
}

function renderReturnMode() {
  const content = document.getElementById('tradingContent');
  
  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">Найти продажу для возврата</div>
      </div>
      
      <div class="search-container mb-3">
        <input 
          type="text" 
          class="search-input" 
          placeholder="Поиск по номеру чека, сумме или товару..."
          id="returnSearchInput"
        >
      </div>
      
      <button class="btn btn-primary mb-3" onclick="searchSalesForReturn()">Найти продажи</button>
      
      <div class="sales-grid" id="returnSalesList"></div>
      
      <div id="returnItemsContainer" style="margin-top: 2rem; display: none;">
        <h3 class="mb-2">Выберите товары для возврата</h3>
        <div class="mb-2">Способ оплаты: <strong id="returnPaymentMethod"></strong></div>
        <div id="returnItemsList"></div>
        <button class="btn btn-success mt-3" onclick="sales.completeReturn()">ВЕРНУТЬ</button>
      </div>
    </div>
  `;
}

function searchSalesForReturn() {
  const searchTerm = document.getElementById('returnSearchInput').value;
  if (!searchTerm) {
    Utils.showToast('Введите поисковый запрос');
    return;
  }
  sales.searchSalesForReturn(searchTerm);
}

function renderReceiveMode() {
  const content = document.getElementById('tradingContent');
  
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 400px; gap: 1.5rem;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Выберите товары</div>
        </div>
        
        <div class="search-container">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Поиск товара..."
            oninput="products.searchProducts(this.value)"
          >
        </div>
        
        <div class="products-grid" id="productsList"></div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-title">Приход товара</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Поставщик *</label>
          <select class="form-select supplier-select" id="receiveSupplier" required>
            <option value="">Выберите поставщика</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Комментарий</label>
          <textarea class="form-textarea" id="receiveComment" rows="3"></textarea>
        </div>
        
        <div id="operationCart"></div>
        
        <button class="btn btn-success" style="width: 100%; margin-top: 1rem;" onclick="completeReceive()">
          ОПРИХОДОВАТЬ
        </button>
      </div>
    </div>
  `;
  
  products.renderProducts();
  suppliers.updateSupplierSelects();
}

function completeReceive() {
  const supplierId = document.getElementById('receiveSupplier').value;
  const comment = document.getElementById('receiveComment').value;
  products.completeReceive(supplierId, comment);
}

function renderWriteoffMode() {
  const content = document.getElementById('tradingContent');
  
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 400px; gap: 1.5rem;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Выберите товары</div>
        </div>
        
        <div class="search-container">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Поиск товара..."
            oninput="products.searchProducts(this.value)"
          >
        </div>
        
        <div class="products-grid" id="productsList"></div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-title">Списание</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Причина</label>
          <textarea class="form-textarea" id="writeoffReason" rows="3" placeholder="Укажите причину списания"></textarea>
        </div>
        
        <div id="operationCart"></div>
        
        <button class="btn btn-danger" style="width: 100%; margin-top: 1rem;" onclick="completeWriteoff()">
          СПИСАТЬ
        </button>
      </div>
    </div>
  `;
  
  products.renderProducts();
}

function completeWriteoff() {
  const reason = document.getElementById('writeoffReason').value;
  products.completeWriteoff(reason);
}

function renderSupplierRefundMode() {
  const content = document.getElementById('tradingContent');
  
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 400px; gap: 1.5rem;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Выберите товары</div>
        </div>
        
        <div class="search-container">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Поиск товара..."
            oninput="products.searchProducts(this.value)"
          >
        </div>
        
        <div class="products-grid" id="productsList"></div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-title">Возврат поставщику</div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Поставщик *</label>
          <select class="form-select supplier-select" id="refundSupplier" required>
            <option value="">Выберите поставщика</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Комментарий</label>
          <textarea class="form-textarea" id="refundComment" rows="3"></textarea>
        </div>
        
        <div id="operationCart"></div>
        
        <button class="btn btn-warning" style="width: 100%; margin-top: 1rem;" onclick="completeSupplierRefund()">
          ВЕРНУТЬ ПОСТАВЩИКУ
        </button>
      </div>
    </div>
  `;
  
  products.renderProducts();
  suppliers.updateSupplierSelects();
}

function completeSupplierRefund() {
  const supplierId = document.getElementById('refundSupplier').value;
  const comment = document.getElementById('refundComment').value;
  products.completeSupplierRefund(supplierId, comment);
}

// =============================================
// PRODUCTS SECTION
// =============================================
function renderProductsSection() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <div class="section-header flex-between mb-3">
      <h1>Товары и услуги</h1>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="products.triggerExcelImport()">Импорт Excel</button>
        <button class="btn btn-primary" onclick="products.showProductForm()">+ Товар</button>
        <button class="btn btn-primary" onclick="showAddServiceForm()">+ Услуга</button>
      </div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Цена</th>
            <th>Остаток</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody id="productsTable"></tbody>
      </table>
    </div>
  `;
  
  renderProductsTable();
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTable');
  if (!tbody) return;
  
  tbody.innerHTML = products.products.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.type === 'product' ? 'Товар' : 'Услуга'}</td>
      <td>${Utils.formatMoney(p.sale_price)}</td>
      <td>${p.type === 'product' ? p.balance + ' шт' : '—'}</td>
      <td>
        <button class="btn-icon" onclick="products.showProductForm('${p.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
          </svg>
        </button>
        <button class="btn-icon btn-delete" onclick="products.deleteProduct('${p.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function showAddServiceForm() {
  // Открываем форму с типом "service"
  products.showProductForm();
  setTimeout(() => {
    document.getElementById('productType').value = 'service';
  }, 100);
}

// =============================================
// SUPPLIERS SECTION
// =============================================
function renderSuppliersSection() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <div class="section-header flex-between mb-3">
      <h1>Поставщики</h1>
      <button class="btn btn-primary" onclick="suppliers.showSupplierForm()">+ Поставщик</button>
    </div>

    <div class="entities-grid" id="suppliersList"></div>
  `;
  
  suppliers.renderSuppliers();
}

// =============================================
// CUSTOMERS SECTION
// =============================================
function renderCustomersSection() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <div class="section-header flex-between mb-3">
      <h1>Клиенты</h1>
      <button class="btn btn-primary" onclick="customers.showCustomerForm()">+ Клиент</button>
    </div>

    <div class="entities-grid" id="customersList"></div>
  `;
  
  customers.renderCustomers();
}

// =============================================
// EXPENSES SECTION
// =============================================
function renderExpensesSection() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <div class="section-header flex-between mb-3">
      <h1>Расходы</h1>
      <button class="btn btn-primary" onclick="showAddExpenseModal()">+ Расход</button>
    </div>

    <div class="filters-container">
      <div class="filters-row">
        <div class="form-group">
          <label class="form-label">Дата с</label>
          <input type="date" class="form-input" id="expenseStartDate">
        </div>
        <div class="form-group">
          <label class="form-label">Дата по</label>
          <input type="date" class="form-input" id="expenseEndDate">
        </div>
        <div class="form-group">
          <label class="form-label">Категория</label>
          <select class="form-select" id="expenseCategory">
            <option value="">Все категории</option>
            <option value="rent">Аренда</option>
            <option value="salary">Зарплата</option>
            <option value="marketing">Маркетинг</option>
            <option value="taxes">Налоги</option>
            <option value="other">Прочие расходы</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">&nbsp;</label>
          <button class="btn btn-primary" onclick="loadExpenses()">Применить</button>
        </div>
      </div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Категория</th>
            <th>Описание</th>
            <th>Сумма</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody id="expensesTable"></tbody>
      </table>
    </div>
  `;
  
  loadExpenses();
}

async function loadExpenses() {
  // TODO: реализовать загрузку расходов
  Utils.showToast('Загрузка расходов...');
}

// =============================================
// MONEY SECTION
// =============================================
function renderMoneySection() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <div class="section-header mb-3">
      <h1>Деньги</h1>
    </div>

    <div id="moneyContent"></div>
  `;
  
  loadMoneyData();
}

async function loadMoneyData() {
  try {
    const balance = await api.getCashBalance();
    
    const content = document.getElementById('moneyContent');
    content.innerHTML = `
      <div class="balance-section">
        <div class="balance-cards">
          <div class="balance-card">
            <div class="balance-label">Наличные</div>
            <div class="balance-value">${Utils.formatMoney(balance?.cash_balance || 0)}</div>
          </div>
          <div class="balance-card">
            <div class="balance-label">Безнал</div>
            <div class="balance-value">${Utils.formatMoney(balance?.cashless_balance || 0)}</div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Load money error:', error);
    Utils.showToast('Ошибка загрузки данных');
  }
}

// =============================================
// REPORTS SECTION
// =============================================
function renderReportsSection() {
  const content = document.getElementById('mainContent');
  
  content.innerHTML = `
    <div class="section-header mb-3">
      <h1>Отчёты</h1>
    </div>

    <div class="tabs-container">
      <div class="tabs-header">
        <button class="report-tab active" data-tab="summary" onclick="reports.changeTab('summary')">Сводка</button>
        <button class="report-tab" data-tab="daily" onclick="reports.changeTab('daily')">По дням</button>
        <button class="report-tab" data-tab="products" onclick="reports.changeTab('products')">По товарам</button>
        <button class="report-tab" data-tab="money" onclick="reports.changeTab('money')">Деньги</button>
        <button class="report-tab" data-tab="pl" onclick="reports.changeTab('pl')">P&L</button>
        <button class="report-tab" data-tab="history" onclick="reports.changeTab('history')">История</button>
      </div>

      <div class="period-selector mb-3">
        <button class="period-btn active" data-period="day" onclick="reports.changePeriod('day')">День</button>
        <button class="period-btn" data-period="week" onclick="reports.changePeriod('week')">Неделя</button>
        <button class="period-btn" data-period="month" onclick="reports.changePeriod('month')">Месяц</button>
      </div>

      <div id="summaryReport" class="report-content"></div>
      <div id="dailyReport" class="report-content" style="display: none;"></div>
      <div id="productsReport" class="report-content" style="display: none;"></div>
      <div id="moneyReport" class="report-content" style="display: none;"></div>
      <div id="plReport" class="report-content" style="display: none;"></div>
      <div id="historyReport" class="report-content" style="display: none;"></div>
    </div>
  `;
  
  reports.loadTabData('summary');
}

// =============================================
// MODALS
// =============================================
function showPaymentModal() {
  if (sales.cart.length === 0) {
    Utils.showToast('Корзина пуста');
    return;
  }

  const modal = createModal('Оплата', `
    <div class="form-group">
      <label class="form-label">Способ оплаты</label>
      <select class="form-select" id="paymentMethod">
        <option value="${CONFIG.PAYMENT_METHODS.cash}">Наличные</option>
        <option value="${CONFIG.PAYMENT_METHODS.cashless}">Безнал</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">Комментарий</label>
      <textarea class="form-textarea" id="saleComment" rows="3" placeholder="Например: Kaspi"></textarea>
    </div>
  `, async () => {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const comment = document.getElementById('saleComment').value;
    
    const success = await sales.completeSale(paymentMethod, comment);
    if (success) {
      closeModal();
    }
  });
}

function showDiscountModal() {
  const modal = createModal('Скидка', `
    <div class="form-group">
      <label class="form-label">Тип скидки</label>
      <select class="form-select" id="discountType">
        <option value="percent">Процент</option>
        <option value="amount">Сумма</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">Значение</label>
      <input type="number" class="form-input" id="discountValue" min="0" step="0.01">
    </div>
  `, () => {
    const type = document.getElementById('discountType').value;
    const value = document.getElementById('discountValue').value;
    
    sales.applyDiscount(type, value);
    closeModal();
  });
}

function createModal(title, bodyHTML, onConfirm) {
  const existingModal = document.getElementById('dynamicModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'dynamicModal';
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        ${bodyHTML}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
        <button class="btn btn-primary" id="modalConfirmBtn">Подтвердить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('modalConfirmBtn').onclick = onConfirm;

  return modal;
}

function closeModal() {
  const modal = document.getElementById('dynamicModal');
  if (modal) modal.remove();
}

// =============================================
// USER MENU
// =============================================
function toggleUserMenu() {
  if (confirm('Выйти из системы?')) {
    auth.signOut();
  }
}

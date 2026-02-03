// =============================================
// SALES MODULE
// =============================================

class Sales {
  constructor() {
    this.currentSection = 'trading';
    this.mode = 'sale';
    this.currentPeriod = 'day';
    this.cart = [];
    this.selectedSale = null;
    this.currentDiscount = { percent: 0, amount: 0 };
  }

  // =============================================
  // CART MANAGEMENT
  // =============================================
  addToCart(product, quantity = 1) {
    const existing = this.cart.find(item => item.product_id === product.id);
    
    if (existing) {
      existing.quantity += quantity;
      existing.total = existing.quantity * existing.price;
    } else {
      this.cart.push({
        product_id: product.id,
        product_name: product.name,
        product_type: product.type,
        quantity: quantity,
        price: Number(product.sale_price),
        purchase_price: Number(product.purchase_price || 0),
        total: quantity * Number(product.sale_price),
        balance: product.balance
      });
    }
    
    this.renderCart();
    this.updateCartTotal();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.product_id !== productId);
    this.renderCart();
    this.updateCartTotal();
  }

  updateCartQuantity(productId, quantity) {
    const item = this.cart.find(item => item.product_id === productId);
    if (item) {
      item.quantity = Number(quantity);
      item.total = item.quantity * item.price;
      this.updateCartTotal();
    }
  }

  clearCart() {
    this.cart = [];
    this.currentDiscount = { percent: 0, amount: 0 };
    this.renderCart();
    this.updateCartTotal();
  }

  renderCart() {
    const cartList = document.getElementById('cartList');
    if (!cartList) return;

    if (this.cart.length === 0) {
      cartList.innerHTML = '<div class="cart-empty">Корзина пуста</div>';
      return;
    }

    cartList.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.product_name}</div>
          <div class="cart-item-price">${Utils.formatMoney(item.price)}</div>
        </div>
        <div class="cart-item-controls">
          <input 
            type="number" 
            class="cart-qty-input" 
            value="${item.quantity}"
            min="1"
            ${item.product_type === 'product' ? `max="${item.balance}"` : ''}
            onchange="sales.updateCartQuantity('${item.product_id}', this.value)"
          >
          <button class="btn-remove" onclick="sales.removeFromCart('${item.product_id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M6 18L18 6" stroke-width="2"/>
            </svg>
          </button>
        </div>
        <div class="cart-item-total">${Utils.formatMoney(item.total)}</div>
      </div>
    `).join('');
  }

  updateCartTotal() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
    const discount = this.currentDiscount.amount || (subtotal * this.currentDiscount.percent / 100);
    const total = subtotal - discount;

    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const totalEl = document.getElementById('cartTotal');

    if (subtotalEl) subtotalEl.textContent = Utils.formatMoney(subtotal);
    if (discountEl) discountEl.textContent = Utils.formatMoney(discount);
    if (totalEl) totalEl.textContent = Utils.formatMoney(total);
  }

  // =============================================
  // DISCOUNT
  // =============================================
  applyDiscount(type, value) {
    if (type === 'percent') {
      this.currentDiscount = { percent: Number(value), amount: 0 };
    } else {
      this.currentDiscount = { percent: 0, amount: Number(value) };
    }
    this.updateCartTotal();
  }

  // =============================================
  // SALE OPERATIONS
  // =============================================
  async completeSale(paymentMethod, comment = '') {
    try {
      if (this.cart.length === 0) {
        throw new Error('Корзина пуста');
      }

      const subtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
      const discount = this.currentDiscount.amount || (subtotal * this.currentDiscount.percent / 100);
      const total = subtotal - discount;

      const saleData = {
        payment_method: paymentMethod,
        total_amount: total,
        discount_amount: discount,
        comment: comment
      };

      await api.createSale(saleData, this.cart);

      Utils.showToast('Продажа успешно оформлена');
      this.clearCart();
      await this.loadMiniReport();

      return true;
    } catch (error) {
      console.error('Complete sale error:', error);
      Utils.showToast('Ошибка при оформлении продажи: ' + error.message);
      return false;
    }
  }

  // =============================================
  // RETURNS
  // =============================================
  async searchSalesForReturn(searchTerm) {
    try {
      const sales = await api.searchSales(searchTerm);
      this.renderSalesForReturn(sales);
    } catch (error) {
      console.error('Search sales error:', error);
      Utils.showToast('Ошибка поиска: ' + error.message);
    }
  }

  renderSalesForReturn(sales) {
    const salesList = document.getElementById('returnSalesList');
    if (!salesList) return;

    if (sales.length === 0) {
      salesList.innerHTML = '<div class="no-results">Продажи не найдены</div>';
      return;
    }

    salesList.innerHTML = sales.map(sale => `
      <div class="sale-card" onclick="sales.selectSaleForReturn('${sale.id}')">
        <div class="sale-header">
          <div class="sale-number">Чек #${sale.id.slice(0, 8)}</div>
          <div class="sale-date">${Utils.formatDateShort(sale.operation_at)}</div>
        </div>
        <div class="sale-amount">${Utils.formatMoney(sale.total_amount)}</div>
        <div class="sale-items">
          ${sale.sale_items.map(item => 
            `<div class="sale-item-row">${item.products?.name} × ${item.quantity}</div>`
          ).join('')}
        </div>
      </div>
    `).join('');
  }

  async selectSaleForReturn(saleId) {
    try {
      const sale = await api.getSaleById(saleId);
      this.selectedSale = sale;
      this.renderReturnItems(sale);
    } catch (error) {
      console.error('Select sale error:', error);
      Utils.showToast('Ошибка: ' + error.message);
    }
  }

  renderReturnItems(sale) {
    const itemsList = document.getElementById('returnItemsList');
    const paymentMethod = document.getElementById('returnPaymentMethod');
    
    if (!itemsList) return;

    // Показываем способ оплаты исходной продажи
    if (paymentMethod) {
      paymentMethod.textContent = sale.payment_method === CONFIG.PAYMENT_METHODS.cash ? 'Нал' : 'Безнал';
    }

    itemsList.innerHTML = sale.sale_items.map(item => `
      <div class="return-item">
        <div class="return-item-info">
          <div class="return-item-name">${item.products?.name}</div>
          <div class="return-item-original">Продано: ${item.quantity} шт</div>
        </div>
        <div class="return-item-controls">
          <input 
            type="number" 
            class="return-qty-input" 
            id="return-qty-${item.id}"
            value="0"
            min="0"
            max="${item.quantity}"
          >
          <span class="return-item-price">${Utils.formatMoney(item.price * item.quantity)}</span>
        </div>
      </div>
    `).join('');
  }

  async completeReturn() {
    try {
      if (!this.selectedSale) {
        throw new Error('Продажа не выбрана');
      }

      const items = [];
      this.selectedSale.sale_items.forEach(item => {
        const qtyInput = document.getElementById(`return-qty-${item.id}`);
        const quantity = Number(qtyInput?.value || 0);
        
        if (quantity > 0) {
          items.push({
            sale_item_id: item.id,
            quantity: quantity
          });
        }
      });

      if (items.length === 0) {
        throw new Error('Выберите товары для возврата');
      }

      await api.createReturn(
        this.selectedSale.id, 
        items, 
        this.selectedSale.payment_method
      );

      Utils.showToast('Возврат успешно оформлен');
      this.selectedSale = null;
      document.getElementById('returnItemsList').innerHTML = '';
      document.getElementById('returnSalesList').innerHTML = '';

      return true;
    } catch (error) {
      console.error('Complete return error:', error);
      Utils.showToast('Ошибка при оформлении возврата: ' + error.message);
      return false;
    }
  }

  // =============================================
  // MINI REPORTS
  // =============================================
  async loadMiniReport() {
    const cfg = MODE_CONFIG[this.mode];
    if (!cfg || !cfg.hasReport) return;
    
    const { start, end } = Utils.getPeriodDates(this.currentPeriod);
    
    try {
      if (this.mode === 'sale') {
        await this.loadSalesMiniReport(start, end);
      }
    } catch (error) {
      console.error('Error loading mini report:', error);
    }
  }

  async loadSalesMiniReport(start, end) {
    const sales = await api.getSales(start, end);
    
    const count = sales.length;
    const sum = sales.reduce((s, sale) => s + Number(sale.total_amount || 0), 0);

    this.updateMiniReportUI(count, sum);
    this.renderMiniOperationsList(sales);
  }

  updateMiniReportUI(count, sum) {
    const countEl = document.getElementById('miniReportCount');
    const sumEl = document.getElementById('miniReportSum');
    
    if (countEl) countEl.textContent = count;
    if (sumEl) sumEl.textContent = Utils.formatMoney(sum);
  }

  renderMiniOperationsList(operations) {
    const listEl = document.getElementById('miniOperationsList');
    if (!listEl) return;
    
    if (operations.length === 0) {
      listEl.innerHTML = '<div class="no-operations">Нет операций</div>';
      return;
    }
    
    listEl.innerHTML = operations.slice(0, 10).map(op => `
      <div class="mini-operation-item" onclick="sales.showOperationDetails('${op.id}')">
        <div class="operation-time">${Utils.formatDateShort(op.operation_at)}</div>
        <div class="operation-amount">${Utils.formatMoney(op.total_amount)}</div>
      </div>
    `).join('');
  }

  async showOperationDetails(operationId) {
    try {
      const sale = await api.getSaleById(operationId);
      
      const modal = document.getElementById('operationModal');
      const content = document.getElementById('operationContent');
      
      if (!modal || !content) return;

      content.innerHTML = `
        <div class="operation-details">
          <div class="detail-row">
            <span>Чек:</span>
            <span>#${sale.id.slice(0, 8)}</span>
          </div>
          <div class="detail-row">
            <span>Дата:</span>
            <span>${Utils.formatDate(sale.operation_at)}</span>
          </div>
          <div class="detail-row">
            <span>Оплата:</span>
            <span>${sale.payment_method === CONFIG.PAYMENT_METHODS.cash ? 'Нал' : 'Безнал'}</span>
          </div>
          ${sale.comment ? `
            <div class="detail-row">
              <span>Комментарий:</span>
              <span>${sale.comment}</span>
            </div>
          ` : ''}
          <div class="operation-items">
            <h4>Товары:</h4>
            ${sale.sale_items.map(item => `
              <div class="item-row">
                <span>${item.products?.name}</span>
                <span>${item.quantity} × ${Utils.formatMoney(item.price)}</span>
                <span>${Utils.formatMoney(item.total)}</span>
              </div>
            `).join('')}
          </div>
          <div class="operation-total">
            <strong>Итого:</strong>
            <strong>${Utils.formatMoney(sale.total_amount)}</strong>
          </div>
        </div>
      `;

      modal.style.display = 'block';
    } catch (error) {
      console.error('Show operation details error:', error);
      Utils.showToast('Ошибка загрузки деталей');
    }
  }

  // =============================================
  // PERIOD CHANGE
  // =============================================
  changePeriod(period) {
    this.currentPeriod = period;
    
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    
    this.loadMiniReport();
  }
}

// Экспорт экземпляра Sales
const sales = new Sales();

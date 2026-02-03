// =============================================
// REPORTS MODULE
// =============================================

class Reports {
  constructor() {
    this.currentTab = 'summary';
    this.currentPeriod = 'day';
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterCategory = null;
  }

  // =============================================
  // TAB MANAGEMENT
  // =============================================
  changeTab(tab) {
    this.currentTab = tab;
    
    document.querySelectorAll('.report-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.report-content').forEach(content => {
      content.style.display = content.id === `${tab}Report` ? 'block' : 'none';
    });

    this.loadTabData(tab);
  }

  async loadTabData(tab) {
    const { start, end } = this.getFilterDates();

    switch (tab) {
      case 'summary':
        await this.loadSummary(start, end);
        break;
      case 'daily':
        await this.loadDailyReport(start, end);
        break;
      case 'products':
        await this.loadProductsReport(start, end);
        break;
      case 'money':
        await this.loadMoneyReport();
        break;
      case 'pl':
        await this.loadProfitLoss(start, end);
        break;
      case 'history':
        await this.loadHistory(start, end);
        break;
    }
  }

  getFilterDates() {
    if (this.filterStartDate && this.filterEndDate) {
      return {
        start: new Date(this.filterStartDate).toISOString(),
        end: new Date(this.filterEndDate + ' 23:59:59').toISOString()
      };
    }
    return Utils.getPeriodDates(this.currentPeriod);
  }

  // =============================================
  // SUMMARY REPORT
  // =============================================
  async loadSummary(start, end) {
    try {
      const sales = await api.getSales(start, end);
      const cashBalance = await api.getCashBalance();
      const stockBalance = await api.getStockBalance();

      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalOrders = sales.length;
      const avgCheck = totalOrders > 0 ? totalSales / totalOrders : 0;

      const summaryEl = document.getElementById('summaryReport');
      if (!summaryEl) return;

      summaryEl.innerHTML = `
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-label">Выручка</div>
            <div class="summary-value">${Utils.formatMoney(totalSales)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Количество продаж</div>
            <div class="summary-value">${totalOrders}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Средний чек</div>
            <div class="summary-value">${Utils.formatMoney(avgCheck)}</div>
          </div>
        </div>
        
        <div class="balance-section">
          <h3>Баланс денег</h3>
          <div class="balance-cards">
            <div class="balance-card">
              <div class="balance-label">Наличные</div>
              <div class="balance-value">${Utils.formatMoney(cashBalance?.cash_balance || 0)}</div>
            </div>
            <div class="balance-card">
              <div class="balance-label">Безнал</div>
              <div class="balance-value">${Utils.formatMoney(cashBalance?.cashless_balance || 0)}</div>
            </div>
          </div>
        </div>

        <div class="stock-section">
          <h3>Остатки на складе</h3>
          <div class="stock-value">${Utils.formatMoney(
            stockBalance?.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.purchase_price)), 0) || 0
          )}</div>
        </div>
      `;
    } catch (error) {
      console.error('Load summary error:', error);
      Utils.showToast('Ошибка загрузки сводки');
    }
  }

  // =============================================
  // DAILY REPORT
  // =============================================
  async loadDailyReport(start, end) {
    try {
      const sales = await api.getSales(start, end);
      
      // Группируем по дням
      const dailyData = {};
      sales.forEach(sale => {
        const date = sale.operation_at.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { count: 0, sum: 0 };
        }
        dailyData[date].count++;
        dailyData[date].sum += Number(sale.total_amount);
      });

      const dailyEl = document.getElementById('dailyReport');
      if (!dailyEl) return;

      const dates = Object.keys(dailyData).sort().reverse();

      dailyEl.innerHTML = `
        <div class="daily-table">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Продажи</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${dates.map(date => `
                <tr>
                  <td>${new Date(date).toLocaleDateString('ru-RU')}</td>
                  <td>${dailyData[date].count}</td>
                  <td>${Utils.formatMoney(dailyData[date].sum)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      console.error('Load daily report error:', error);
      Utils.showToast('Ошибка загрузки отчета');
    }
  }

  // =============================================
  // PRODUCTS REPORT
  // =============================================
  async loadProductsReport(start, end) {
    try {
      const profitByProduct = await api.getProfitByProduct(start, end);

      const productsEl = document.getElementById('productsReport');
      if (!productsEl) return;

      productsEl.innerHTML = `
        <div class="products-table">
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Продано</th>
                <th>Выручка</th>
                <th>Прибыль</th>
              </tr>
            </thead>
            <tbody>
              ${profitByProduct.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.total_quantity}</td>
                  <td>${Utils.formatMoney(item.revenue)}</td>
                  <td>${Utils.formatMoney(item.profit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      console.error('Load products report error:', error);
      Utils.showToast('Ошибка загрузки отчета');
    }
  }

  // =============================================
  // MONEY REPORT
  // =============================================
  async loadMoneyReport() {
    try {
      const cashBalance = await api.getCashBalance();

      const moneyEl = document.getElementById('moneyReport');
      if (!moneyEl) return;

      moneyEl.innerHTML = `
        <div class="money-balance">
          <div class="balance-card-large">
            <div class="balance-label">Наличные</div>
            <div class="balance-value-large">${Utils.formatMoney(cashBalance?.cash_balance || 0)}</div>
          </div>
          <div class="balance-card-large">
            <div class="balance-label">Безнал</div>
            <div class="balance-value-large">${Utils.formatMoney(cashBalance?.cashless_balance || 0)}</div>
          </div>
          <div class="balance-card-large total">
            <div class="balance-label">Итого</div>
            <div class="balance-value-large">${Utils.formatMoney(
              (cashBalance?.cash_balance || 0) + (cashBalance?.cashless_balance || 0)
            )}</div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Load money report error:', error);
      Utils.showToast('Ошибка загрузки отчета');
    }
  }

  // =============================================
  // PROFIT & LOSS
  // =============================================
  async loadProfitLoss(start, end) {
    try {
      const sales = await api.getSales(start, end);
      const expenses = await api.getExpenses(start, end);
      const stockMovements = await api.getStockMovements('writeoff', start, end);

      // Выручка
      const revenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);

      // Себестоимость проданных товаров
      let cogs = 0;
      sales.forEach(sale => {
        sale.sale_items?.forEach(item => {
          const product = item.products;
          if (product?.type === 'product') {
            cogs += Number(item.quantity) * Number(product.purchase_price || 0);
          }
        });
      });

      // Валовая прибыль
      const grossProfit = revenue - cogs;

      // Операционные расходы
      const expensesByCategory = {
        rent: 0,
        salary: 0,
        marketing: 0,
        taxes: 0,
        other: 0,
        writeoffs: 0
      };

      expenses?.forEach(exp => {
        const category = exp.category || 'other';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(exp.amount);
      });

      // Списания
      stockMovements?.forEach(mov => {
        expensesByCategory.writeoffs += Number(mov.quantity) * Number(mov.price || 0);
      });

      const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);

      // Операционная прибыль
      const operatingProfit = grossProfit - totalExpenses;

      // Чистая прибыль (без налогов пока что)
      const netProfit = operatingProfit - expensesByCategory.taxes;

      const plEl = document.getElementById('plReport');
      if (!plEl) return;

      plEl.innerHTML = `
        <div class="pl-statement">
          <div class="pl-row main">
            <span>Выручка</span>
            <span>${Utils.formatMoney(revenue)}</span>
          </div>
          <div class="pl-row">
            <span>− Себестоимость</span>
            <span>${Utils.formatMoney(cogs)}</span>
          </div>
          <div class="pl-row total">
            <span>= Валовая прибыль</span>
            <span>${Utils.formatMoney(grossProfit)}</span>
          </div>
          
          <div class="pl-section">
            <div class="pl-row">
              <span>− Операционные расходы:</span>
              <span></span>
            </div>
            ${Object.entries(expensesByCategory).map(([key, value]) => {
              const labels = {
                writeoffs: 'Списания',
                rent: 'Аренда',
                salary: 'Зарплата',
                marketing: 'Маркетинг',
                other: 'Прочие расходы',
                taxes: 'Налоги'
              };
              return `
                <div class="pl-row sub">
                  <span>  ${labels[key]}</span>
                  <span>${Utils.formatMoney(value)}</span>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="pl-row total">
            <span>= Операционная прибыль</span>
            <span>${Utils.formatMoney(operatingProfit)}</span>
          </div>
          <div class="pl-row">
            <span>− Налоги</span>
            <span>${Utils.formatMoney(expensesByCategory.taxes)}</span>
          </div>
          <div class="pl-row main">
            <span>= Чистая прибыль</span>
            <span>${Utils.formatMoney(netProfit)}</span>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Load P&L error:', error);
      Utils.showToast('Ошибка загрузки отчета');
    }
  }

  // =============================================
  // HISTORY
  // =============================================
  async loadHistory(start, end) {
    try {
      const sales = await api.getSales(start, end);
      const expenses = await api.getExpenses(start, end);

      // Объединяем и сортируем
      const history = [
        ...sales.map(s => ({
          type: 'sale',
          date: s.operation_at,
          amount: s.total_amount,
          description: `Продажа #${s.id.slice(0, 8)}`
        })),
        ...expenses.map(e => ({
          type: 'expense',
          date: e.expense_date,
          amount: e.amount,
          description: e.description || e.category
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      const historyEl = document.getElementById('historyReport');
      if (!historyEl) return;

      historyEl.innerHTML = `
        <div class="history-table">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Операция</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(item => `
                <tr>
                  <td>${Utils.formatDate(item.date)}</td>
                  <td>${item.description}</td>
                  <td class="${item.type === 'sale' ? 'positive' : 'negative'}">
                    ${item.type === 'sale' ? '+' : '−'}${Utils.formatMoney(Math.abs(item.amount))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      console.error('Load history error:', error);
      Utils.showToast('Ошибка загрузки истории');
    }
  }

  // =============================================
  // FILTERS
  // =============================================
  applyFilters() {
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    const category = document.getElementById('filterCategory')?.value;

    this.filterStartDate = startDate || null;
    this.filterEndDate = endDate || null;
    this.filterCategory = category || null;

    this.loadTabData(this.currentTab);
  }

  clearFilters() {
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterCategory = null;

    const startDateEl = document.getElementById('filterStartDate');
    const endDateEl = document.getElementById('filterEndDate');
    const categoryEl = document.getElementById('filterCategory');

    if (startDateEl) startDateEl.value = '';
    if (endDateEl) endDateEl.value = '';
    if (categoryEl) categoryEl.value = '';

    this.loadTabData(this.currentTab);
  }

  // =============================================
  // PERIOD CHANGE
  // =============================================
  changePeriod(period) {
    this.currentPeriod = period;
    
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });

    // Сбрасываем фильтры при смене периода
    this.clearFilters();
  }
}

// Экспорт экземпляра Reports
const reports = new Reports();

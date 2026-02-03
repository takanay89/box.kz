// =============================================
// SUPPLIERS MODULE
// =============================================

class Suppliers {
  constructor() {
    this.suppliers = [];
  }

  async loadSuppliers() {
    try {
      this.suppliers = await api.getSuppliers();
      this.renderSuppliers();
      this.updateSupplierSelects();
      return this.suppliers;
    } catch (error) {
      console.error('Load suppliers error:', error);
      Utils.showToast('Ошибка загрузки поставщиков');
      return [];
    }
  }

  renderSuppliers() {
    const suppliersList = document.getElementById('suppliersList');
    if (!suppliersList) return;

    if (this.suppliers.length === 0) {
      suppliersList.innerHTML = '<div class="no-items">Нет поставщиков</div>';
      return;
    }

    suppliersList.innerHTML = this.suppliers.map(supplier => `
      <div class="entity-card">
        <div class="entity-header">
          <div class="entity-name">${supplier.name}</div>
          <div class="entity-actions">
            <button class="btn-icon" onclick="suppliers.editSupplier('${supplier.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
              </svg>
            </button>
            <button class="btn-icon btn-delete" onclick="suppliers.deleteSupplier('${supplier.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
        ${supplier.contact ? `<div class="entity-contact">${supplier.contact}</div>` : ''}
      </div>
    `).join('');
  }

  updateSupplierSelects() {
    const selects = document.querySelectorAll('.supplier-select');
    selects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = `
        <option value="">Выберите поставщика</option>
        ${this.suppliers.map(s => `
          <option value="${s.id}">${s.name}</option>
        `).join('')}
      `;
      if (currentValue) {
        select.value = currentValue;
      }
    });
  }

  showSupplierForm(supplierId = null) {
    const modal = document.getElementById('supplierModal');
    const form = document.getElementById('supplierForm');
    const title = document.getElementById('supplierFormTitle');
    
    if (!modal || !form) return;

    if (supplierId) {
      const supplier = this.suppliers.find(s => s.id === supplierId);
      if (!supplier) return;

      title.textContent = 'Редактировать поставщика';
      form.elements.supplierName.value = supplier.name;
      form.elements.supplierContact.value = supplier.contact || '';
      form.dataset.supplierId = supplierId;
    } else {
      title.textContent = 'Добавить поставщика';
      form.reset();
      delete form.dataset.supplierId;
    }

    modal.style.display = 'block';
  }

  async saveSupplier(formData) {
    try {
      const supplierData = {
        name: formData.get('supplierName'),
        contact: formData.get('supplierContact') || null
      };

      const form = document.getElementById('supplierForm');
      const supplierId = form.dataset.supplierId;

      if (supplierId) {
        await api.updateSupplier(supplierId, supplierData);
        Utils.showToast('Поставщик обновлен');
      } else {
        await api.createSupplier(supplierData);
        Utils.showToast('Поставщик создан');
      }

      await this.loadSuppliers();
      this.closeSupplierModal();
    } catch (error) {
      console.error('Save supplier error:', error);
      Utils.showToast('Ошибка сохранения: ' + error.message);
    }
  }

  async deleteSupplier(supplierId) {
    if (!confirm('Удалить этого поставщика?')) return;

    try {
      await api.deleteSupplier(supplierId);
      Utils.showToast('Поставщик удален');
      await this.loadSuppliers();
    } catch (error) {
      console.error('Delete supplier error:', error);
      
      if (error.message.includes('операциями')) {
        Utils.showToast('Нельзя удалить поставщика с операциями');
      } else {
        Utils.showToast('Ошибка удаления: ' + error.message);
      }
    }
  }

  editSupplier(supplierId) {
    this.showSupplierForm(supplierId);
  }

  closeSupplierModal() {
    const modal = document.getElementById('supplierModal');
    if (modal) modal.style.display = 'none';
  }
}

// =============================================
// CUSTOMERS MODULE
// =============================================

class Customers {
  constructor() {
    this.customers = [];
  }

  async loadCustomers() {
    try {
      this.customers = await api.getCustomers();
      this.renderCustomers();
      return this.customers;
    } catch (error) {
      console.error('Load customers error:', error);
      Utils.showToast('Ошибка загрузки клиентов');
      return [];
    }
  }

  renderCustomers() {
    const customersList = document.getElementById('customersList');
    if (!customersList) return;

    if (this.customers.length === 0) {
      customersList.innerHTML = '<div class="no-items">Нет клиентов</div>';
      return;
    }

    customersList.innerHTML = this.customers.map(customer => `
      <div class="entity-card">
        <div class="entity-header">
          <div class="entity-name">${customer.name}</div>
          <div class="entity-actions">
            <button class="btn-icon" onclick="customers.editCustomer('${customer.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
              </svg>
            </button>
            <button class="btn-icon btn-delete" onclick="customers.deleteCustomer('${customer.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
        ${customer.phone ? `<div class="entity-contact">${customer.phone}</div>` : ''}
        ${customer.comment ? `<div class="entity-comment">${customer.comment}</div>` : ''}
      </div>
    `).join('');
  }

  showCustomerForm(customerId = null) {
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const title = document.getElementById('customerFormTitle');
    
    if (!modal || !form) return;

    if (customerId) {
      const customer = this.customers.find(c => c.id === customerId);
      if (!customer) return;

      title.textContent = 'Редактировать клиента';
      form.elements.customerName.value = customer.name;
      form.elements.customerPhone.value = customer.phone || '';
      form.elements.customerComment.value = customer.comment || '';
      form.dataset.customerId = customerId;
    } else {
      title.textContent = 'Добавить клиента';
      form.reset();
      delete form.dataset.customerId;
    }

    modal.style.display = 'block';
  }

  async saveCustomer(formData) {
    try {
      const customerData = {
        name: formData.get('customerName'),
        phone: formData.get('customerPhone') || null,
        comment: formData.get('customerComment') || null
      };

      const form = document.getElementById('customerForm');
      const customerId = form.dataset.customerId;

      if (customerId) {
        await api.updateCustomer(customerId, customerData);
        Utils.showToast('Клиент обновлен');
      } else {
        await api.createCustomer(customerData);
        Utils.showToast('Клиент создан');
      }

      await this.loadCustomers();
      this.closeCustomerModal();
    } catch (error) {
      console.error('Save customer error:', error);
      Utils.showToast('Ошибка сохранения: ' + error.message);
    }
  }

  async deleteCustomer(customerId) {
    if (!confirm('Удалить этого клиента?')) return;

    try {
      await api.deleteCustomer(customerId);
      Utils.showToast('Клиент удален');
      await this.loadCustomers();
    } catch (error) {
      console.error('Delete customer error:', error);
      Utils.showToast('Ошибка удаления: ' + error.message);
    }
  }

  editCustomer(customerId) {
    this.showCustomerForm(customerId);
  }

  closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.style.display = 'none';
  }
}

// Экспорт экземпляров
const suppliers = new Suppliers();
const customers = new Customers();

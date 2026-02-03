// =============================================
// PRODUCTS MODULE
// =============================================

class Products {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.searchTerm = '';
  }

  async loadProducts() {
    try {
      this.products = await api.getProducts();
      this.filteredProducts = this.products;
      this.renderProducts();
      return this.products;
    } catch (error) {
      console.error('Load products error:', error);
      Utils.showToast('Ошибка загрузки товаров');
      return [];
    }
  }

  searchProducts(term) {
    this.searchTerm = term.toLowerCase();
    
    if (!this.searchTerm) {
      this.filteredProducts = this.products;
    } else {
      this.filteredProducts = this.products.filter(p => 
        p.name.toLowerCase().includes(this.searchTerm) ||
        (p.barcode && p.barcode.includes(this.searchTerm)) ||
        (p.sku && p.sku.toLowerCase().includes(this.searchTerm))
      );
    }
    
    this.renderProducts();
  }

  renderProducts() {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;

    if (this.filteredProducts.length === 0) {
      productsList.innerHTML = '<div class="no-products">Товары не найдены</div>';
      return;
    }

    productsList.innerHTML = this.filteredProducts.map(product => `
      <div class="product-card" onclick="products.selectProduct('${product.id}')">
        <div class="product-name">${product.name}</div>
        <div class="product-info">
          <span class="product-price">${Utils.formatMoney(product.sale_price)}</span>
          ${product.type === 'product' ? 
            `<span class="product-balance ${product.balance <= 0 ? 'out-of-stock' : ''}">
              ${product.balance} шт
            </span>` : 
            '<span class="product-service">Услуга</span>'
          }
        </div>
      </div>
    `).join('');
  }

  selectProduct(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    // Проверка остатка для товара
    if (product.type === 'product' && product.balance <= 0) {
      Utils.showToast('Товар закончился на складе');
      return;
    }

    // Добавляем в корзину в зависимости от режима
    if (sales.mode === 'sale') {
      sales.addToCart(product);
    } else if (sales.mode === 'writeoff' || sales.mode === 'supplier_refund') {
      this.addToOperationCart(product);
    }
  }

  addToOperationCart(product) {
    // Для списания и возврата поставщику
    const cartList = document.getElementById('operationCart');
    if (!cartList) return;

    const existing = document.querySelector(`[data-product-id="${product.id}"]`);
    
    if (existing) {
      const qtyInput = existing.querySelector('.operation-qty-input');
      qtyInput.value = Number(qtyInput.value) + 1;
    } else {
      const item = document.createElement('div');
      item.className = 'operation-cart-item';
      item.dataset.productId = product.id;
      item.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-balance">Остаток: ${product.balance} шт</div>
        </div>
        <div class="cart-item-controls">
          <input 
            type="number" 
            class="operation-qty-input" 
            value="1"
            min="1"
            max="${product.balance}"
          >
          <button class="btn-remove" onclick="this.closest('.operation-cart-item').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M6 18L18 6" stroke-width="2"/>
            </svg>
          </button>
        </div>
      `;
      cartList.appendChild(item);
    }
  }

  // =============================================
  // PRODUCT MANAGEMENT
  // =============================================
  async showProductForm(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productFormTitle');
    
    if (!modal || !form) return;

    if (productId) {
      const product = this.products.find(p => p.id === productId);
      if (!product) return;

      title.textContent = 'Редактировать товар';
      form.elements.productName.value = product.name;
      form.elements.productType.value = product.type;
      form.elements.productSKU.value = product.sku || '';
      form.elements.productBarcode.value = product.barcode || '';
      form.elements.productPurchasePrice.value = product.purchase_price || '';
      form.elements.productSalePrice.value = product.sale_price || '';
      form.elements.productUnit.value = product.unit || 'шт';
      form.elements.productComment.value = product.comment || '';
      form.dataset.productId = productId;
    } else {
      title.textContent = 'Добавить товар';
      form.reset();
      delete form.dataset.productId;
    }

    modal.style.display = 'block';
  }

  async saveProduct(formData) {
    try {
      const productData = {
        name: formData.get('productName'),
        type: formData.get('productType'),
        sku: formData.get('productSKU') || null,
        barcode: formData.get('productBarcode') || null,
        purchase_price: Number(formData.get('productPurchasePrice')) || 0,
        sale_price: Number(formData.get('productSalePrice')) || 0,
        unit: formData.get('productUnit') || 'шт',
        comment: formData.get('productComment') || null,
        active: true
      };

      const form = document.getElementById('productForm');
      const productId = form.dataset.productId;

      if (productId) {
        await api.updateProduct(productId, productData);
        Utils.showToast('Товар обновлен');
      } else {
        await api.createProduct(productData);
        Utils.showToast('Товар создан');
      }

      await this.loadProducts();
      this.closeProductModal();
    } catch (error) {
      console.error('Save product error:', error);
      Utils.showToast('Ошибка сохранения: ' + error.message);
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Удалить этот товар?')) return;

    try {
      await api.deleteProduct(productId);
      Utils.showToast('Товар удален');
      await this.loadProducts();
    } catch (error) {
      console.error('Delete product error:', error);
      Utils.showToast('Ошибка удаления: ' + error.message);
    }
  }

  closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
  }

  // =============================================
  // EXCEL IMPORT
  // =============================================
  async importFromExcel(file) {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet);

          const results = {
            added: 0,
            updated: 0,
            errors: []
          };

          for (const row of rows) {
            try {
              const productData = {
                name: row['Название'] || row['Name'],
                type: (row['Тип'] || row['Type'] || 'product').toLowerCase(),
                sku: row['SKU'] || row['Артикул'] || null,
                barcode: row['Barcode'] || row['Штрихкод'] || null,
                purchase_price: Number(row['Себестоимость'] || row['Purchase Price']) || 0,
                sale_price: Number(row['Цена'] || row['Sale Price']) || 0,
                unit: row['Единица'] || row['Unit'] || 'шт',
                active: true
              };

              // Поиск существующего товара
              const existing = this.products.find(p => 
                p.sku && productData.sku && p.sku === productData.sku ||
                p.barcode && productData.barcode && p.barcode === productData.barcode
              );

              if (existing && productData.type === 'product') {
                // Обновляем товар
                await api.updateProduct(existing.id, productData);
                
                // Если указано количество - добавляем на склад
                const quantity = Number(row['Количество'] || row['Quantity']);
                if (quantity > 0) {
                  await api.receiveStock(
                    [{ 
                      product_id: existing.id, 
                      quantity: quantity,
                      purchase_price: productData.purchase_price
                    }],
                    null,
                    'Импорт из Excel'
                  );
                }
                
                results.updated++;
              } else {
                // Создаем новый товар
                const newProduct = await api.createProduct(productData);
                
                // Если это товар и указано количество - добавляем на склад
                if (productData.type === 'product') {
                  const quantity = Number(row['Количество'] || row['Quantity']);
                  if (quantity > 0) {
                    await api.receiveStock(
                      [{ 
                        product_id: newProduct.id, 
                        quantity: quantity,
                        purchase_price: productData.purchase_price
                      }],
                      null,
                      'Импорт из Excel'
                    );
                  }
                }
                
                results.added++;
              }
            } catch (error) {
              results.errors.push(`Ошибка в строке "${row['Название']}": ${error.message}`);
            }
          }

          await this.loadProducts();
          
          let message = `Импорт завершен!\nДобавлено: ${results.added}\nОбновлено: ${results.updated}`;
          if (results.errors.length > 0) {
            message += `\n\nОшибки:\n${results.errors.slice(0, 5).join('\n')}`;
            if (results.errors.length > 5) {
              message += `\n... и еще ${results.errors.length - 5} ошибок`;
            }
          }
          
          alert(message);
        } catch (error) {
          console.error('Parse Excel error:', error);
          Utils.showToast('Ошибка чтения файла: ' + error.message);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import Excel error:', error);
      Utils.showToast('Ошибка импорта: ' + error.message);
    }
  }

  triggerExcelImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importFromExcel(file);
      }
    };
    input.click();
  }

  // =============================================
  // RECEIVE STOCK
  // =============================================
  async completeReceive(supplierId, comment) {
    try {
      const items = [];
      document.querySelectorAll('.operation-cart-item').forEach(itemEl => {
        const productId = itemEl.dataset.productId;
        const qtyInput = itemEl.querySelector('.operation-qty-input');
        const quantity = Number(qtyInput?.value || 0);
        
        const product = this.products.find(p => p.id === productId);
        
        if (quantity > 0 && product) {
          items.push({
            product_id: productId,
            quantity: quantity,
            purchase_price: product.purchase_price
          });
        }
      });

      if (items.length === 0) {
        throw new Error('Добавьте товары');
      }

      if (!supplierId) {
        throw new Error('Выберите поставщика');
      }

      await api.receiveStock(items, supplierId, comment);

      Utils.showToast('Приход оформлен');
      document.getElementById('operationCart').innerHTML = '';
      await this.loadProducts();

      return true;
    } catch (error) {
      console.error('Complete receive error:', error);
      Utils.showToast('Ошибка: ' + error.message);
      return false;
    }
  }

  // =============================================
  // WRITEOFF STOCK
  // =============================================
  async completeWriteoff(reason) {
    try {
      const items = [];
      document.querySelectorAll('.operation-cart-item').forEach(itemEl => {
        const productId = itemEl.dataset.productId;
        const qtyInput = itemEl.querySelector('.operation-qty-input');
        const quantity = Number(qtyInput?.value || 0);
        
        const product = this.products.find(p => p.id === productId);
        
        if (quantity > 0 && product) {
          items.push({
            product_id: productId,
            quantity: quantity,
            purchase_price: product.purchase_price
          });
        }
      });

      if (items.length === 0) {
        throw new Error('Добавьте товары');
      }

      await api.writeoffStock(items, reason);

      Utils.showToast('Списание оформлено');
      document.getElementById('operationCart').innerHTML = '';
      await this.loadProducts();

      return true;
    } catch (error) {
      console.error('Complete writeoff error:', error);
      Utils.showToast('Ошибка: ' + error.message);
      return false;
    }
  }

  // =============================================
  // SUPPLIER REFUND
  // =============================================
  async completeSupplierRefund(supplierId, comment) {
    try {
      const items = [];
      document.querySelectorAll('.operation-cart-item').forEach(itemEl => {
        const productId = itemEl.dataset.productId;
        const qtyInput = itemEl.querySelector('.operation-qty-input');
        const quantity = Number(qtyInput?.value || 0);
        
        const product = this.products.find(p => p.id === productId);
        
        if (quantity > 0 && product) {
          items.push({
            product_id: productId,
            quantity: quantity,
            purchase_price: product.purchase_price
          });
        }
      });

      if (items.length === 0) {
        throw new Error('Добавьте товары');
      }

      if (!supplierId) {
        throw new Error('Выберите поставщика');
      }

      await api.supplierRefund(items, supplierId, comment);

      Utils.showToast('Возврат поставщику оформлен');
      document.getElementById('operationCart').innerHTML = '';
      await this.loadProducts();

      return true;
    } catch (error) {
      console.error('Complete supplier refund error:', error);
      Utils.showToast('Ошибка: ' + error.message);
      return false;
    }
  }
}

// Экспорт экземпляра Products
const products = new Products();

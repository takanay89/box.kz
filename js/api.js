// =============================================
// API MODULE - Supabase Integration
// =============================================

class API {
  constructor() {
    this.db = null;
    this.currentUser = null;
    this.storeLocationId = null;
  }

  async init() {
    if (typeof supabase === 'undefined') {
      throw new Error('Supabase library not loaded');
    }
    
    this.db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    
    // Проверка авторизации
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) {
      window.location.href = '/login.html';
      return;
    }
    
    this.currentUser = user;
    
    // Загрузка торговой точки
    await this.loadStoreLocation();
    
    return this.db;
  }

  async loadStoreLocation() {
    const { data } = await this.db
      .from('store_locations')
      .select('id')
      .eq('company_id', CONFIG.COMPANY_ID)
      .eq('active', true)
      .limit(1)
      .single();
    
    this.storeLocationId = data?.id;
  }

  // =============================================
  // PRODUCTS
  // =============================================
  async getProducts() {
    const { data, error } = await this.db
      .from('products')
      .select(`
        *,
        product_balances (
          quantity,
          store_location_id
        )
      `)
      .eq('company_id', CONFIG.COMPANY_ID)
      .eq('active', true)
      .order('name');

    if (error) throw error;

    // Фильтруем и считаем остатки
    return data.map(p => ({
      ...p,
      balance: p.product_balances
        ?.filter(b => b.store_location_id === this.storeLocationId)
        .reduce((sum, b) => sum + Number(b.quantity || 0), 0) || 0
    }));
  }

  async createProduct(productData) {
    const { data, error } = await this.db
      .from('products')
      .insert([{
        company_id: CONFIG.COMPANY_ID,
        ...productData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProduct(id, productData) {
    const { data, error } = await this.db
      .from('products')
      .update({
        ...productData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id) {
    // Проверяем, есть ли операции с товаром
    const { count } = await this.db
      .from('stock_movements')
      .select('id', { count: 'exact' })
      .eq('product_id', id);

    if (count > 0) {
      // Если есть операции - архивируем
      return await this.updateProduct(id, { active: false });
    }

    // Если нет - удаляем
    const { error } = await this.db
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =============================================
  // SALES
  // =============================================
  async createSale(saleData, items) {
    try {
      // Создаем продажу через RPC функцию
      const { data, error } = await this.db.rpc('make_sale', {
        p_company_id: CONFIG.COMPANY_ID,
        p_store_location_id: this.storeLocationId,
        p_payment_method: saleData.payment_method,
        p_total_amount: saleData.total_amount,
        p_discount_amount: saleData.discount_amount || 0,
        p_comment: saleData.comment || '',
        p_items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }))
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create sale error:', error);
      throw error;
    }
  }

  async getSales(startDate, endDate) {
    const { data, error } = await this.db
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          products (name, type)
        )
      `)
      .eq('company_id', CONFIG.COMPANY_ID)
      .eq('status', 'completed')
      .gte('operation_at', startDate)
      .lte('operation_at', endDate)
      .order('operation_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getSaleById(id) {
    const { data, error } = await this.db
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          products (name, type)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSale(id, adminPassword) {
    // Проверка админ-пароля (пока заглушка, можно добавить проверку)
    if (!adminPassword) {
      throw new Error('Требуется пароль администратора');
    }

    const { data, error } = await this.db
      .from('sales')
      .update({
        status: 'deleted',
        deleted_by: this.currentUser.id,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // RETURNS
  // =============================================
  async createReturn(saleId, items, paymentMethod) {
    try {
      const { data, error } = await this.db.rpc('make_refund', {
        p_sale_id: saleId,
        p_items: items.map(item => ({
          sale_item_id: item.sale_item_id,
          quantity: item.quantity
        })),
        p_payment_method: paymentMethod
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create return error:', error);
      throw error;
    }
  }

  async searchSales(searchTerm) {
    let query = this.db
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          products (name)
        )
      `)
      .eq('company_id', CONFIG.COMPANY_ID)
      .eq('status', 'completed')
      .order('operation_at', { ascending: false })
      .limit(20);

    // Если поисковый термин - число, ищем по сумме или ID
    if (!isNaN(searchTerm)) {
      query = query.or(`total_amount.eq.${searchTerm},id.eq.${searchTerm}`);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    // Дополнительная фильтрация по названию товара
    if (isNaN(searchTerm)) {
      return data.filter(sale => 
        sale.sale_items.some(item => 
          item.products?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return data;
  }

  // =============================================
  // STOCK MOVEMENTS (Приход, Списание, Возврат поставщику)
  // =============================================
  async receiveStock(items, supplierId, comment) {
    try {
      const { data, error } = await this.db.rpc('receive_stock', {
        p_company_id: CONFIG.COMPANY_ID,
        p_store_location_id: this.storeLocationId,
        p_supplier_id: supplierId,
        p_comment: comment || '',
        p_items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.purchase_price
        }))
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Receive stock error:', error);
      throw error;
    }
  }

  async writeoffStock(items, reason) {
    try {
      const { data, error } = await this.db.rpc('writeoff_stock', {
        p_company_id: CONFIG.COMPANY_ID,
        p_store_location_id: this.storeLocationId,
        p_comment: reason || 'Списано',
        p_items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.purchase_price || 0
        }))
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Writeoff stock error:', error);
      throw error;
    }
  }

  async supplierRefund(items, supplierId, comment) {
    try {
      const { data, error } = await this.db.rpc('supplier_refund_stock', {
        p_company_id: CONFIG.COMPANY_ID,
        p_store_location_id: this.storeLocationId,
        p_supplier_id: supplierId,
        p_comment: comment || 'Возврат поставщику',
        p_items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.purchase_price
        }))
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supplier refund error:', error);
      throw error;
    }
  }

  async getStockMovements(type, startDate, endDate) {
    let query = this.db
      .from('stock_movements')
      .select(`
        *,
        products (name, type),
        suppliers (name)
      `)
      .eq('company_id', CONFIG.COMPANY_ID)
      .gte('operation_at', startDate)
      .lte('operation_at', endDate)
      .order('operation_at', { ascending: false });

    if (type === 'in') {
      query = query.eq('type', 'in');
    } else if (type === 'writeoff') {
      query = query.eq('type', 'out').ilike('comment', '%списан%');
    } else if (type === 'supplier_refund') {
      query = query.eq('type', 'out').ilike('comment', '%возврат поставщику%');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // =============================================
  // SUPPLIERS
  // =============================================
  async getSuppliers() {
    const { data, error } = await this.db
      .from('suppliers')
      .select('*')
      .eq('company_id', CONFIG.COMPANY_ID)
      .order('name');

    if (error) throw error;
    return data;
  }

  async createSupplier(supplierData) {
    const { data, error } = await this.db
      .from('suppliers')
      .insert([{
        company_id: CONFIG.COMPANY_ID,
        ...supplierData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSupplier(id, supplierData) {
    const { data, error } = await this.db
      .from('suppliers')
      .update(supplierData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSupplier(id) {
    // Проверяем, есть ли операции с поставщиком
    const { count } = await this.db
      .from('stock_movements')
      .select('id', { count: 'exact' })
      .eq('supplier_id', id);

    if (count > 0) {
      throw new Error('Нельзя удалить поставщика с операциями. Используйте архивацию.');
    }

    const { error } = await this.db
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =============================================
  // CUSTOMERS
  // =============================================
  async getCustomers() {
    const { data, error } = await this.db
      .from('customers')
      .select('*')
      .eq('company_id', CONFIG.COMPANY_ID)
      .order('name');

    if (error) throw error;
    return data;
  }

  async createCustomer(customerData) {
    const { data, error } = await this.db
      .from('customers')
      .insert([{
        company_id: CONFIG.COMPANY_ID,
        ...customerData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCustomer(id, customerData) {
    const { data, error } = await this.db
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCustomer(id) {
    const { error } = await this.db
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =============================================
  // EXPENSES
  // =============================================
  async getExpenses(startDate, endDate, category) {
    let query = this.db
      .from('expenses')
      .select('*')
      .eq('company_id', CONFIG.COMPANY_ID)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createExpense(expenseData) {
    const { data, error } = await this.db
      .from('expenses')
      .insert([{
        company_id: CONFIG.COMPANY_ID,
        ...expenseData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteExpense(id) {
    const { error } = await this.db
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =============================================
  // REPORTS
  // =============================================
  async getDashboardStats(period) {
    const { start, end } = Utils.getPeriodDates(period);

    // Получаем данные из view
    const { data: sales } = await this.db
      .from('v_revenue_by_day')
      .select('*')
      .eq('company_id', CONFIG.COMPANY_ID)
      .gte('sale_date', start.split('T')[0])
      .lte('sale_date', end.split('T')[0]);

    const { data: profit } = await this.db
      .from('v_gross_profit')
      .select('*')
      .eq('company_id', CONFIG.COMPANY_ID)
      .single();

    return {
      sales: sales || [],
      profit: profit || { gross_profit: 0 }
    };
  }

  async getCashBalance() {
    const { data, error } = await this.db
      .rpc('get_cash_balance', {
        p_company_id: CONFIG.COMPANY_ID
      });

    if (error) throw error;
    return data;
  }

  async getStockBalance() {
    const { data, error } = await this.db
      .from('v_stock_balance')
      .select('*')
      .eq('company_id', CONFIG.COMPANY_ID);

    if (error) throw error;
    return data;
  }

  async getProfitByProduct(startDate, endDate) {
    const { data, error } = await this.db
      .from('v_profit_by_product')
      .select('*')
      .eq('company_id', CONFIG.COMPANY_ID)
      .gte('operation_date', startDate)
      .lte('operation_date', endDate)
      .order('profit', { ascending: false });

    if (error) throw error;
    return data;
  }
}

// Экспорт экземпляра API
const api = new API();

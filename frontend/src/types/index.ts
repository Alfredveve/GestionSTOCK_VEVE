// Types centralisés pour éviter les erreurs d'import de modules
// Ces types sont définis ici au lieu d'être importés depuis les services

export interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  category: number;
  category_name: string;
  supplier: number | null;
  supplier_name: string | null;
  purchase_price: string;
  selling_price: string;
  margin: string;
  units_per_box: number;
  wholesale_purchase_price: string;
  wholesale_selling_price: string;
  wholesale_margin: string;
  current_stock: number;
  stock_status: string;
  stock_analysis: {
    colis: number;
    unites: number;
    analysis: string;
  };
  reorder_level: number;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client: number;
  client_name: string;
  invoice_type: 'retail' | 'wholesale';
  point_of_sale: number | null;
  pos_name: string | null;
  date_issued: string;
  date_due: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  total_profit: number;
  balance: number;
  notes: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  is_wholesale: boolean;
  discount: number;
  total: number;
  margin: number;
  purchase_price: number;
}

export interface Quote {
  id: number;
  quote_number: string;
  client: number;
  client_name: string;
  quote_type: 'retail' | 'wholesale';
  date_issued: string;
  valid_until: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  subtotal: number;
  total_amount: number;
  notes: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  items: QuoteItem[];
}

export interface QuoteItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  is_wholesale: boolean;
  discount: number;
  total: number;
}

export interface PointOfSale {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  manager: number | null;
  manager_username: string;
  manager_name: string;
  is_active: boolean;
  is_warehouse: boolean;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  client_type: 'individual' | 'company';
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tax_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  point_of_sale: number;
  pos_name: string;
  quantity: number;
  reorder_level: number;
  location: string;
  last_updated: string;
  status_label: string;
  stock_analysis: {
    colis: number;
    unites: number;
    analysis: string;
  };
}

export interface MonthlyProfitReport {
  id: number;
  month: number;
  year: number;
  point_of_sale: number;
  point_of_sale_name: string;
  total_sales_brut: string;
  total_discounts: string;
  total_cost_of_goods: string;
  total_expenses: string;
  gross_profit: string;
  net_interest: string;
  generated_at: string;
}

export interface Payment {
  id: number;
  invoice: number;
  invoice_number: string;
  amount: string;
  payment_method: string;
  date_paid: string;
  notes?: string;
  recorded_by: string;
}

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  movement_type: string;
  type_display: string;
  quantity: number;
  is_wholesale: boolean;
  from_point_of_sale: number;
  from_pos_name: string;
  to_point_of_sale: number | null;
  to_pos_name: string | null;
  reference: string;
  notes: string;
  user: number;
  user_name: string;
  created_at: string;
}

export interface Receipt {
  id: number;
  receipt_number: string;
  supplier: number;
  supplier_name: string;
  point_of_sale: number | null;
  pos_name: string | null;
  date_received: string;
  supplier_reference: string;
  status: 'pending' | 'received';
  total_amount: number;
  delivery_costs: number;
  notes: string;
  created_at: string;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_cost: number;
  is_wholesale: boolean;
  total: number;
}

export interface ReceiptCreatePayload {
  supplier: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  items: Array<{
    product: number;
    quantity: number;
    unit_price: number;
  }>;
}

export interface DashboardStats {
  today_sales: number;
  today_orders: number;
  low_stock_count: number;
  monthly_revenue: number;
  monthly_expenses: number;
  net_profit: number;
  total_sales_value: number;
  total_stock_value: number;
  pending_orders_count: number;
  total_products_count: number;
  
  monthly_history: Array<{ name: string; revenue: number; expenses?: number; profit?: number; month: string }>;
  stock_movement_evolution: Array<{ name: string; entries: number; exits: number }>;
  stock_distribution_by_category: Array<{ name: string; value: number }>;
  
  low_stock_products: {
    results: Array<{
      id: number;
      name: string;
      quantity: number;
      threshold: number;
      pos_name: string;
      image: string | null;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };
  
  latest_stock_movements: {
    results: Array<{
      id: number;
      date: string;
      product: string;
      type: string;
      quantity: number;
      pos_name: string;
      target_pos_name: string | null;
      is_wholesale: boolean;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };
  
  returned_products: {
    results: Array<{
      id: number;
      date: string;
      product: string;
      quantity: number;
      pos_name: string;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };
  
  defective_products: {
    results: Array<{
      id: number;
      date: string;
      product: string;
      quantity: number;
      pos_name: string;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };

  remaining_products: {
    results: Array<{
      id: number;
      product: string;
      quantity: number;
      amount: number;
      pos_name: string;
    }>;
    count: number;
    page: number;
    total_pages: number;
  };

  top_selling_products?: Array<{
    name: string;
    value: number;
    quantity: number;
  }>;

  recent_activities: Array<{ 
    id: number; 
    type: string; 
    reference: string; 
    amount: number; 
    date: string; 
    description: string; 
  }>;
}

export interface Expense {
  id: number;
  reference: string;
  category: number;
  category_name: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Global Stock Dashboard Types
export interface GlobalStockStats {
  summary: {
    total_products: number;
    total_stock_value: number;
    products_in_stock: number;
    products_low_stock: number;
    products_out_of_stock: number;
  };
  by_point_of_sale: Array<{
    id: number;
    name: string;
    code: string;
    city: string;
    product_count: number;
    total_quantity: number;
    total_value: number;
  }>;
  imbalanced_products: Array<{
    id: number;
    name: string;
    sku: string;
    total_stock: number;
    max_stock: number;
    min_stock: number;
    variance: number;
    distribution: Array<{
      point_of_sale__name: string;
      point_of_sale__code: string;
      quantity: number;
    }>;
  }>;
  low_stock_alerts: Array<{
    product_id: number;
    product_name: string;
    sku: string;
    pos_name: string;
    pos_code: string;
    quantity: number;
    reorder_level: number;
    status: string;
  }>;
  top_products_by_value: Array<{
    id: number;
    name: string;
    sku: string;
    total_quantity: number;
    stock_value: number;
    selling_price: number;
  }>;
}


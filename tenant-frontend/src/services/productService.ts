import { API_BASE_URL } from '@/lib/config';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  tags: string[];
  
  // Pricing
  cost_price?: number;
  selling_price: number;
  min_price?: number;
  max_price?: number;
  
  // Gold-specific fields
  is_gold_product: boolean;
  gold_purity?: number;
  weight_per_unit?: number;
  
  // Inventory
  track_inventory: boolean;
  stock_quantity: number;
  reserved_quantity: number;
  min_stock_level: number;
  max_stock_level?: number;
  
  // Status
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  is_service: boolean;
  
  // Physical properties
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  
  // Additional info
  manufacturer?: string;
  brand?: string;
  model?: string;
  notes?: string;
  
  // Media
  images: string[];
  
  // Computed fields
  available_quantity: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  profit_margin?: number;
  
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ProductCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ProductCreate {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  tags?: string[];
  
  // Pricing
  cost_price?: number;
  selling_price: number;
  min_price?: number;
  max_price?: number;
  
  // Gold-specific fields
  is_gold_product?: boolean;
  gold_purity?: number;
  weight_per_unit?: number;
  
  // Inventory
  track_inventory?: boolean;
  stock_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  
  // Status
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  is_service?: boolean;
  
  // Physical properties
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  
  // Additional info
  manufacturer?: string;
  brand?: string;
  model?: string;
  notes?: string;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  tags?: string[];
  
  // Pricing
  cost_price?: number;
  selling_price?: number;
  min_price?: number;
  max_price?: number;
  
  // Gold-specific fields
  is_gold_product?: boolean;
  gold_purity?: number;
  weight_per_unit?: number;
  
  // Inventory
  track_inventory?: boolean;
  min_stock_level?: number;
  max_stock_level?: number;
  
  // Status
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  is_service?: boolean;
  
  // Physical properties
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  
  // Additional info
  manufacturer?: string;
  brand?: string;
  model?: string;
  notes?: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProductSearchParams {
  query?: string;
  category_id?: string;
  status?: string;
  is_gold_product?: boolean;
  is_service?: boolean;
  stock_status?: string;
  min_price?: number;
  max_price?: number;
  manufacturer?: string;
  brand?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

export interface ProductCategoryCreate {
  name: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface ProductCategoryUpdate {
  name?: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface StockAdjustment {
  quantity: number;
  reason?: string;
  reference_type?: string;
  reference_id?: string;
}

export interface ProductStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  discontinued_products: number;
  gold_products: number;
  service_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_inventory_value: number;
  categories_count: number;
}

export interface LowStockAlert {
  product_id: string;
  product_name: string;
  sku?: string;
  current_stock: number;
  min_stock_level: number;
  available_quantity: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

class ProductService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Product CRUD operations
  async getProducts(params: ProductSearchParams = {}): Promise<ProductListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/products?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    return response.json();
  }

  async getProduct(id: string): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }

    return response.json();
  }

  async createProduct(product: ProductCreate): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create product');
    }

    return response.json();
  }

  async updateProduct(id: string, product: ProductUpdate): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update product');
    }

    return response.json();
  }

  async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete product');
    }
  }

  // Category operations
  async getCategories(): Promise<ProductCategory[]> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return response.json();
  }

  async createCategory(category: ProductCategoryCreate): Promise<ProductCategory> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create category');
    }

    return response.json();
  }

  async updateCategory(id: string, category: ProductCategoryUpdate): Promise<ProductCategory> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(category),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update category');
    }

    return response.json();
  }

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/products/categories/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete category');
    }
  }

  // Stock management
  async adjustStock(id: string, adjustment: StockAdjustment): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}/stock/adjust`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(adjustment),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to adjust stock');
    }

    return response.json();
  }

  // Image management
  async uploadImage(productId: string, file: File): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}/images/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload image');
    }

    return response.json();
  }

  async addImages(productId: string, imageUrls: string[]): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}/images`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ image_urls: imageUrls }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to add images');
    }

    return response.json();
  }

  async removeImage(productId: string, imageUrl: string): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}/images?image_url=${encodeURIComponent(imageUrl)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to remove image');
    }

    return response.json();
  }

  // Analytics
  async getProductStats(): Promise<ProductStats> {
    const response = await fetch(`${API_BASE_URL}/api/products/analytics/stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product stats');
    }

    return response.json();
  }

  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const response = await fetch(`${API_BASE_URL}/api/products/analytics/low-stock`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch low stock alerts');
    }

    return response.json();
  }
}

export const productService = new ProductService();
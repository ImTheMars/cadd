import React, { useState, useEffect } from 'react';
import { Search, Filter, BarChart2, Package, Plus, ArrowDown, ArrowUp, AlertCircle, CheckCircle, RefreshCw, X, Save, Eye, Edit } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Product } from '../../types/database.types';

// Add Item Dialog Component
const AddItemDialog = ({ isOpen, onClose, onSave, categories, initialData }: { 
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => Promise<void>;
  categories: string[];
  initialData?: Product;
}) => {
  const [formData, setFormData] = useState<Partial<Product>>(initialData || {
    name: '',
    description: '',
    category: '',
    price: 0,
    current_stock: 0,
    image_url: '',
    is_active: true,
    brand: '',
    product_line: '',
    variant_name: '',
    substance: '',
    strain_type: '',
    size_details: '',
    is_in_stock: true,
    warehouse_location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when dialog closes
      setFormData({
        name: '',
        description: '',
        category: '',
        price: 0,
        current_stock: 0,
        image_url: '',
        is_active: true,
        brand: '',
        product_line: '',
        variant_name: '',
        substance: '',
        strain_type: '',
        size_details: '',
        is_in_stock: true,
        warehouse_location: ''
      });
      setNewCategory('');
      setError(null);
    } else if (initialData) {
      // Set form data when editing an existing product
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseFloat(value) 
          : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.name) {
      setError('Product name is required');
      return;
    }
    
    if (formData.price === undefined || formData.price < 0) {
      setError('Price must be a valid positive number');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setFormData(prev => ({
        ...prev,
        category: newCategory.trim()
      }));
      setNewCategory('');
      setShowNewCategoryInput(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add New Product</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-500 text-red-300 p-3 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <Input
                label="Product Name"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="Enter product name"
                required
                fullWidth
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-text-primary">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Product description"
                className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary resize-none focus:outline-none focus:border-accent"
                rows={3}
              ></textarea>
            </div>
            
            <div>
              {!showNewCategoryInput ? (
                <div>
                  <label className="block mb-2 text-sm font-medium text-text-primary">
                    Category
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="category"
                      value={formData.category || ''}
                      onChange={handleChange}
                      className="flex-1 bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="bg-background-light p-2 rounded-md border-2 border-background-light hover:border-accent"
                      onClick={() => setShowNewCategoryInput(true)}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block mb-2 text-sm font-medium text-text-primary">
                    New Category
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Enter new category"
                      className="flex-1 bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary focus:outline-none focus:border-accent"
                    />
                    <button 
                      type="button" 
                      className="bg-accent hover:bg-accent-hover text-text-dark p-2 rounded-md"
                      onClick={handleAddCategory}
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <Input
              label="Brand"
              name="brand"
              value={formData.brand || ''}
              onChange={handleChange}
              placeholder="Brand name"
              fullWidth
            />
            
            <Input
              label="Price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price || ''}
              onChange={handleChange}
              placeholder="0.00"
              required
              fullWidth
            />
            
            <Input
              label="Current Stock"
              name="current_stock"
              type="number"
              min="0"
              value={formData.current_stock || ''}
              onChange={handleChange}
              placeholder="0"
              fullWidth
            />
            
            <Input
              label="Image URL"
              name="image_url"
              value={formData.image_url || ''}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              fullWidth
            />
            
            <Input
              label="Product Line"
              name="product_line"
              value={formData.product_line || ''}
              onChange={handleChange}
              placeholder="Product line"
              fullWidth
            />
            
            <Input
              label="Variant Name"
              name="variant_name"
              value={formData.variant_name || ''}
              onChange={handleChange}
              placeholder="Variant"
              fullWidth
            />
            
            <Input
              label="Substance"
              name="substance"
              value={formData.substance || ''}
              onChange={handleChange}
              placeholder="Substance"
              fullWidth
            />
            
            <Input
              label="Strain Type"
              name="strain_type"
              value={formData.strain_type || ''}
              onChange={handleChange}
              placeholder="Strain type"
              fullWidth
            />
            
            <Input
              label="Size Details"
              name="size_details"
              value={formData.size_details || ''}
              onChange={handleChange}
              placeholder="Size or weight"
              fullWidth
            />
            
            <Input
              label="Warehouse Location"
              name="warehouse_location"
              value={formData.warehouse_location || ''}
              onChange={handleChange}
              placeholder="e.g., Shelf A-12"
              fullWidth
            />
          </div>
          
          <div className="flex items-center mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
              />
              <span>Product is active</span>
            </label>
            
            <label className="flex items-center cursor-pointer ml-6">
              <input
                type="checkbox"
                name="is_in_stock"
                checked={formData.is_in_stock}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
              />
              <span>Product is in stock</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InventoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'in-stock' | 'low-stock' | 'out-of-stock' | 'all'>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    
    // Add event listener for edit product event
    const handleEditProduct = ((e: CustomEvent) => {
      setSelectedProduct(e.detail);
      setIsEditDialogOpen(true);
    }) as EventListener;
    
    document.addEventListener('edit-product', handleEditProduct);
    
    return () => {
      document.removeEventListener('edit-product', handleEditProduct);
    };
  }, []);
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: productData, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (productData) {
        setProducts(productData);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(productData.filter(item => item.category).map(item => item.category))
        );
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSort = (field: keyof Product) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Define product status function
  const getProductStatus = (product: Product): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    if (product.is_in_stock === false) {
      return 'out-of-stock';
    }
    
    if (product.current_stock <= 0) {
      return 'out-of-stock';
    } else if (product.current_stock <= 5) {
      return 'low-stock';
    } else {
      return 'in-stock';
    }
  };
  
  // Status display information
  const statusInfo = {
    'in-stock': { color: 'bg-green-500/20 text-green-300', icon: <CheckCircle className="h-3.5 w-3.5 mr-1" /> },
    'low-stock': { color: 'bg-yellow-500/20 text-yellow-300', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> },
    'out-of-stock': { color: 'bg-red-500/20 text-red-300', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> },
    'restocking': { color: 'bg-blue-500/20 text-blue-300', icon: <RefreshCw className="h-3.5 w-3.5 mr-1" /> }
  };
  
  const handleAddProduct = async (product: Partial<Product>) => {
    try {
      const { data: insertedData, error: insertError } = await supabase
        .from('products')
        .insert(product)
        .select();
      
      if (insertError) throw insertError;
      
      // Refresh products list
      fetchProducts();
      
      return;
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    }
  };
  
  const handleUpdateProduct = async (id: string, updatedProduct: Partial<Product>) => {
    try {
      const { data: updatedData, error: updateError } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', id)
        .select();
      
      if (updateError) throw updateError;
      
      // Refresh products list
      fetchProducts();
      
      // Close the edit dialog
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      
      return;
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  };
  
  // Count products by status
  const countByStatus = products.reduce((acc, product) => {
    const status = getProductStatus(product);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Filter and sort inventory items
  const filteredItems = products
    .filter(product => {
      const productStatus = getProductStatus(product);
      return (filterCategory === 'all' || product.category === filterCategory) &&
        (filterStatus === 'all' || productStatus === filterStatus) &&
        (product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          product.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchTerm.toLowerCase()));
    })
    .sort((a, b) => {
      if (sortField === 'price' || sortField === 'current_stock') {
        const valA = a[sortField] || 0;
        const valB = b[sortField] || 0;
        return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };
  
  const SortIcon = ({ field }: { field: keyof Product }) => {
    if (field !== sortField) return <ArrowDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-accent" /> : 
      <ArrowDown className="h-3 w-3 text-accent" />;
  };
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <BarChart2 className="h-6 w-6 mr-2 text-accent" />
            Inventory
          </h1>
          <Button 
            className="flex items-center"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Total Items</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <div className="bg-accent/15 p-3 rounded-full">
              <Package className="h-6 w-6 text-accent" />
            </div>
          </div>
          
          <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">In Stock</p>
              <p className="text-2xl font-bold">{countByStatus['in-stock'] || 0}</p>
            </div>
            <div className="bg-green-500/15 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
          
          <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Low Stock</p>
              <p className="text-2xl font-bold">{countByStatus['low-stock'] || 0}</p>
            </div>
            <div className="bg-yellow-500/15 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Out of Stock</p>
              <p className="text-2xl font-bold">{countByStatus['out-of-stock'] || 0}</p>
            </div>
            <div className="bg-red-500/15 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-background/70 backdrop-blur-lg rounded-lg shadow-lg mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Search items by name, ID, brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  className="bg-background-light border-2 border-background-light px-3 py-2 rounded-md text-text-primary appearance-none pr-9 focus:outline-none focus:border-accent"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              </div>
              <div className="relative">
                <select
                  className="bg-background-light border-2 border-background-light px-3 py-2 rounded-md text-text-primary appearance-none pr-9 focus:outline-none focus:border-accent"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'in-stock' | 'low-stock' | 'out-of-stock' | 'all')}
                >
                  <option value="all">All Statuses</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              </div>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchProducts} 
              className="mt-2 ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}
        
        <div className="bg-background rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 border-b-transparent"></div>
              <p className="mt-2 text-text-secondary">Loading inventory...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-light border-b border-background-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Item
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('category')}>
                      <div className="flex items-center">
                        Category
                        <SortIcon field="category" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('price')}>
                      <div className="flex items-center">
                        Price
                        <SortIcon field="price" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('current_stock')}>
                      <div className="flex items-center">
                        Stock
                        <SortIcon field="current_stock" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center">
                        Status
                      </div>
                    </th>
                    {/* Location column removed as requested */}
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => handleSort('updated_at')}>
                      <div className="flex items-center">
                        Last Updated
                        <SortIcon field="updated_at" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-light">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((product) => {
                      const productStatus = getProductStatus(product);
                      return (
                        <tr key={product.id} className="hover:bg-background-light/30 transition-colors">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-text-secondary">{product.id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{product.category || 'Uncategorized'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-accent">{formatCurrency(product.price)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{product.current_stock}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo[productStatus].color}`}>
                              {statusInfo[productStatus].icon}
                              <span className="ml-1">{productStatus.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                            </span>
                          </td>
                          {/* Location column data removed */}
                          <td className="px-4 py-3 text-sm">{formatDate(product.updated_at)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Button 
                              variant="text" 
                              size="sm" 
                              className="mr-2 inline-flex items-center"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="text" 
                              size="sm"
                              className="inline-flex items-center"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-text-secondary">
                        No inventory items found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-background-light px-4 py-3 flex items-center justify-between border-t border-background-light">
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm text-text-secondary">
                  Showing <span className="font-medium">{filteredItems.length}</span> of <span className="font-medium">{products.length}</span> items
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Product Dialog */}
      <AddItemDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={handleAddProduct}
        categories={categories}
      />

      {/* View Product Dialog */}
      <ViewProductDialog
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        product={selectedProduct}
      />

      {/* Edit Product Dialog */}
      {selectedProduct && (
        <AddItemDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedProduct) => handleUpdateProduct(selectedProduct.id, updatedProduct)}
          categories={categories}
          initialData={selectedProduct}
        />
      )}
    </DashboardLayout>
  );
};

// View Product Dialog Component
const ViewProductDialog = ({ isOpen, onClose, product }: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}) => {
  if (!isOpen || !product) return null;
  
  const productStatus = product.is_in_stock === false ? 'out-of-stock' : 
    product.current_stock <= 0 ? 'out-of-stock' : 
    product.current_stock <= 5 ? 'low-stock' : 'in-stock';
  
  const statusInfo = {
    'in-stock': { color: 'bg-green-500/20 text-green-300', icon: <CheckCircle className="h-4 w-4 mr-2" /> },
    'low-stock': { color: 'bg-yellow-500/20 text-yellow-300', icon: <AlertCircle className="h-4 w-4 mr-2" /> },
    'out-of-stock': { color: 'bg-red-500/20 text-red-300', icon: <AlertCircle className="h-4 w-4 mr-2" /> },
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? 'block' : 'hidden'}`}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-black opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-background rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-background px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-text-primary">
                    Product Details
                  </h3>
                  <button
                    type="button"
                    className="bg-background rounded-md text-text-secondary hover:text-text-primary focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mt-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Product ID</span>
                    <span className="text-sm text-text-primary">{product.id}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Name</span>
                    <span className="text-sm text-text-primary">{product.name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Category</span>
                    <span className="text-sm text-text-primary">{product.category || 'Uncategorized'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Price</span>
                    <span className="text-sm text-text-primary">{formatCurrency(product.price)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Current Stock</span>
                    <span className="text-sm text-text-primary">{product.current_stock}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Status</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo[productStatus].color}`}>
                      {statusInfo[productStatus].icon}
                      <span className="ml-1">{productStatus.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Brand</span>
                    <span className="text-sm text-text-primary">{product.brand || 'N/A'}</span>
                  </div>
                  
                  {/* Location information removed as requested */}
                  
                  <div className="flex justify-between items-center border-b border-background-light pb-3">
                    <span className="text-sm font-medium text-text-secondary">Last Updated</span>
                    <span className="text-sm text-text-primary">{formatDate(product.updated_at)}</span>
                  </div>
                  
                  {product.description && (
                    <div className="border-b border-background-light pb-3">
                      <span className="text-sm font-medium text-text-secondary block mb-1">Description</span>
                      <p className="text-sm text-text-primary">{product.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-background-light px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button 
              variant="primary" 
              size="md"
              className="w-full sm:w-auto sm:ml-3"
              onClick={onClose}
            >
              Close
            </Button>
            <Button 
              variant="outline" 
              size="md"
              className="w-full mt-3 sm:w-auto sm:mt-0"
              onClick={() => {
                onClose();
                // Open edit dialog with the current product
                document.dispatchEvent(new CustomEvent('edit-product', { detail: product }));
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
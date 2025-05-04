import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, ShoppingBag, Plus, Minus, X, Check, MapPin, PackagePlus, CreditCard, User, Save } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { Customer, Product } from '../../types/database.types';

// Declare types for Mapbox Search API
declare global {
  interface Window {
    mapboxsearch?: {
      Autofill: new (options: {
        accessToken: string;
        options?: {
          country?: string;
          language?: string;
        };
      }) => {
        addEventListener: (event: string, callback: (event: {
          detail: {
            features: Array<{
              place_name: string;
              geometry: {
                coordinates: [number, number];
              };
            }>;
          };
        }) => void) => void;
      };
    };
  }
}

// Using the provided Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtY2hpc2ljayIsImEiOiJjbTk5a3pweHcwZTJlMm1vYjNzeGoxbGgwIn0.HMaDZt0ucB2DsnrJS7nMVw';

interface OrderItem {
  product_id: string;
  product: Product;
  quantity: number;
  price_at_time: number;
}

interface PaymentMethod {
  method: 'CASH' | 'ZELLE' | 'VENMO' | 'PAYPAL' | 'APPLE_PAY' | 'CREDIT' | 'DEBIT' | 'OTHER';
  amount: number;
  notes?: string;
}

interface GeocodeResult {
  place_name: string;
  center: [number, number];
}



const NewOrderPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Customer state
  const [snapchatUsername, setSnapchatUsername] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    snapchat_username: '',
    phone_number: '',
    email: '',
    telegram_username: '',
  });
  
  // Address and map state
  const [address, setAddress] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<GeocodeResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [viewport, setViewport] = useState({
    longitude: -117.8731,
    latitude: 33.7175,
    zoom: 11
  });
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  
  // Payment state
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>('CASH');
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>('');
  const [newPaymentNotes, setNewPaymentNotes] = useState<string>('');
  
  // Order state
  const [orderNotes, setOrderNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate totals
  const subtotal = selectedProducts.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = subtotal - totalPaid;
  
  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Search for customers when snapchat username changes
  useEffect(() => {
    const searchCustomers = async () => {
      if (!snapchatUsername.trim()) {
        setCustomerSearchResults([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .ilike('snapchat_username', `%${snapchatUsername}%`)
          .limit(5);
        
        if (error) throw error;
        setCustomerSearchResults(data || []);
      } catch (err) {
        console.error('Error searching customers:', err);
      }
    };
    
    const debounce = setTimeout(() => {
      searchCustomers();
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [snapchatUsername]);
  
  // Address search with auto-centering map
  useEffect(() => {
    const searchAddresses = async () => {
      if (!address.trim() || address.trim().length < 3) {
        setAddressSearchResults([]);
        return;
      }
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&country=US&types=address&limit=5`
        );
        const data = await response.json();
        setAddressSearchResults(data.features || []);
        
        // Auto-center map on first result
        if (data.features && data.features.length > 0) {
          const firstResult = data.features[0];
          // Update the map viewport to center on this address
          setViewport({
            ...viewport,
            longitude: firstResult.center[0],
            latitude: firstResult.center[1],
            zoom: 15
          });
          // Set selected location marker
          setSelectedLocation(firstResult.center);
        }
      } catch (err) {
        console.error('Error searching addresses:', err);
      }
    };
    
    const debounce = setTimeout(() => {
      searchAddresses();
    }, 400); // Slightly longer debounce for better UX
    
    return () => clearTimeout(debounce);
  }, [address, viewport]);
  
  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.brand?.toLowerCase().includes(productSearch.toLowerCase())
  );
  
  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSnapchatUsername(customer.snapchat_username);
    setCustomerNotes(customer.notes || ''); // Set customer notes when a customer is selected
    setCustomerSearchResults([]);
  };
  
  // Handle creating a new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.snapchat_username) {
      setError('Snapchat username is required');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          snapchat_username: newCustomer.snapchat_username,
          phone_number: newCustomer.phone_number,
          email: newCustomer.email,
          telegram_username: newCustomer.telegram_username
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSelectedCustomer(data);
      setSnapchatUsername(data.snapchat_username);
      setShowCustomerForm(false);
      setNewCustomer({
        snapchat_username: '',
        phone_number: '',
        email: '',
        telegram_username: '',
      });
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer. Please try again.');
    }
  };
  
  // Handle address selection
  const handleSelectAddress = (result: GeocodeResult) => {
    setAddress(result.place_name);
    setSelectedLocation(result.center);
    setAddressSearchResults([]);
    
    // Update map viewport to center on selected address
    setViewport({
      ...viewport,
      longitude: result.center[0],
      latitude: result.center[1],
      zoom: 15
    });
  };
  
  // Handle adding a product to the order
  const handleAddProduct = (product: Product) => {
    const existingProductIndex = selectedProducts.findIndex(item => item.product_id === product.id);
    
    if (existingProductIndex >= 0) {
      // Increment quantity if product already exists in order
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingProductIndex].quantity += 1;
      setSelectedProducts(updatedProducts);
    } else {
      // Add new product to order
      setSelectedProducts([...selectedProducts, {
        product_id: product.id,
        product: product,
        quantity: 1,
        price_at_time: product.price
      }]);
    }
  };
  
  // Handle changing product quantity
  const handleQuantityChange = (productId: string, change: number) => {
    const updatedProducts = selectedProducts.map(item => {
      if (item.product_id === productId) {
        const newQuantity = Math.max(0, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setSelectedProducts(updatedProducts);
  };
  
  // Handle removing a product from the order
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.product_id !== productId));
  };
  
  // Handle adding a payment method
  const handleAddPayment = () => {
    if (!newPaymentAmount || parseFloat(newPaymentAmount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }
    
    setPayments([...payments, {
      method: newPaymentMethod as PaymentMethod['method'],
      amount: parseFloat(newPaymentAmount),
      notes: newPaymentNotes
    }]);
    
    setNewPaymentMethod('CASH');
    setNewPaymentAmount('');
    setNewPaymentNotes('');
  };
  
  // Handle removing a payment method
  const handleRemovePayment = (index: number) => {
    const updatedPayments = [...payments];
    updatedPayments.splice(index, 1);
    setPayments(updatedPayments);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Handle submitting the order
  const handleSubmitOrder = async () => {
    // Validate order data
    if (!selectedCustomer) {
      setError('Please select or create a customer');
      return;
    }
    
    if (!address || !selectedLocation) {
      setError('Please select a valid address');
      return;
    }
    
    if (selectedProducts.length === 0) {
      setError('Please add at least one product to the order');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: selectedCustomer.id,
          snapchat_username_at_order: selectedCustomer.snapchat_username,
          address: address,
          total_price: subtotal,
          total_paid: totalPaid,
          status: 'PENDING',
          payment_status: totalPaid >= subtotal ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING',
          notes: orderNotes,
          customer_notes: customerNotes
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // 2. Create order items
      const orderItems = selectedProducts.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_time: item.price_at_time
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // 3. Create order payments
      if (payments.length > 0) {
        const orderPayments = payments.map(payment => ({
          order_id: orderData.id,
          payment_method: payment.method,
          amount: payment.amount,
          notes: payment.notes
        }));
        
        const { error: paymentsError } = await supabase
          .from('order_payments')
          .insert(orderPayments);
        
        if (paymentsError) throw paymentsError;
      }
      
      // 4. Navigate to orders page or show success message
      navigate('/dashboard/orders', { 
        state: { 
          orderCreated: true,
          orderId: orderData.id
        } 
      });
      
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Failed to create order. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="p-3 max-w-full mx-auto h-screen overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold flex items-center">
            <PackagePlus className="h-6 w-6 mr-2 text-accent" />
            Create New Order
          </h1>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[calc(100vh-100px)] overflow-hidden">
          {/* Left Column: Customer Information and Address */}
          <div className="space-y-2 lg:col-span-1 overflow-y-auto pr-2 h-full">
            {/* Customer Information Section */}
            <div className="bg-background rounded-lg shadow-md p-2">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <User className="h-5 w-5 mr-2 text-accent" />
                Customer Information
              </h2>
              
              {selectedCustomer ? (
                <>
                  <div className="bg-background-light p-3 rounded-lg mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{selectedCustomer.snapchat_username}</div>
                        {selectedCustomer.phone_number && (
                          <div className="text-sm text-text-secondary mt-1">
                            Phone: {selectedCustomer.phone_number}
                          </div>
                        )}
                        {selectedCustomer.email && (
                          <div className="text-sm text-text-secondary mt-1">
                            Email: {selectedCustomer.email}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="text"
                        size="sm"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <label className="block mb-1 text-sm font-medium text-text-primary">
                      Customer Notes
                    </label>
                    <textarea
                      className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary resize-none focus:outline-none focus:border-accent text-sm"
                      placeholder="Add notes about this customer..."
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                    ></textarea>
                    {selectedCustomer?.notes && customerNotes !== selectedCustomer.notes && (
                      <button 
                        className="text-xs text-accent mt-1 underline"
                        onClick={() => setCustomerNotes(selectedCustomer.notes || '')}
                      >
                        Reset to original notes
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="relative">
                      <Input
                        label="Snapchat Username"
                        placeholder="Search by Snapchat username"
                        value={snapchatUsername}
                        onChange={(e) => setSnapchatUsername(e.target.value)}
                        fullWidth
                      />
                      {customerSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-background-light border border-background rounded-md shadow-lg max-h-60 overflow-auto">
                          {customerSearchResults.map((customer) => (
                            <div
                              key={customer.id}
                              className="p-2 hover:bg-background cursor-pointer"
                              onClick={() => handleSelectCustomer(customer)}
                            >
                              <div className="font-medium">{customer.snapchat_username}</div>
                              {customer.phone_number && (
                                <div className="text-xs text-text-secondary">
                                  Phone: {customer.phone_number}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!showCustomerForm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setShowCustomerForm(true);
                        setNewCustomer({
                          ...newCustomer,
                          snapchat_username: snapchatUsername
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Customer
                    </Button>
                  ) : (
                    <div className="bg-background-light p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium">New Customer</h3>
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => setShowCustomerForm(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Input
                        label="Snapchat Username"
                        placeholder="Required"
                        value={newCustomer.snapchat_username}
                        onChange={(e) => setNewCustomer({...newCustomer, snapchat_username: e.target.value})}
                        required
                        fullWidth
                        className="mb-3"
                      />
                      
                      <Input
                        label="Phone Number"
                        placeholder="Optional"
                        value={newCustomer.phone_number}
                        onChange={(e) => setNewCustomer({...newCustomer, phone_number: e.target.value})}
                        fullWidth
                        className="mb-3"
                      />
                      
                      <Input
                        label="Email"
                        placeholder="Optional"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                        fullWidth
                        className="mb-3"
                      />
                      
                      <Input
                        label="Telegram Username"
                        placeholder="Optional"
                        value={newCustomer.telegram_username}
                        onChange={(e) => setNewCustomer({...newCustomer, telegram_username: e.target.value})}
                        fullWidth
                        className="mb-3"
                      />
                      
                      <Button
                        className="w-full"
                        onClick={handleCreateCustomer}
                      >
                        Create Customer
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Address Selection Section */}
            <div className="bg-background rounded-lg shadow-md p-2">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-accent" />
                Delivery Address
              </h2>
              
              <div className="mb-3">
                {/* Address input above map */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    id="mapbox-autofill"
                    placeholder="Type address here"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary focus:outline-none focus:border-accent"
                    autoComplete="off"
                  />
                  
                  <div className="mapbox-suggestions relative">
                    {addressSearchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-background border border-background-light rounded-md shadow-lg max-h-60 overflow-auto">
                        {addressSearchResults.map((result, index) => (
                          <div
                            key={index}
                            className="p-2 hover:bg-background-light cursor-pointer"
                            onClick={() => handleSelectAddress(result)}
                          >
                            <div className="font-medium">{result.place_name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Map display with fixed height */}
                <div className="rounded-lg overflow-hidden mb-2 relative" style={{ height: '200px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Map
                    mapboxAccessToken={mapboxgl.accessToken}
                    initialViewState={viewport}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    reuseMaps
                  >
                    {selectedLocation && (
                      <Marker 
                        longitude={selectedLocation[0]} 
                        latitude={selectedLocation[1]}
                        anchor="bottom"
                        draggable={true}
                        onDragEnd={(e) => {
                          // Update location when marker is dragged
                          const { lngLat } = e;
                          setSelectedLocation([lngLat.lng, lngLat.lat]);
                          // Reverse geocode to get address from coordinates
                          fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxgl.accessToken}`)
                            .then(response => response.json())
                            .then(data => {
                              if (data.features?.length > 0) {
                                setAddress(data.features[0].place_name);
                              }
                            });
                        }}
                      >
                        <div className="text-red-500">
                          <MapPin className="h-6 w-6" />
                        </div>
                      </Marker>
                    )}
                  </Map>

                  
                  {/* Optional: Add search instructions */}
                  {!selectedLocation && !address && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center text-text-secondary bg-background/30 backdrop-blur-sm p-2 rounded">
                        <MapPin className="h-8 w-8 mx-auto mb-1 opacity-50" />
                        <p className="text-sm">Search for an address or drag the marker</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Order Notes */}
            <div className="bg-background rounded-lg shadow-md p-2">
              <h2 className="text-lg font-semibold mb-2">Order Notes</h2>
              <textarea
                className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary resize-none focus:outline-none focus:border-accent"
                placeholder="Add any special instructions or notes for this order..."
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              ></textarea>
            </div>
          </div>
          
          {/* Middle Column: Products Selection */}
          <div className="space-y-2 overflow-y-auto pr-2 h-full">
            <div className="bg-background rounded-lg shadow-md p-2">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-accent" />
                Products
              </h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  placeholder="Search products by name, category, or brand"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              <div className="overflow-y-auto mb-3 pr-2" style={{ height: '25vh' }}>
                {filteredProducts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <div 
                        key={product.id} 
                        className="bg-background-light p-3 rounded-lg flex justify-between items-center hover:bg-background-light/80 cursor-pointer"
                        onClick={() => handleAddProduct(product)}
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-text-secondary">{product.category}</div>
                        </div>
                        <div className="text-accent font-medium">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-text-secondary">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No products found</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected Products */}
            <div className="bg-background rounded-lg shadow-md p-2">
              <h2 className="text-lg font-semibold mb-2">Selected Products</h2>
              
              {selectedProducts.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {selectedProducts.map((item) => (
                    <div key={item.product_id} className="bg-background-light p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="flex items-center">
                          <button 
                            className="p-1 hover:bg-background rounded-full"
                            onClick={() => handleQuantityChange(item.product_id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="mx-2 min-w-[24px] text-center">{item.quantity}</span>
                          <button 
                            className="p-1 hover:bg-background rounded-full"
                            onClick={() => handleQuantityChange(item.product_id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 hover:bg-background rounded-full ml-2"
                            onClick={() => handleRemoveProduct(item.product_id)}
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-text-secondary">
                          {formatCurrency(item.price_at_time)} × {item.quantity}
                        </span>
                        <span className="font-medium text-accent">
                          {formatCurrency(item.price_at_time * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 text-text-secondary bg-background-light/50 rounded-lg mb-3">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No products selected</p>
                </div>
              )}
              
              <div className="border-t border-background-light pt-3">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <span className="font-bold text-accent">{formatCurrency(subtotal)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Payment Methods and Order Summary */}
          <div className="space-y-2 overflow-y-auto pr-2 h-full">
            {/* Payment Methods */}
            <div className="bg-background rounded-lg shadow-md p-2">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-accent" />
                Payment Methods
              </h2>
              
              <div className="mb-3">
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-text-primary">
                      Payment Method
                    </label>
                    <select
                      className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary focus:outline-none focus:border-accent"
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value)}
                    >
                      <option value="CASH">Cash</option>
                      <option value="ZELLE">Zelle</option>
                      <option value="VENMO">Venmo</option>
                      <option value="PAYPAL">PayPal</option>
                      <option value="APPLE_PAY">Apple Pay</option>
                      <option value="CREDIT">Credit Card</option>
                      <option value="DEBIT">Debit Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  <Input
                    label="Amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    fullWidth
                  />
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium text-text-primary">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary focus:outline-none focus:border-accent"
                      placeholder="Payment notes"
                      value={newPaymentNotes}
                      onChange={(e) => setNewPaymentNotes(e.target.value)}
                    />
                  </div>
                  
                  <Button
                    onClick={handleAddPayment}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                </div>
                
                {payments.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {payments.map((payment, index) => (
                      <div key={index} className="bg-background-light p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-medium">{payment.method.replace('_', ' ')}</div>
                          {payment.notes && (
                            <div className="text-xs text-text-secondary">{payment.notes}</div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <span className="text-accent font-medium mr-3">
                            {formatCurrency(payment.amount)}
                          </span>
                          <button 
                            className="p-1 hover:bg-background rounded-full"
                            onClick={() => handleRemovePayment(index)}
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-text-secondary bg-background-light/50 rounded-lg mb-3">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No payments added</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="bg-background rounded-lg shadow-md p-2">
              <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Paid Amount:</span>
                  <span>{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center font-bold border-t border-background-light pt-3">
                  <span>Balance:</span>
                  <span className={balance === 0 ? 'text-green-400' : 'text-accent'}>
                    {formatCurrency(balance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <span 
                    className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${balance === 0 ? 'bg-green-500/20 text-green-300' : 
                        balance < subtotal ? 'bg-yellow-500/20 text-yellow-300' : 
                        'bg-red-500/20 text-red-300'}`}
                  >
                    {balance === 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING')}
                  </span>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={handleSubmitOrder}
                isLoading={loading}
                disabled={loading || !selectedCustomer || !address || selectedProducts.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewOrderPage;
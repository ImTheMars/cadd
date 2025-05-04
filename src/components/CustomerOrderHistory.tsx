import React from 'react';
import { Calendar, Package, Clock } from 'lucide-react';
import { Order, OrderItem, Product } from '../types/database.types';
import Button from './ui/Button';

interface CustomerOrderHistoryProps {
  orders: Order[];
  orderItems: Record<number, { item: OrderItem; product: Product }[]>;
}

const CustomerOrderHistory: React.FC<CustomerOrderHistoryProps> = ({ orders, orderItems }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'ASSIGNED':
        return 'bg-blue-500/20 text-blue-300';
      case 'ENROUTE':
        return 'bg-purple-500/20 text-purple-300';
      case 'DELIVERED':
        return 'bg-green-500/20 text-green-300';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Package className="h-5 w-5 mr-2 text-accent" />
        Order History
      </h3>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-background-light rounded-lg overflow-hidden">
              <div className="p-4 border-b border-background">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="font-medium text-sm">Order #{order.id}</span>
                    <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <Button variant="text" size="sm">
                    View Details
                  </Button>
                </div>
                <div className="flex items-center text-xs text-text-secondary">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  <span className="mr-3">{formatDate(order.created_at)}</span>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span>
                    {new Date(order.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>

              <div className="px-4 py-2">
                {orderItems[order.id] ? (
                  <div className="space-y-2">
                    {orderItems[order.id].map(({ item, product }) => (
                      <div key={item.id} className="flex justify-between py-1 border-b border-background text-sm">
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <span className="text-text-secondary ml-2">
                            x{item.quantity}
                          </span>
                        </div>
                        <span>{formatCurrency(item.price_at_time * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary py-2">No items found</p>
                )}
              </div>

              <div className="bg-background/30 p-3 flex justify-between">
                <span className="text-sm">Total:</span>
                <span className="font-bold text-accent">
                  {formatCurrency(order.total_price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerOrderHistory;
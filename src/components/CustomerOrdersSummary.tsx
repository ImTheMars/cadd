import React from 'react';
import { Calculator, ShoppingBag, TrendingUp, DollarSign, LineChart, Clock } from 'lucide-react';
import { CustomerOrderSummary } from '../types/database.types';

interface CustomerOrdersSummaryProps {
  summary: CustomerOrderSummary;
}

const CustomerOrdersSummary: React.FC<CustomerOrdersSummaryProps> = ({ summary }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-background rounded-xl shadow-md p-4 border border-background-light/50">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Calculator className="h-5 w-5 mr-2 text-accent" />
        Financial Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-background-light to-background p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-background-light/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-text-secondary font-medium">Total Orders</span>
            <div className="bg-accent/20 p-2 rounded-full">
              <ShoppingBag className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{summary.totalOrders}</p>
            <span className="text-xs text-text-secondary">orders placed</span>
          </div>
          <div className="mt-2 pt-2 border-t border-background-light/50">
            <span className="text-xs text-text-secondary flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1 text-accent/70" /> All time history
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-background-light to-background p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-background-light/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-text-secondary font-medium">Total Spent</span>
            <div className="bg-accent/20 p-2 rounded-full">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</p>
            <span className="text-xs text-text-secondary">lifetime value</span>
          </div>
          <div className="mt-2 pt-2 border-t border-background-light/50">
            <span className="text-xs text-text-secondary flex items-center">
              <TrendingUp className="h-3.5 w-3.5 mr-1 text-accent/70" /> {summary.totalOrders > 0 ? `~${formatCurrency(summary.totalSpent / summary.totalOrders)} per order` : 'No orders yet'}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-background-light to-background p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-background-light/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-text-secondary font-medium">Average Order</span>
            <div className="bg-accent/20 p-2 rounded-full">
              <LineChart className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{formatCurrency(summary.averageOrderValue)}</p>
            <span className="text-xs text-text-secondary">per transaction</span>
          </div>
          <div className="mt-2 pt-2 border-t border-background-light/50">
            <span className="text-xs text-text-secondary flex items-center">
              <Calculator className="h-3.5 w-3.5 mr-1 text-accent/70" /> Based on {summary.totalOrders} orders
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrdersSummary;
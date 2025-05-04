import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardIndex from './dashboard/Index';
import OrdersPage from './dashboard/Orders';
import CustomersPage from './dashboard/Customers';
import CustomerDetail from './dashboard/CustomerDetail';
import InventoryPage from './dashboard/Inventory';
import RoutesAndDriversPage from './dashboard/RoutesAndDrivers';
import NewOrderPage from './dashboard/NewOrder';

const Dashboard = () => {
  return (
    <Routes>
      <Route path="/" element={<DashboardIndex />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/new" element={<NewOrderPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/customers/:id" element={<CustomerDetail />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/routes-drivers" element={<RoutesAndDriversPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Dashboard;
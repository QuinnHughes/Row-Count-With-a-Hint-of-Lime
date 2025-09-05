import React from 'react';
import { useAppStore } from '../store';

export const DashboardStats: React.FC = () => {
  const loadouts = useAppStore(s => s.loadouts);
  const cartSize = loadouts?.cartSize ?? useAppStore.getState().cartSize;
  if (!loadouts) return null;
  const totalRows = loadouts.carts.reduce((sum, c) => sum + c.rows.length, 0);
  const fullCarts = loadouts.carts.filter(c => c.rows.length === cartSize).length;
  const partial = loadouts.carts.filter(c => c.rows.length > 0 && c.rows.length < cartSize).length;
  const utilization = totalRows && cartSize ? (totalRows / (loadouts.carts.length * cartSize)) : 0;
  return (
    <div className="stat-grid">
      <div className="stat"><h3>Total Rows</h3><p>{totalRows}</p></div>
      <div className="stat"><h3>Carts</h3><p>{loadouts.carts.length}</p></div>
      <div className="stat"><h3>Full Carts</h3><p>{fullCarts}</p></div>
      <div className="stat"><h3>Partial Carts</h3><p>{partial}</p></div>
      <div className="stat"><h3>Cart Size</h3><p>{cartSize}</p></div>
      <div className="stat"><h3>Utilization</h3><p>{(utilization*100).toFixed(0)}%</p></div>
    </div>
  );
};
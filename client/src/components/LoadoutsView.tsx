import React from 'react';
import { useAppStore } from '../store';

export const LoadoutsView: React.FC = () => {
  const loadouts = useAppStore(s => s.loadouts);
  if (!loadouts) return <div className="card">No loadouts yet.</div>;
  const cartSize = loadouts.cartSize || 6;
  return (
    <div className="cards">
      {loadouts.carts.map(c => {
        const pct = (c.rows.length / cartSize) * 100;
        return (
          <div className="card" key={c.cart}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Cart {c.cart}</strong>
              <span className="badge">{c.rows.length} / {cartSize}</span>
            </div>
            <div className="cart-meter"><span style={{ width: pct + '%' }} /></div>
            <div className="loadout-cart">
              {c.rows.map(r => (
                <span className="pill" key={r.section_id + '-' + r.unit_index_within_section}>
                  {r.section_code} #{r.unit_index_within_section}
                </span>
              ))}
              {c.rows.length === 0 && <em style={{ fontSize:'0.6rem', color:'#66788a' }}>empty</em>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

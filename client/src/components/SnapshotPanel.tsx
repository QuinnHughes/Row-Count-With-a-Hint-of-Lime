import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';

export const SnapshotPanel: React.FC = () => {
  const { snapshots, loadSnapshots, createSnapshot, toggleShelved, selectedGroup, setSelectedGroup, sections } = useAppStore();
  const date = useAppStore(s => s.date);
  const cartSize = useAppStore(s => s.cartSize);
  const selected = useAppStore(s => s.selectedSectionIds);
  const [initials, setInitials] = useState('');

  useEffect(() => { loadSnapshots(); }, [date]);

  const handleCreate = async () => {
    if (!initials.trim()) return;
    await createSnapshot(initials.trim());
    setInitials('');
  };

  return (
    <div className="card" style={{ marginTop:'0.75rem' }}>
      <strong style={{ display:'block', marginBottom:4 }}>Snapshots</strong>
      <small style={{ color:'#4d5b66' }}>Freeze current loadout (date, selected sections & rows) with your initials.</small>
      <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.5rem', flexWrap:'wrap' }}>
        <input
          placeholder="Initials"
          maxLength={4}
          value={initials}
          onChange={e => setInitials(e.target.value.toUpperCase())}
          style={{ padding:'0.3rem 0.4rem', fontSize:'0.7rem', width:80 }}
        />
        <select value={selectedGroup || ''} onChange={e => setSelectedGroup(e.target.value || null)} style={{ padding:'0.3rem 0.4rem', fontSize:'0.7rem' }}>
          <option value="">All Locations</option>
          {Array.from(new Set(sections.map(s => s.group || 'Other'))).map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button onClick={handleCreate} disabled={!initials.trim()} style={{ opacity: initials.trim()?1:0.5 }}>Save</button>
      </div>
      <div style={{ marginTop:'0.6rem', fontSize:'0.6rem', color:'#5c6f82' }}>
        Cart Size: {cartSize} · Sections: {selected.length ? selected.length : 'All'}
      </div>
      <div style={{ marginTop:'0.6rem', display:'grid', gap:'0.5rem' }}>
        {snapshots.length === 0 && <em style={{ fontSize:'0.6rem', color:'#66788a' }}>No snapshots yet.</em>}
        {snapshots.map(s => {
          const totalRows = s.carts.reduce((sum,c)=> sum + c.rows.length, 0);
            return (
              <div key={s.id} style={{ border:'1px solid #d7e2ec', borderRadius:6, padding:'0.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                  <div style={{ fontSize:'0.65rem', fontWeight:600, flex:1 }}>
                    {s.date} · {s.initials} · {s.group || 'All'} · {s.carts.length} carts · {totalRows} rows
                  </div>
                  <span style={{ fontSize:'0.55rem', color:'#5c6f82' }}>{new Date(s.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                </div>
                <div style={{ marginTop:'0.4rem', display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                  {s.carts.map(c => {
                    const pct = (c.rows.length / s.cart_size) * 100;
                    return (
                      <label key={c.cart} style={{
                        background:'#eef3f9',
                        border:'1px solid #c3d1dd',
                        padding:'0.35rem 0.45rem',
                        borderRadius:4,
                        fontSize:'0.55rem',
                        display:'flex',
                        flexDirection:'column',
                        minWidth:70
                      }}>
                        <span style={{ fontWeight:600 }}>C{c.cart}</span>
                        <span>{c.rows.length}/{s.cart_size}</span>
                        <div style={{ height:4, background:'#d7e2ec', borderRadius:2, overflow:'hidden', marginTop:2 }}>
                          <span style={{ display:'block', height:'100%', width: pct + '%', background: c.shelved ? '#2a854e' : '#0d4d92' }} />
                        </div>
                        <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:2 }}>
                          <input
                            type="checkbox"
                            checked={c.shelved}
                            onChange={e => toggleShelved(s.id, c.cart, e.target.checked)}
                            style={{ transform:'scale(0.9)' }}
                          />
                          <span>{c.shelved ? 'Shelved' : 'Pending'}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};
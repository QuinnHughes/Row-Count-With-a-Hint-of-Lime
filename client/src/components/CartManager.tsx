import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';

export const CartManager: React.FC = () => {
  const { carts, loadCarts, addCart, setCartShelvedState, removeCart, sections, loadDailyCartStats, dailyCartStats } = useAppStore();
  const date = useAppStore(s => s.date);
  const [group, setGroup] = useState('');
  const [initials, setInitials] = useState('');
  const [rows, setRows] = useState<number>(0);

  const groups = Array.from(new Set(sections.map(s => s.group || 'Other'))).sort();

  useEffect(()=> { loadCarts(); loadDailyCartStats(); }, [date]);

  useEffect(()=> { if(!group && groups.length) setGroup(groups[0]); }, [groups, group]);

  const submit = async () => {
    if (!group || !initials.trim()) return;
    await addCart(group, initials.trim().toUpperCase(), rows || 0);
    setRows(0); setInitials('');
  };

  return (
    <div className="card">
      <strong>Manual Carts</strong>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginTop:'0.5rem' }}>
        <select value={group} onChange={e=>setGroup(e.target.value)} style={{ padding:'0.3rem', fontSize:'0.7rem' }}>
          {groups.map(g => <option key={g}>{g}</option>)}
        </select>
        <input placeholder="Initials" maxLength={4} value={initials} onChange={e=>setInitials(e.target.value.toUpperCase())} style={{ padding:'0.3rem', fontSize:'0.7rem', width:80 }} />
        <input type="number" min={0} value={rows} onChange={e=>setRows(Number(e.target.value)||0)} style={{ padding:'0.3rem', fontSize:'0.7rem', width:90 }} placeholder="Rows" />
        <button onClick={submit} disabled={!initials.trim()} style={{ opacity: initials.trim()?1:0.5 }}>Add Cart</button>
      </div>
      <div style={{ marginTop:'0.7rem', display:'grid', gap:'0.4rem' }}>
        {carts.length === 0 && <em style={{ fontSize:'0.6rem', color:'#66788a' }}>No carts for {date}.</em>}
        {carts.map(c => (
          <div key={c.id} style={{ border:'1px solid #d7e2ec', borderRadius:6, padding:'0.4rem 0.5rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <div style={{ fontSize:'0.55rem', width:70, fontWeight:600 }}>{c.group}</div>
            <div style={{ fontSize:'0.55rem' }}>{c.rows} rows</div>
            <div style={{ fontSize:'0.55rem', color:'#66788a' }}>{c.initials}</div>
            <label style={{ fontSize:'0.55rem', display:'flex', alignItems:'center', gap:3 }}>
              <input type="checkbox" checked={c.shelved} onChange={e=>setCartShelvedState(c.id, e.target.checked)} /> {c.shelved? 'Shelved':'Pending'}
            </label>
            <button className="secondary" style={{ background:'#b9382c' }} onClick={()=>removeCart(c.id)}>X</button>
          </div>
        ))}
      </div>
      {dailyCartStats && (
        <div style={{ marginTop:'0.8rem', fontSize:'0.6rem', color:'#4d5b66' }}>
          Total: {dailyCartStats.totalCarts} carts / {dailyCartStats.totalRows} rows
        </div>
      )}
    </div>
  );
};
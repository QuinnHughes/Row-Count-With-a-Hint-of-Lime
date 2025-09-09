import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { displayGroup, compareGroups } from '../constants';
import { fetchEntries } from '../api';

export const ShelvingWorkspace: React.FC = () => {
  const { sections, entries, setEntry, saveEntry, loadEntries, carts, loadCarts, addCart, setCartShelvedState, removeCart, setCartRows } = useAppStore();
  const date = useAppStore(s => s.date);
  const [group, setGroup] = useState('');
  const [initials, setInitials] = useState('');
  const [newCartRows, setNewCartRows] = useState<number>(0);
  const [prevEntriesMap, setPrevEntriesMap] = useState<Record<number, number>>({});
  const groups = useMemo(()=> Array.from(new Set(sections.map(s=> s.group || 'Other'))).sort(compareGroups), [sections]);
  const groupSections = useMemo(()=> sections.filter(s => (s.group||'Other')===group), [sections, group]);
  const groupCodes = useMemo(()=> groupSections.map(s=>s.code).join(', '), [groupSections]);
  useEffect(()=> { if(!group && groups.length) setGroup(groups[0]); }, [groups, group]);
  useEffect(()=> { loadEntries(); loadCarts(); }, [date]);
  useEffect(()=> {
    const prevD = prevStr;
    fetchEntries(prevD).then(list => {
      const map: Record<number, number> = {};
      list.forEach(e => { map[e.section_id] = e.rows; });
      setPrevEntriesMap(map);
    }).catch(()=> setPrevEntriesMap({}));
  }, [date]);

  const totalGroupRows = groupSections.reduce((sum,s)=> sum + (entries[s.id]||0),0);
  const groupCartRows = carts.filter(c=> c.group===group).reduce((s,c)=> s+c.rows,0);
  const groupCarts = carts.filter(c=> c.group===group);
  const todayStr = date;
  const prevStr = (()=>{ const d=new Date(date+'T00:00:00'); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
  const isPrevDayCart = (c:any) => c.date === prevStr;

  const saveAll = async () => { for (const sec of groupSections) await saveEntry(sec.id); };
  const addCartAction = async () => { if(!group || !initials.trim()) return; await addCart(group, initials.trim().toUpperCase(), newCartRows||0); setInitials(''); setNewCartRows(0); };

  return (
    <div style={{ display:'grid', gap:'1rem' }}>
      <div className="card" style={{ display:'flex', flexWrap:'wrap', gap:'0.6rem', alignItems:'center' }}>
        <div style={{ fontWeight:600 }}>Location:</div>
        <select value={group} onChange={e=>setGroup(e.target.value)}>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
  <div style={{ fontSize:'0.7rem', color:'#44515c' }}>{displayGroup(group)} · Sections: {groupSections.length} · Shelf Rows: {totalGroupRows} · Cart Rows: {groupCartRows}</div>
        <button onClick={saveAll} style={{ marginLeft:'auto' }}>Save Rows</button>
      </div>
      <div className="card">
  <strong style={{ fontSize:'0.8rem' }}>Shelf Rows · {displayGroup(group)}</strong>
        <div style={{ marginTop:'0.5rem', display:'grid', gap:'0.4rem' }}>
          {groupSections.map(sec => {
            const val = entries[sec.id] ?? '';
            return (
              <div key={sec.id} style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
                <div style={{ width:140, fontSize:'0.6rem', fontWeight:600 }}>{sec.code}</div>
                <input type="number" style={{ width:80 }} min={0} value={val} onChange={e=>setEntry(sec.id, Number(e.target.value)||0)} />
                {sec.daily_cap != null && <span style={{ fontSize:'0.55rem', color:(entries[sec.id]||0) > (sec.daily_cap||0)?'#b9382c':'#5b6872' }}>Cap {sec.daily_cap}</span>}
              </div>
            );
          })}
          {groupSections.length===0 && <em style={{ fontSize:'0.6rem', color:'#66788a' }}>No sections for this location.</em>}
        </div>
      </div>
      <div className="card">
  <strong style={{ fontSize:'0.8rem' }}>Cart Rows · {displayGroup(group)}</strong>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginTop:'0.5rem' }}>
          <input placeholder="Initials" maxLength={4} value={initials} onChange={e=>setInitials(e.target.value.toUpperCase())} style={{ padding:'0.3rem', fontSize:'0.7rem', width:80 }} />
          <input type="number" min={0} value={newCartRows} onChange={e=>setNewCartRows(Number(e.target.value)||0)} style={{ padding:'0.3rem', fontSize:'0.7rem', width:90 }} placeholder="Rows" />
          <button onClick={addCartAction} disabled={!initials.trim()} style={{ opacity: initials.trim()?1:0.5 }}>Add Cart</button>
        </div>
        <div style={{ marginTop:'0.7rem', display:'grid', gap:'0.4rem' }}>
          {groupCarts.length===0 && <em style={{ fontSize:'0.6rem', color:'#66788a' }}>No carts for {group||'—'}.</em>}
          {groupCarts.map(c => (
            <div key={c.id} style={{ border:'1px solid #d7e2ec', borderRadius:6, padding:'0.4rem 0.5rem', display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <div style={{ fontSize:'0.55rem', width:60, fontWeight:600 }}>#{c.id}</div>
                {isPrevDayCart(c) && <span style={{ fontSize:'0.5rem', color:'#66788a', border:'1px solid #d7e2ec', padding:'1px 4px', borderRadius:4 }}>Prev Day</span>}
              </div>
              <div style={{ fontSize:'0.55rem' }}>{c.rows} rows</div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <button className="secondary" onClick={()=> setCartRows(c.id, Math.max(0, c.rows - 1))}>-1</button>
                <button className="secondary" onClick={()=> setCartRows(c.id, Math.max(0, c.rows - 5))}>-5</button>
                <button className="secondary" onClick={()=> setCartRows(c.id, Math.max(0, c.rows - 10))}>-10</button>
              </div>
              <div style={{ fontSize:'0.55rem', color:'#66788a' }}>{c.initials}</div>
              <label style={{ fontSize:'0.55rem', display:'flex', alignItems:'center', gap:3 }}>
                <input type="checkbox" checked={c.shelved} onChange={e=>setCartShelvedState(c.id, e.target.checked)} /> {c.shelved? 'Shelved':'Pending'}
              </label>
              <button className="secondary" style={{ background:'#b9382c' }} onClick={()=>removeCart(c.id)}>X</button>
            </div>
          ))}
        </div>
      </div>
    <div className="card">
        <strong style={{ fontSize:'0.8rem' }}>Comparison</strong>
        <div style={{ marginTop:'0.4rem', fontSize:'0.6rem', color:'#44515c' }}>
      Today shelf rows: <strong>{totalGroupRows}</strong> · Prev day shelf rows: <strong>{groupSections.reduce((s,sec)=> s + (prevEntriesMap[sec.id]||0), 0)}</strong>
        </div>
        <div style={{ fontSize:'0.55rem', color:'#66788a' }}>Tip: Use -1/-5/-10 to deduct shelved rows from carry-over carts.</div>
      </div>
    </div>
  );
};

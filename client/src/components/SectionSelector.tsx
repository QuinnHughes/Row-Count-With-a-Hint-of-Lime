import React from 'react';
import { useAppStore } from '../store';

export const SectionSelector: React.FC = () => {
  const { sections, selectedSectionIds, toggleSection, clearSelection, buildCustom } = useAppStore();
  const cartSize = useAppStore(s => s.cartSize);
  const date = useAppStore(s => s.date);
  // Group sections
  const groups = sections.reduce<Record<string, typeof sections>>( (acc, s) => {
    const g = s.group || 'Other';
    (acc[g] = acc[g] || []).push(s);
    return acc;
  }, {});
  return (
    <div className="card" style={{ marginTop:'0.75rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.4rem' }}>
        <strong>Build Custom Loadout</strong>
        <div style={{ display:'flex', gap:'0.4rem' }}>
          <button className="secondary" onClick={clearSelection} style={{ background:'#8996a3' }}>Clear</button>
          <button onClick={() => buildCustom()}>Generate</button>
        </div>
      </div>
      <small style={{ color:'#4d5b66' }}>Select sections to generate carts (cart size {cartSize}) for {date}.</small>
      <div style={{ display:'grid', gap:'0.4rem', marginTop:'0.6rem' }}>
        {Object.entries(groups).map(([groupName, secs]) => (
          <div key={groupName} style={{ border:'1px solid #d7e2ec', borderRadius:4, padding:'0.4rem 0.5rem' }}>
            <div style={{ fontSize:'0.65rem', fontWeight:600, letterSpacing:0.5, color:'#5c6f82', marginBottom:'0.25rem' }}>{groupName}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
              {secs.map(s => {
                const active = selectedSectionIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSection(s.id)}
                    style={{
                      background: active ? '#0d4d92' : '#eef3f9',
                      color: active ? '#fff' : '#0d4d92',
                      border:'1px solid #0d4d92',
                      fontSize:'0.6rem',
                      padding:'0.25rem 0.5rem'
                    }}
                  >{s.code}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
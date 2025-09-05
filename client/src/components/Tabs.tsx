import React from 'react';
export interface TabDef { id: string; label: string; }

export const Tabs: React.FC<{ tabs: TabDef[]; active: string; onChange:(id:string)=>void; }> = ({ tabs, active, onChange }) => {
  return (
    <div style={{ display:'flex', gap:'0.4rem', margin:'0.6rem 0 0.9rem' }}>
      {tabs.map(t => {
        const is = t.id === active;
        return (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            background: is ? '#0d4d92' : '#eef3f9',
            color: is ? '#fff' : '#0d4d92',
            border:'1px solid #0d4d92',
            fontSize:'0.7rem',
            padding:'0.4rem 0.7rem'
          }}>{t.label}</button>
        );
      })}
    </div>
  );
};
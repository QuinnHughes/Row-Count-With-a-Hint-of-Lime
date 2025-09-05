import React from 'react';
import { useAppStore } from '../store';

export const SectionsTable: React.FC = () => {
  const { sections, entries, setEntry, saveEntry, date } = useAppStore();
  return (
    <div style={{ overflowX: 'auto', maxHeight: 520 }}>
      <table>
        <thead>
          <tr>
            <th>Section</th>
            <th>Rows ({date})</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sections.map(s => {
            const val = entries[s.id] ?? '';
            return (
              <tr key={s.id}>
                <td>
                  <strong>{s.code}</strong><br />
                  <small>{s.name.split('(')[1]?.replace(')', '')}</small>
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={s.daily_cap ?? 500}
                    value={val}
                    onChange={e => setEntry(s.id, e.target.value === '' ? 0 : Number(e.target.value))}
                    style={s.daily_cap != null ? { borderColor: '#0d4d92' } : {}}
                  />
                  {s.daily_cap != null && (
                    <span className="capsule">/ {s.daily_cap}</span>
                  )}
                </td>
                <td>
                  <button onClick={() => saveEntry(s.id)}>Save</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

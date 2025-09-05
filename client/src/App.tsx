import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { SectionsTable } from './components/SectionsTable';
import { LoadoutsView } from './components/LoadoutsView';
import { DashboardStats } from './components/DashboardStats';
import { SectionSelector } from './components/SectionSelector';

export const App: React.FC = () => {
  const init = useAppStore(s => s.init);
  const date = useAppStore(s => s.date);
  const setDate = useAppStore(s => s.setDate);
  const refreshLoadouts = useAppStore(s => s.refreshLoadouts);
  const cartSize = useAppStore(s => s.cartSize);
  const setCartSize = useAppStore(s => s.setCartSize);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { refreshLoadouts(); }, [date]);

  return (
    <>
      <header>
        <h1>Library Shelving Loadouts</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input type="number" min={1} max={50} style={{ width:60 }} value={cartSize} title="Cart Size" onChange={e => setCartSize(Number(e.target.value)||6)} />
            <button onClick={() => refreshLoadouts()}>Refresh</button>
        </div>
      </header>
      <main className="container">
        <div className="grid cols-2" style={{ alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', margin:'0 0 0.5rem' }}>Daily Rows</h2>
            <SectionsTable />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', margin:'0 0 0.5rem' }}>Loadouts</h2>
            <DashboardStats />
            <SectionSelector />
            <LoadoutsView />
          </div>
        </div>
      </main>
      <footer>Rows per section build cart loadouts of 6 sequentially. v0.1</footer>
    </>
  );
};

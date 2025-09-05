import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { OverviewPanel } from './components';
import { ShelvingWorkspace } from './components/ShelvingWorkspace';
import { Tabs } from './components/Tabs';

export const App: React.FC = () => {
  const init = useAppStore(s => s.init);
  const date = useAppStore(s => s.date);
  const setDate = useAppStore(s => s.setDate);
  const refreshLoadouts = useAppStore(s => s.refreshLoadouts);
  const cartSize = useAppStore(s => s.cartSize); // still used for auto loadouts logic (legacy)
  const setCartSize = useAppStore(s => s.setCartSize);
  const [tab, setTab] = React.useState<'workspace'|'overview'>('workspace');

  useEffect(() => { init(); }, [init]);
  useEffect(() => { refreshLoadouts(); }, [date]);

  return (
    <>
      <header>
        <h1>Library Shelving Loadouts</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => refreshLoadouts()}>Recalc Auto</button>
        </div>
      </header>
      <main className="container">
        <Tabs
          tabs={[
            { id:'workspace', label:'Shelving Workspace'},
            { id:'overview', label:'Overview'}
          ]}
          active={tab}
          onChange={id => setTab(id as any)}
        />
        {tab === 'workspace' && (
          <ShelvingWorkspace />
        )}
        {tab === 'overview' && (
          <div style={{ display:'grid', gap:'0.8rem' }}>
            <OverviewPanel />
          </div>
        )}
      </main>
      <footer style={{ fontSize:'0.6rem' }}>Daily library shelving tracker · manual carts + overview stats · v0.2</footer>
    </>
  );
};

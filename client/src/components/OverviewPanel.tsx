import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { displayGroup } from '../constants';

export const OverviewPanel: React.FC = () => {
  const overview = useAppStore(s => s.overview);
  const loadOverview = useAppStore(s => s.loadOverview);
  const date = useAppStore(s => s.date);
  const dailyCartStats = useAppStore(s => s.dailyCartStats);
  const loadDailyCartStats = useAppStore(s => s.loadDailyCartStats);
  const analytics = useAppStore(s => s.analytics);
  const loadAnalytics = useAppStore(s => s.loadAnalytics);
  const sections = useAppStore(s => s.sections);
  const [period, setPeriod] = useState<'week'|'month'|'year'>('week');
  const [analyticsDate, setAnalyticsDate] = useState<string>(date);

  useEffect(()=> { loadOverview(); loadDailyCartStats(); }, [date]);
  useEffect(()=> { loadAnalytics(period, analyticsDate); }, [analyticsDate, period]);

  const shiftAnalytics = (dir: -1|1) => {
    const d = new Date(analyticsDate + 'T00:00:00');
    if (period === 'week') {
      d.setDate(d.getDate() + (7*dir));
    } else if (period === 'month') {
      d.setMonth(d.getMonth() + dir);
    } else {
      d.setFullYear(d.getFullYear() + dir);
    }
    setAnalyticsDate(d.toISOString().slice(0,10));
  };

  const merged = useMemo(()=> {
    if(!overview) return [] as any[];
    const cartStatsMap = new Map<string, any>();
    dailyCartStats?.groups.forEach(g => cartStatsMap.set(g.group, g));
    const list = overview.groups.map(g => {
      const carts = cartStatsMap.get(g.group);
      const codes = sections.filter(s => (s.group||'Other')===g.group).map(s=>s.code).join(', ');
      return {
        group: g.group,
        todayRows: g.todayRows,
        prevRows: g.prevRows,
        delta: g.delta,
        cartCount: carts?.cartCount ?? 0,
        cartRows: carts?.totalRows ?? 0,
        shelvedCarts: carts?.shelvedCarts ?? 0,
        pendingCarts: carts?.pendingCarts ?? 0,
        codes
      };
    });
    return list.sort((a,b)=> (b.todayRows - a.todayRows) || (b.cartRows - a.cartRows) || a.group.localeCompare(b.group));
  }, [overview, dailyCartStats, sections]);

  if(!overview) return <div className="card" style={{ marginTop:'0.75rem' }}><em style={{ fontSize:'0.6rem' }}>Loading overview…</em></div>;

  return (
      <div style={{ display:'grid', gap:'1rem', marginTop:'0.5rem' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.8rem' }}>
          <div className="card" style={{ flex:'1 1 200px', minWidth:200 }}>
            <div style={{ fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:1, color:'#66788a' }}>Date</div>
            <div style={{ fontSize:'1rem', fontWeight:600 }}>{overview.date}</div>
            <div style={{ fontSize:'0.55rem', color:'#66788a' }}>Prev: {overview.prevDate}</div>
          </div>
          <div className="card" style={{ flex:'1 1 200px', minWidth:200 }}>
            <div style={{ fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:1, color:'#66788a' }}>Shelf Rows (Today)</div>
            <div style={{ fontSize:'1rem', fontWeight:600 }}>{merged.reduce((s,m)=> s+m.todayRows,0)}</div>
            <div style={{ fontSize:'0.55rem', color:'#66788a' }}>Prev: {merged.reduce((s,m)=> s+m.prevRows,0)}</div>
          </div>
          <div className="card" style={{ flex:'1 1 200px', minWidth:200 }}>
            <div style={{ fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:1, color:'#66788a' }}>Manual Cart Rows</div>
            <div style={{ fontSize:'1rem', fontWeight:600 }}>{merged.reduce((s,m)=> s+m.cartRows,0)}</div>
            <div style={{ fontSize:'0.55rem', color:'#66788a' }}>Carts: {merged.reduce((s,m)=> s+m.cartCount,0)}</div>
          </div>
          <div className="card" style={{ flex:'1 1 260px', minWidth:260 }}>
            <div style={{ fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:1, color:'#66788a' }}>Analytics</div>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginTop:'0.3rem' }}>
              <select value={period} onChange={e=> setPeriod(e.target.value as any)} style={{ fontSize:'0.7rem' }}>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
              <input type="date" value={analyticsDate} onChange={e=> setAnalyticsDate(e.target.value)} style={{ fontSize:'0.7rem' }} />
              <div style={{ display:'flex', gap:'0.25rem' }}>
                <button className="secondary" onClick={()=> shiftAnalytics(-1)}>◀</button>
                <button className="secondary" onClick={()=> shiftAnalytics(1)}>▶</button>
              </div>
            </div>
            {analytics && <div style={{ fontSize:'0.55rem', color:'#66788a', marginTop:'0.3rem' }}>{analytics.startDate} → {analytics.endDate}</div>}
          </div>
        </div>
        <div className="card">
          <strong style={{ fontSize:'0.8rem' }}>Locations (Shelf vs Cart Rows)</strong>
          <div style={{ marginTop:'0.6rem', display:'grid', gap:'0.6rem' }}>
            {merged.map(m => {
              const deltaColor = m.delta === 0 ? '#66788a' : m.delta > 0 ? '#2a854e' : '#b9382c';
              const shelvedPct = m.cartCount ? Math.round((m.shelvedCarts / m.cartCount) * 100) : 0;
              return (
                <div key={m.group} style={{ border:'1px solid #d7e2ec', borderRadius:8, padding:'0.55rem 0.7rem', display:'grid', gap:'0.4rem' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', alignItems:'baseline', gap:'0.5rem' }}>
                    <div style={{ fontWeight:600, fontSize:'0.75rem' }}>{displayGroup(m.group)}</div>
                    {m.codes && <div style={{ fontSize:'0.5rem', color:'#66788a' }}>{m.codes}</div>}
                    <div style={{ fontSize:'0.55rem', color:deltaColor }}>Δ {m.delta > 0 ? '+'+m.delta : m.delta}</div>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'1rem', fontSize:'0.55rem', color:'#44515c' }}>
                    <div><strong>{m.todayRows}</strong> shelf</div>
                    <div><strong>{m.cartRows}</strong> cart</div>
                    <div><strong>{m.prevRows}</strong> prev shelf</div>
                    <div><strong>{m.cartCount}</strong> carts</div>
                    <div><strong>{m.shelvedCarts}</strong> shelved ({shelvedPct}%)</div>
                    <div><strong>{m.pendingCarts}</strong> pending</div>
                    {dailyCartStats?.groups && dailyCartStats.groups.find(g=>g.group===m.group)?.deducedShelvedRows != null && (
                      <div><strong>{dailyCartStats?.groups.find(g=>g.group===m.group)?.deducedShelvedRows}</strong> deduced shelved</div>
                    )}
                  </div>
                  {m.cartCount > 0 && (
                    <div style={{ position:'relative', height:6, background:'#eef3f9', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ position:'absolute', inset:0, display:'flex' }}>
                        <div style={{ width:`${shelvedPct}%`, background:'#2a854e' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <strong style={{ fontSize:'0.8rem' }}>Period Analytics ({period})</strong>
          {!analytics && <div style={{ fontSize:'0.6rem', color:'#66788a', marginTop:'0.4rem' }}>Loading analytics…</div>}
          {analytics && (
            <>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'1rem', marginTop:'0.6rem', fontSize:'0.55rem', color:'#44515c' }}>
                <div><strong>{analytics.totals.entryRows}</strong> entry rows</div>
                <div><strong>{analytics.totals.cartRows}</strong> cart rows</div>
                <div><strong>{analytics.totals.entryRows + analytics.totals.cartRows}</strong> combined rows</div>
                <div><strong>{analytics.totals.cartCount}</strong> carts</div>
                <div><strong>{analytics.totals.shelvedCarts}</strong> shelved</div>
                <div><strong>{analytics.totals.pendingCarts}</strong> pending</div>
              </div>
              {analytics.prevDay && (
                <div style={{ marginTop:'0.5rem', fontSize:'0.55rem', color:'#44515c' }}>
                  Prev day {analytics.prevDay.date}: <strong>{analytics.prevDay.totalRowsCombined}</strong> rows (entries {analytics.prevDay.entryRows} / carts {analytics.prevDay.cartRows})
                </div>
              )}
              <div style={{ marginTop:'0.8rem', display:'grid', gap:'0.5rem' }}>
                {analytics.aggregatedSeries.map(p => {
                  const total = p.entryRows + p.cartRows;
                  const entryPct = total ? Math.round((p.entryRows / total) * 100) : 0;
                  return (
                    <div key={p.label + (p.startDate||'')} style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                      <div style={{ width:120, fontSize:'0.55rem' }}>{p.label}</div>
                      <div style={{ flex:1, height:10, background:'#eef3f9', borderRadius:4, position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', inset:0, display:'flex' }}>
                          <div style={{ width: entryPct + '%', background:'#4a90e2' }} />
                          <div style={{ flex:1, background:'#2a854e' }} />
                        </div>
                      </div>
                      <div style={{ fontSize:'0.5rem', color:'#44515c' }}>{p.entryRows}/{p.cartRows}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
  );
}
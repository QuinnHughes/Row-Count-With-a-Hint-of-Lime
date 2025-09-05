import { Router, Request, Response } from 'express';
import { getEntriesForDate, upsertEntry, getSectionById } from './db';
import { z } from 'zod';
import { buildLoadouts } from './loadouts';
import { createSnapshot, getSnapshots, setCartShelved, getSections, getGroupComparison, createCart, listCarts, updateCart, deleteCart, dailyCartStats, computePeriodAnalytics } from './db';

const router = Router();

router.get('/sections', (_req: Request, res: Response) => {
  res.json(getSections());
});

router.get('/entries', (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const entries = getEntriesForDate(date).map(e => {
    const section = getSectionById(e.section_id)!;
    return { ...e, code: section.code, name: section.name, daily_cap: section.daily_cap };
  });
  res.json({ date, entries });
});

const entrySchema = z.object({
  sectionId: z.number(),
  date: z.string().regex(/\d{4}-\d{2}-\d{2}/),
  rows: z.number().int().min(0).max(500)
});

router.post('/entries', (req: Request, res: Response) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { sectionId, date, rows } = parsed.data;
  const section = getSectionById(sectionId) as any;
  if (!section) return res.status(404).json({ error: 'Section not found' });
  if (section.daily_cap != null && rows > section.daily_cap) {
    return res.status(400).json({ error: `Rows exceed cap (${section.daily_cap}) for section ${section.code}` });
  }
  upsertEntry(sectionId, date, rows);
  res.json({ success: true });
});

router.get('/loadouts', (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const cartSizeRaw = req.query.cartSize as string | undefined;
  let cartSize = 6;
  if (cartSizeRaw) {
    const n = parseInt(cartSizeRaw, 10);
    if (!isNaN(n) && n > 0 && n <= 50) cartSize = n; // clamp upper bound
  }
  const loadouts = buildLoadouts(date, cartSize);
  res.json({ cartSize, ...loadouts });
});

router.post('/loadouts/custom', (req: Request, res: Response) => {
  const body = req.body || {};
  const date: string = body.date || today();
  let cartSize = typeof body.cartSize === 'number' ? body.cartSize : 6;
  if (cartSize <= 0) cartSize = 6;
  const sectionIds: number[] = Array.isArray(body.sectionIds) ? body.sectionIds.filter((n: any) => Number.isInteger(n)) : [];
  const loadouts = buildLoadouts(date, cartSize, sectionIds);
  res.json({ cartSize, ...loadouts });
});

// Snapshot creation with attribution
router.post('/loadout-snapshots', (req: Request, res: Response) => {
  const { date, initials, cartSize, sectionIds, group } = req.body || {};
  if (!initials || typeof initials !== 'string' || initials.trim().length === 0) {
    return res.status(400).json({ error: 'initials required' });
  }
  let filteredSectionIds: number[] | undefined = undefined;
  if (group) {
    const secs = getSections().filter(s => (s.group || 'Other') === group);
    filteredSectionIds = secs.map(s => s.id);
  }
  const snapshot = createSnapshot(
    (date && /\d{4}-\d{2}-\d{2}/.test(date)) ? date : today(),
    initials.trim(),
    (typeof cartSize === 'number' && cartSize > 0 && cartSize <= 50) ? cartSize : 6,
    filteredSectionIds || (Array.isArray(sectionIds) ? sectionIds : undefined),
    group
  );
  res.json(snapshot);
});

router.get('/loadout-snapshots', (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;
  const snaps = getSnapshots(date);
  res.json(snaps);
});

router.patch('/loadout-snapshots/:id/carts/:cart', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const cart = Number(req.params.cart);
  const { shelved } = req.body || {};
  const ok = setCartShelved(id, cart, !!shelved);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Daily overview comparing with previous day
router.get('/overview', (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  const prevDate = prev.toISOString().slice(0,10);
  const comparison = getGroupComparison(date, prevDate);
  res.json({ date, prevDate, groups: comparison });
});

// ---- Cart Records (Manual) ----
router.get('/carts', (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;
  res.json(listCarts(date));
});

router.post('/carts', (req: Request, res: Response) => {
  const { date, group, initials, rows } = req.body || {};
  if (!group) return res.status(400).json({ error: 'group required' });
  if (!initials) return res.status(400).json({ error: 'initials required' });
  const d = (date && /\d{4}-\d{2}-\d{2}/.test(date)) ? date : today();
  const r = Number(rows);
  if (isNaN(r) || r < 0) return res.status(400).json({ error: 'rows must be >=0' });
  const cart = createCart(d, group, initials, r);
  res.json(cart);
});

router.patch('/carts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updated = updateCart(id, { rows: req.body?.rows, shelved: req.body?.shelved });
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

router.delete('/carts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ok = deleteCart(id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ success: true });
});

router.get('/stats/daily', (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const stats = dailyCartStats(date);
  res.json(stats);
});

// Period analytics: period=week|month|year, date anchor (defaults today)
router.get('/analytics', (req: Request, res: Response) => {
  const date = (req.query.date as string) || today();
  const periodRaw = (req.query.period as string)||'week';
  const period = ['week','month','year'].includes(periodRaw) ? periodRaw as any : 'week';
  try {
    const analytics = computePeriodAnalytics(date, period);
    res.json(analytics);
  } catch (e:any) {
    res.status(500).json({ error: e.message || 'failed' });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default router;

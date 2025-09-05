import { Router, Request, Response } from 'express';
import { getSections, getEntriesForDate, upsertEntry, getSectionById } from './db';
import { z } from 'zod';
import { buildLoadouts } from './loadouts';

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

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default router;

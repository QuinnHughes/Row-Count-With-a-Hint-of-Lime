import axios from 'axios';
import { Section, Loadouts } from './types';

export async function fetchSections(): Promise<Section[]> {
  const { data } = await axios.get('/api/sections');
  return data;
}

export async function submitEntry(sectionId: number, date: string, rows: number) {
  await axios.post('/api/entries', { sectionId, date, rows });
}

export async function fetchLoadouts(date: string, cartSize?: number): Promise<Loadouts> {
  const { data } = await axios.get('/api/loadouts', { params: { date, cartSize } });
  return data;
}

export async function fetchCustomLoadouts(date: string, cartSize: number, sectionIds: number[]): Promise<Loadouts> {
  const { data } = await axios.post('/api/loadouts/custom', { date, cartSize, sectionIds });
  return data;
}

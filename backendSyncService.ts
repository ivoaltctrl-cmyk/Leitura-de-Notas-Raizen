/**
 * Backend Data Sync Service
 * Sincroniza todas as alterações do frontend (colaboradores, contratos, trabalhistas, áreas, etc)
 * diretamente com o backend do servidor Node/Express para persistência centralizada.
 */

import { Employee, Contract, AreaResponsavel, TrabalhistaEnvio, DemandLog, BrandConfig } from '../types/index.ts';

export interface ServerSyncData {
  employees?: Employee[];
  contracts?: Contract[];
  areas?: AreaResponsavel[];
  trabalhistas?: TrabalhistaEnvio[];
  demandLogs?: DemandLog[];
  brandConfig?: BrandConfig;
}

export async function fetchAllDataFromServer(): Promise<{
  employees?: Employee[];
  contracts?: Contract[];
  areas?: AreaResponsavel[];
  trabalhistas?: TrabalhistaEnvio[];
  demandLogs?: DemandLog[];
  brandConfig?: BrandConfig;
  lastUpdated?: string;
} | null> {
  try {
    const res = await fetch('/api/data', {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (e) {
    console.info('Backend fetch skipped (offline or initial):', e);
    return null;
  }
}

export async function syncDataToBackend(payload: ServerSyncData): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    console.warn('Falha ao sincronizar com backend:', e);
    return false;
  }
}

export async function syncCollectionToBackend(collectionName: string, data: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/data/${collectionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch (e) {
    console.warn(`Falha ao sincronizar coleção ${collectionName} com backend:`, e);
    return false;
  }
}

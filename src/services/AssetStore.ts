// Asset storage service — persists 3D scene assets in localStorage

import type { SceneObject } from '../ai/AnthropicService';

export interface SavedAsset {
  id: string;
  name: string;
  description: string;
  objects: SceneObject[];
  createdAt: number;
}

export interface FloorItem {
  id: string;
  assetId: string;
  name: string;
  objects: SceneObject[];
  // Position on the floor grid (world units)
  x: number;
  y: number;       // Height off ground (default 0)
  z: number;
  rotation: number; // Y-axis rotation in radians
  scale?: number;   // Uniform scale (default 1)
}

const ASSETS_KEY = 'ink-playground-3d-assets';
const FLOOR_KEY = 'ink-playground-floor';

export function loadAssets(): SavedAsset[] {
  try {
    const raw = localStorage.getItem(ASSETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveAsset(asset: SavedAsset): void {
  const assets = loadAssets();
  assets.push(asset);
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

export function deleteAsset(id: string): void {
  const assets = loadAssets().filter(a => a.id !== id);
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

export function loadFloor(): FloorItem[] {
  try {
    const raw = localStorage.getItem(FLOOR_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveFloor(items: FloorItem[]): void {
  localStorage.setItem(FLOOR_KEY, JSON.stringify(items));
}

export function generateAssetId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateFloorItemId(): string {
  return `floor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

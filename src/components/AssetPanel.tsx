// Asset library panel — flyout from left sidebar
// Shows saved 3D assets, allows drag onto floor view

import { useState } from 'react';
import { X, Eye, Trash2, Check, Box, Plus } from 'lucide-react';
import type { SavedAsset } from '../services/AssetStore';
import { deleteAsset } from '../services/AssetStore';

interface AssetPanelProps {
  assets: SavedAsset[];
  onClose: () => void;
  onLoadAsset: (asset: SavedAsset) => void;
  onDragAsset: (asset: SavedAsset) => void;
  onPlaceAsset?: (asset: SavedAsset) => void;
  onAssetsChange: () => void;
}

export function AssetPanel({ assets, onClose, onLoadAsset, onDragAsset, onPlaceAsset, onAssetsChange }: AssetPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteAsset(id);
    setConfirmDelete(null);
    onAssetsChange();
  };

  return (
    <div className="asset-panel">
      <div className="asset-panel-header">
        <span className="asset-panel-title">Assets</span>
        <span className="asset-panel-count">{assets.length}</span>
        <button className="asset-panel-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="asset-panel-list">
        {assets.length === 0 && (
          <div className="asset-panel-empty">
            No saved assets yet.<br />
            Generate a 3D scene and save it.
          </div>
        )}

        {assets.map(asset => (
          <div
            key={asset.id}
            className="asset-card"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-asset-id', asset.id);
              onDragAsset(asset);
            }}
          >
            <div className="asset-card-preview">
              <Box size={24} opacity={0.5} />
              <span className="asset-card-obj-count">{asset.objects.length} obj</span>
            </div>
            <div className="asset-card-info">
              <div className="asset-card-name">{asset.name}</div>
              <div className="asset-card-desc">{asset.description}</div>
            </div>
            <div className="asset-card-actions">
              {onPlaceAsset && (
                <button className="asset-card-btn" onClick={() => onPlaceAsset(asset)} title="Place on floor">
                  <Plus size={14} />
                </button>
              )}
              <button className="asset-card-btn" onClick={() => onLoadAsset(asset)} title="Load in 3D viewer">
                <Eye size={14} />
              </button>
              {confirmDelete === asset.id ? (
                <>
                  <button className="asset-card-btn danger" onClick={() => handleDelete(asset.id)} title="Confirm delete">
                    <Check size={14} />
                  </button>
                  <button className="asset-card-btn" onClick={() => setConfirmDelete(null)} title="Cancel">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <button className="asset-card-btn" onClick={() => setConfirmDelete(asset.id)} title="Delete">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

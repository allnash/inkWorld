// Floor view — Three.js scene with camera modes where you drag 3D assets to compose a room

import { useRef, useState, useCallback, useEffect, createContext, useContext } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html, PivotControls } from '@react-three/drei';

// Shared context to disable orbit controls when dragging objects
const DragContext = createContext<{
  isDragging: React.MutableRefObject<boolean>;
  orbitRef: React.MutableRefObject<any>;
}>({ isDragging: { current: false }, orbitRef: { current: null } });
import { RotateCw, Trash2, Eye, Grid3x3, Maximize, User, Copy } from 'lucide-react';
import type { FloorItem } from '../services/AssetStore';
import type { SceneObject } from '../ai/AnthropicService';
import * as THREE from 'three';

type CameraMode = 'birdseye' | 'isometric' | 'orbit' | 'firstperson';

const CAMERA_PRESETS: Record<CameraMode, {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  label: string;
  enableRotate: boolean;
}> = {
  birdseye: {
    position: [0, 18, 0.01],
    target: [0, 0, 0],
    fov: 50,
    label: "Bird's Eye",
    enableRotate: false,
  },
  isometric: {
    position: [12, 12, 12],
    target: [0, 0, 0],
    fov: 35,
    label: 'Isometric',
    enableRotate: true,
  },
  orbit: {
    position: [8, 6, 8],
    target: [0, 0, 0],
    fov: 50,
    label: 'Orbit',
    enableRotate: true,
  },
  firstperson: {
    position: [0, 1.6, 12],
    target: [0, 1.6, 0],
    fov: 70,
    label: 'Walk',
    enableRotate: true,
  },
};

function FloorCameraController({ mode }: { mode: CameraMode }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const preset = CAMERA_PRESETS[mode];

  useEffect(() => {
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...preset.position);
    const endTarget = new THREE.Vector3(...preset.target);
    const startTime = performance.now();
    const duration = 600;

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
    }

    let animFrame: number;
    const animate = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startPos, endPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(endTarget, ease);
        controlsRef.current.update();
      }
      if (t < 1) animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [mode, camera, preset]);

  const { orbitRef } = useContext(DragContext);

  // Expose orbit controls ref to context so PivotControls can disable it
  useEffect(() => {
    orbitRef.current = controlsRef.current;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={preset.enableRotate}
      enableDamping
      dampingFactor={0.05}
      minDistance={3}
      maxDistance={50}
      maxPolarAngle={mode === 'firstperson' ? Math.PI * 0.85 : Math.PI / 2.2}
    />
  );
}

// Render a single primitive
function Primitive({ obj }: { obj: SceneObject }) {
  const geometry = (() => {
    switch (obj.type) {
      case 'box': return <boxGeometry args={obj.args as [number, number, number]} />;
      case 'sphere': return <sphereGeometry args={obj.args as [number, number, number]} />;
      case 'cylinder': return <cylinderGeometry args={obj.args as [number, number, number, number]} />;
      case 'cone': return <coneGeometry args={obj.args as [number, number, number]} />;
      case 'torus': return <torusGeometry args={obj.args as [number, number, number, number]} />;
      case 'plane': return <planeGeometry args={obj.args as [number, number]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  })();

  return (
    <mesh position={obj.position} rotation={obj.rotation} scale={obj.scale} castShadow receiveShadow>
      {geometry}
      <meshStandardMaterial color={obj.color} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function SceneObj({ obj }: { obj: SceneObject }) {
  if (obj.type === 'group' && obj.children) {
    return (
      <group position={obj.position} rotation={obj.rotation} scale={obj.scale}>
        {obj.children.map((child, i) => <SceneObj key={i} obj={child} />)}
      </group>
    );
  }
  return <Primitive obj={obj} />;
}

// A floor item with gumball (move/rotate/scale on all axes) when selected,
// direct XZ drag when not selected
function DraggableItem({
  item, isSelected, onSelect, onTransform,
}: {
  item: FloorItem; isSelected: boolean; onSelect: () => void;
  onTransform: (x: number, y: number, z: number, rotation: number, scale: number) => void;
}) {
  const { camera, raycaster, gl } = useThree();
  const { isDragging, orbitRef } = useContext(DragContext);
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const hitPoint = useRef(new THREE.Vector3());
  const dragOffset = useRef(new THREE.Vector3());

  // Gumball drag — full transform including Y
  const handleGumballDrag = useCallback((_local: THREE.Matrix4, _deltaL: THREE.Matrix4, world: THREE.Matrix4) => {
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    world.decompose(pos, quat, scl);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    onTransform(pos.x, pos.y, pos.z, euler.y, scl.x);
  }, [onTransform]);

  // Click to select (no body drag when selected — gumball handles everything)
  const onPointerDownSelected = useCallback((e: any) => {
    e.stopPropagation();
    // Don't start body drag — let gumball handle it
  }, []);

  // Direct XZ drag when NOT selected
  const onPointerDownUnselected = useCallback((e: any) => {
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
    if (orbitRef.current) orbitRef.current.enabled = false;
    gl.domElement.style.cursor = 'grabbing';

    raycaster.ray.intersectPlane(groundPlane.current, hitPoint.current);
    dragOffset.current.set(hitPoint.current.x - item.x, 0, hitPoint.current.z - item.z);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDragging.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(groundPlane.current, hitPoint.current)) {
        const snap = 0.5;
        onTransform(
          Math.round((hitPoint.current.x - dragOffset.current.x) / snap) * snap,
          item.y ?? 0,
          Math.round((hitPoint.current.z - dragOffset.current.z) / snap) * snap,
          item.rotation, item.scale ?? 1,
        );
      }
    };

    const onPointerUp = () => {
      isDragging.current = false;
      if (orbitRef.current) orbitRef.current.enabled = true;
      gl.domElement.style.cursor = 'auto';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [camera, raycaster, gl, item, onSelect, onTransform, isDragging]);

  const label = (
    <Html position={[0, 3, 0]} center style={{ pointerEvents: 'none' }}>
      <div style={{
        background: isSelected ? 'rgba(18,199,156,0.9)' : 'rgba(15,23,42,0.85)',
        color: isSelected ? '#141729' : '#a8a3bf',
        padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem',
        fontWeight: 500, whiteSpace: 'nowrap',
        border: `1px solid ${isSelected ? '#e8a0bf' : '#2a2f4a'}`,
      }}>
        {item.name}
      </div>
    </Html>
  );

  const s = item.scale ?? 1;
  const y = item.y ?? 0;

  if (isSelected) {
    const matrix = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3(item.x, y, item.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, item.rotation, 0)),
      new THREE.Vector3(s, s, s),
    );

    return (
      <PivotControls
        matrix={matrix}
        autoTransform={false}
        visible={true}
        depthTest={false}
        lineWidth={2}
        scale={2}
        axisColors={['#ff4444', '#44ff44', '#4444ff']}
        hoveredColor="#e8a0bf"
        onDrag={handleGumballDrag}
        onDragStart={() => { isDragging.current = true; if (orbitRef.current) orbitRef.current.enabled = false; }}
        onDragEnd={() => { isDragging.current = false; if (orbitRef.current) orbitRef.current.enabled = true; }}
        annotations={false}
      >
        <group onPointerDown={onPointerDownSelected}>
          {item.objects.map((obj, i) => <SceneObj key={i} obj={obj} />)}
          {label}
        </group>
      </PivotControls>
    );
  }

  return (
    <group position={[item.x, y, item.z]} rotation={[0, item.rotation, 0]} scale={s}>
      <group onPointerDown={onPointerDownUnselected}>
        {item.objects.map((obj, i) => <SceneObj key={i} obj={obj} />)}
        {label}
      </group>
    </group>
  );
}

function FloorPlane({ onDeselect }: { onDeselect: () => void }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow
      onPointerDown={(e) => { e.stopPropagation(); onDeselect(); }}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#1c2039" />
    </mesh>
  );
}

interface FloorViewProps {
  items: FloorItem[];
  onItemsChange: (items: FloorItem[]) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onDropAsset: (assetId: string, x: number, z: number) => void;
}

export function FloorView({ items, onItemsChange, selectedItemId, onSelectItem, onDropAsset }: FloorViewProps) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('birdseye');
  const isDraggingRef = useRef(false);
  const orbitControlsRef = useRef<any>(null);

  const handleTransform = useCallback((itemId: string, x: number, y: number, z: number, rotation: number, scale: number) => {
    onItemsChange(items.map(i => i.id === itemId ? { ...i, x, y, z, rotation, scale } : i));
  }, [items, onItemsChange]);

  const handleDeleteSelected = () => {
    if (!selectedItemId) return;
    onItemsChange(items.filter(i => i.id !== selectedItemId));
    onSelectItem(null);
  };

  const handleRotateSelected = () => {
    if (!selectedItemId) return;
    onItemsChange(items.map(i =>
      i.id === selectedItemId ? { ...i, rotation: i.rotation + Math.PI / 4 } : i
    ));
  };

  const handleDuplicateSelected = () => {
    const source = items.find(i => i.id === selectedItemId);
    if (!source) return;
    const newId = `floor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const dupe: FloorItem = { ...source, id: newId, x: source.x + 1.5, z: source.z + 1.5 };
    onItemsChange([...items, dupe]);
    onSelectItem(newId);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('application/x-asset-id');
    if (assetId) onDropAsset(assetId, 0, 0);
  };

  const modeIcons: Record<CameraMode, React.ReactNode> = {
    birdseye: <Maximize size={14} />,
    isometric: <Grid3x3 size={14} />,
    orbit: <Eye size={14} />,
    firstperson: <User size={14} />,
  };

  return (
    <div className="floor-view">
      <div className="floor-view-toolbar">
        <span className="floor-view-title">Floor Plan</span>
        <div className="floor-view-modes">
          {(Object.keys(CAMERA_PRESETS) as CameraMode[]).map(mode => (
            <button
              key={mode}
              className={`floor-mode-btn ${cameraMode === mode ? 'active' : ''}`}
              onClick={() => setCameraMode(mode)}
              title={CAMERA_PRESETS[mode].label}
            >
              {modeIcons[mode]}
              <span>{CAMERA_PRESETS[mode].label}</span>
            </button>
          ))}
        </div>
        {selectedItemId && (
          <div className="floor-view-actions">
            <button className="floor-view-btn" onClick={handleDuplicateSelected} title="Duplicate">
              <Copy size={14} />
            </button>
            <button className="floor-view-btn" onClick={handleRotateSelected} title="Rotate 45°">
              <RotateCw size={14} />
            </button>
            <button className="floor-view-btn danger" onClick={handleDeleteSelected} title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <div
        className="floor-view-canvas-wrap"
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      >
        <Canvas
          camera={{ position: CAMERA_PRESETS.birdseye.position, fov: CAMERA_PRESETS.birdseye.fov }}
          shadows
          style={{ width: '100%', height: '100%' }}
        >
          <DragContext.Provider value={{ isDragging: isDraggingRef, orbitRef: orbitControlsRef }}>
            <ambientLight intensity={0.5} color="#8888cc" />
            <directionalLight position={[5, 12, 5]} intensity={0.8} castShadow />
            <pointLight position={[0, 5, 0]} intensity={0.3} color="#e8a0bf" distance={20} />
            <Environment preset="studio" />
            <fog attach="fog" args={['#141729', 30, 60]} />

            <FloorPlane onDeselect={() => onSelectItem(null)} />
            <gridHelper args={[40, 40, '#2a2f4a', '#1c2039']} />

            {items.map(item => (
              <DraggableItem
                key={item.id}
                item={item}
                isSelected={item.id === selectedItemId}
                onSelect={() => onSelectItem(item.id)}
                onTransform={(x, z, rot, scl) => handleTransform(item.id, x, z, rot, scl)}
              />
            ))}

            <FloorCameraController mode={cameraMode} />
          </DragContext.Provider>
        </Canvas>
      </div>
      <div className="floor-view-hint">
        Drag assets from library • Click to select • Drag to move
      </div>
    </div>
  );
}

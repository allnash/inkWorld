import { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Eye, Grid3x3, Maximize, User } from 'lucide-react';
import type { SceneObject } from '../ai/AnthropicService';
import * as THREE from 'three';

// Camera presets matching 01-web patterns
type CameraMode = 'orbit' | 'isometric' | 'birdseye' | 'firstperson';

const CAMERA_PRESETS: Record<CameraMode, {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  label: string;
}> = {
  orbit: {
    position: [5, 4, 5],
    target: [0, 0, 0],
    fov: 50,
    label: 'Orbit',
  },
  isometric: {
    position: [8, 8, 8],
    target: [0, 0, 0],
    fov: 35,
    label: 'Isometric',
  },
  birdseye: {
    position: [0, 12, 0.01],
    target: [0, 0, 0],
    fov: 50,
    label: "Bird's Eye",
  },
  firstperson: {
    position: [0, 1.6, 8],
    target: [0, 1.6, 0],
    fov: 70,
    label: 'First Person',
  },
};

// Smoothly animates camera to a target position
function CameraAnimator({ mode }: { mode: CameraMode }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const preset = CAMERA_PRESETS[mode];

  useEffect(() => {
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...preset.position);
    const startTime = performance.now();
    const duration = 600;

    // Update FOV
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
    }

    let animFrame: number;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(startPos, endPos, ease);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(...preset.target), ease);
        controlsRef.current.update();
      }

      if (t < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [mode, camera, preset]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={1}
      maxDistance={30}
      maxPolarAngle={mode === 'firstperson' ? Math.PI * 0.85 : Math.PI}
      enablePan={mode !== 'firstperson'}
    />
  );
}

function ScenePrimitive({ obj }: { obj: SceneObject }) {
  const geometry = (() => {
    switch (obj.type) {
      case 'box':
        return <boxGeometry args={obj.args as [number, number, number]} />;
      case 'sphere':
        return <sphereGeometry args={obj.args as [number, number, number]} />;
      case 'cylinder':
        return <cylinderGeometry args={obj.args as [number, number, number, number]} />;
      case 'cone':
        return <coneGeometry args={obj.args as [number, number, number]} />;
      case 'torus':
        return <torusGeometry args={obj.args as [number, number, number, number]} />;
      case 'plane':
        return <planeGeometry args={obj.args as [number, number]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  })();

  return (
    <mesh
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      castShadow
      receiveShadow
    >
      {geometry}
      <meshStandardMaterial color={obj.color} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function SceneGroup({ obj }: { obj: SceneObject }) {
  if (obj.type === 'group' && obj.children) {
    return (
      <group position={obj.position} rotation={obj.rotation} scale={obj.scale}>
        {obj.children.map((child, i) => (
          <SceneGroup key={i} obj={child} />
        ))}
      </group>
    );
  }
  return <ScenePrimitive obj={obj} />;
}

interface ThreeViewerProps {
  objects: SceneObject[];
  isLoading: boolean;
  description?: string;
}

export function ThreeViewer({ objects, isLoading, description }: ThreeViewerProps) {
  const isEmpty = objects.length === 0 && !isLoading;
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');

  const modeIcons: Record<CameraMode, React.ReactNode> = {
    orbit: <Eye size={14} />,
    isometric: <Grid3x3 size={14} />,
    birdseye: <Maximize size={14} />,
    firstperson: <User size={14} />,
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#141729' }}>
      {/* Camera mode switcher */}
      <div className="camera-modes">
        {(Object.keys(CAMERA_PRESETS) as CameraMode[]).map(mode => (
          <button
            key={mode}
            className={`camera-mode-btn ${cameraMode === mode ? 'active' : ''}`}
            onClick={() => setCameraMode(mode)}
            title={CAMERA_PRESETS[mode].label}
          >
            {modeIcons[mode]}
            <span>{CAMERA_PRESETS[mode].label}</span>
          </button>
        ))}
      </div>

      {isEmpty && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b6787',
          fontSize: '0.85rem',
          textAlign: 'center',
          padding: '20px',
          zIndex: 1,
          pointerEvents: 'none',
        }}>
          Draw something on the left, then click<br /><strong>Generate 3D</strong> to see it here
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#a8a3bf',
          fontSize: '0.85rem',
          zIndex: 10,
        }}>
          <div style={{
            width: 28,
            height: 28,
            border: '3px solid #2a2f4a',
            borderTopColor: '#e8a0bf',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: 12,
          }} />
          Generating 3D scene...
        </div>
      )}

      {description && !isLoading && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          padding: '6px 10px',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          color: '#a8a3bf',
          fontSize: '0.7rem',
          borderRadius: 4,
          zIndex: 5,
          pointerEvents: 'none',
          border: '1px solid #2a2f4a',
        }}>
          {description}
        </div>
      )}

      <Canvas
        camera={{ position: CAMERA_PRESETS[cameraMode].position, fov: CAMERA_PRESETS[cameraMode].fov }}
        shadows
      >
        {/* Lighting — inspired by 01-web CityScene */}
        <ambientLight intensity={0.5} color="#8888cc" />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-3, 4, -3]} intensity={0.3} />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#e8a0bf" distance={15} />
        <Environment preset="studio" />
        <fog attach="fog" args={['#141729', 20, 50]} />

        {objects.map((obj, i) => (
          <SceneGroup key={i} obj={obj} />
        ))}

        <gridHelper args={[20, 20, '#2a2f4a', '#1c2039']} />

        <CameraAnimator mode={cameraMode} />
      </Canvas>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .camera-modes {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 2px;
          z-index: 10;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid #2a2f4a;
          border-radius: 6px;
          padding: 3px;
        }
        .camera-mode-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: #6b6787;
          font-size: 0.65rem;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .camera-mode-btn:hover {
          color: #a8a3bf;
          background: #2a2f4a;
        }
        .camera-mode-btn.active {
          color: #e8a0bf;
          background: rgba(18, 199, 156, 0.15);
        }
      `}</style>
    </div>
  );
}

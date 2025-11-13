import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

function Humanoid({ gender }) {
  // Ensure gender is always a valid string
  const safeGender = typeof gender === 'string' && gender?.trim() ? gender : 'male';
  const bodyColor = safeGender === 'female' ? '#e91e63' : '#1565C0';
  const accentColor = safeGender === 'female' ? '#ffb6c1' : '#90caf9';

  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.6, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.35, 1.2, 0]} rotation={[0, 0, Math.PI / 12]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 12]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh position={[0.35, 1.2, 0]} rotation={[0, 0, -Math.PI / 12]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 12]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.12, 0.55, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 12]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh position={[0.12, 0.55, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 12]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* Base shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
    </group>
  );
}

export default function PlayerAvatar3D({ gender, height }) {
  // Defensive fallback for gender and height
  const safeGender = typeof gender === 'string' && gender?.trim() ? gender : 'male';
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 240;
  return (
    <div style={{ height: safeHeight }}>
      <Canvas shadows camera={{ position: [2.5, 2, 2.5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 3]} intensity={1} castShadow />
        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            <Humanoid gender={safeGender} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function FloatingDatabase() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.3;
      groupRef.current.rotation.x = Math.sin(t * 0.15) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={1}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 1.5, 32, 1]} />
          <MeshDistortMaterial
            color="#4f8cff"
            transparent
            opacity={0.7}
            metalness={0.3}
            roughness={0.2}
            wireframe
            distort={0.1}
            speed={2}
          />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[1.8, 0.3, 0.3]} />
          <meshStandardMaterial
            color="#7c3aed"
            transparent
            opacity={0.8}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
          <boxGeometry args={[1.8, 0.3, 0.3]} />
          <meshStandardMaterial
            color="#7c3aed"
            transparent
            opacity={0.8}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0.6, 0.4, 0.6]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.6, -0.3, 0.6]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
        </mesh>
      </Float>
    </group>
  );
}

function Particles() {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      col[i * 3] = 0.3 + Math.random() * 0.3;
      col[i * 3 + 1] = 0.5 + Math.random() * 0.3;
      col[i * 3 + 2] = 1;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default function ThreeScene() {
  return (
    <div className="w-full h-full absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <FloatingDatabase />
        <Particles />
      </Canvas>
    </div>
  );
}

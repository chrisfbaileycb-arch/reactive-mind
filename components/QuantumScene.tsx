/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Float,
  MeshDistortMaterial,
  Sphere,
  Torus,
  Cylinder,
  Stars,
  Environment,
  Box,
} from '@react-three/drei';
import * as THREE from 'three';

const RendererSetupAndCleanup: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    return () => {
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    };
  }, [gl, scene]);

  return null;
};

const QuantumParticle = ({
  id,
  position,
  color,
  scale = 1,
  coordinateOverridesRef,
}: {
  id: string;
  position: [number, number, number];
  color: string;
  scale?: number;
  coordinateOverridesRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const currentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...position));

  useFrame((state, delta) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      const override = coordinateOverridesRef?.current?.[id];
      const baseX = override ? override[0] : position[0];
      const baseY = override ? override[1] : position[1];
      const baseZ = override ? override[2] : position[2];

      currentPosRef.current.x = THREE.MathUtils.damp(currentPosRef.current.x, baseX, 5, delta);
      currentPosRef.current.y = THREE.MathUtils.damp(
        currentPosRef.current.y,
        baseY + Math.sin(t * 2 + baseX) * 0.2,
        5,
        delta
      );
      currentPosRef.current.z = THREE.MathUtils.damp(currentPosRef.current.z, baseZ, 5, delta);

      ref.current.position.copy(currentPosRef.current);
      ref.current.rotation.x = t * 0.5;
      ref.current.rotation.z = t * 0.3;
    }
  });

  return (
    <Sphere ref={ref} args={[1, 32, 32]} position={position} scale={scale}>
      <MeshDistortMaterial
        color={color}
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0}
        metalness={0.5}
        distort={0.4}
        speed={2}
      />
    </Sphere>
  );
};

const MacroscopicWave = () => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.x = Math.sin(t * 0.2) * 0.2;
      ref.current.rotation.y = t * 0.1;
    }
  });

  return (
    <Torus ref={ref} args={[3, 0.1, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#C5A059"
        emissive="#C5A059"
        emissiveIntensity={0.5}
        transparent
        opacity={0.6}
        wireframe
      />
    </Torus>
  );
};

export const HeroScene: React.FC<{
  coordinateOverridesRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
}> = ({ coordinateOverridesRef }) => {
  return (
    <div className="absolute inset-0 z-0 opacity-60 pointer-events-none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <RendererSetupAndCleanup />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <QuantumParticle
            id="quantum-core"
            position={[0, 0, 0]}
            color="#4F46E5"
            scale={1.2}
            coordinateOverridesRef={coordinateOverridesRef}
          />
          <MacroscopicWave />
        </Float>

        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <QuantumParticle
            id="quantum-left"
            position={[-3, 1, -2]}
            color="#9333EA"
            scale={0.5}
            coordinateOverridesRef={coordinateOverridesRef}
          />
          <QuantumParticle
            id="quantum-right"
            position={[3, -1, -3]}
            color="#C5A059"
            scale={0.6}
            coordinateOverridesRef={coordinateOverridesRef}
          />
        </Float>

        <Environment preset="city" />
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  );
};

export const QuantumComputerScene: React.FC = () => {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <RendererSetupAndCleanup />
        <ambientLight intensity={1} />
        <spotLight position={[5, 5, 5]} angle={0.3} penumbra={1} intensity={2} color="#C5A059" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        <Environment preset="studio" />

        <Float rotationIntensity={0.4} floatIntensity={0.2} speed={1}>
          <group rotation={[0, 0, 0]} position={[0, 0.5, 0]}>
            <Cylinder args={[1.2, 1.2, 0.1, 64]} position={[0, 1, 0]}>
              <meshStandardMaterial color="#C5A059" metalness={1} roughness={0.15} />
            </Cylinder>

            <Cylinder args={[1, 1, 0.1, 64]} position={[0, 0.2, 0]}>
              <meshStandardMaterial color="#C5A059" metalness={1} roughness={0.15} />
            </Cylinder>

            <Cylinder args={[0.6, 0.6, 0.1, 64]} position={[0, -0.6, 0]}>
              <meshStandardMaterial color="#C5A059" metalness={1} roughness={0.15} />
            </Cylinder>

            <Cylinder args={[0.04, 0.04, 0.8, 16]} position={[0.5, 0.6, 0]}>
              <meshStandardMaterial color="#D1D5DB" metalness={0.8} roughness={0.2} />
            </Cylinder>
            <Cylinder args={[0.04, 0.04, 0.8, 16]} position={[-0.5, 0.6, 0]}>
              <meshStandardMaterial color="#D1D5DB" metalness={0.8} roughness={0.2} />
            </Cylinder>
            <Cylinder args={[0.04, 0.04, 0.8, 16]} position={[0, 0.6, 0.5]}>
              <meshStandardMaterial color="#D1D5DB" metalness={0.8} roughness={0.2} />
            </Cylinder>
            <Cylinder args={[0.04, 0.04, 0.8, 16]} position={[0, 0.6, -0.5]}>
              <meshStandardMaterial color="#D1D5DB" metalness={0.8} roughness={0.2} />
            </Cylinder>

            <Cylinder args={[0.03, 0.03, 0.8, 16]} position={[0.2, -0.2, 0]}>
              <meshStandardMaterial color="#D1D5DB" metalness={0.8} roughness={0.2} />
            </Cylinder>
            <Cylinder args={[0.03, 0.03, 0.8, 16]} position={[-0.2, -0.2, 0]}>
              <meshStandardMaterial color="#D1D5DB" metalness={0.8} roughness={0.2} />
            </Cylinder>

            <Torus args={[0.7, 0.015, 16, 64]} position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#B87333" metalness={0.8} roughness={0.3} />
            </Torus>
            <Torus args={[0.3, 0.015, 16, 64]} position={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial color="#B87333" metalness={0.8} roughness={0.3} />
            </Torus>

            <Box args={[0.2, 0.05, 0.2]} position={[0, -0.7, 0]}>
              <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
            </Box>
          </group>
        </Float>
      </Canvas>
    </div>
  );
};
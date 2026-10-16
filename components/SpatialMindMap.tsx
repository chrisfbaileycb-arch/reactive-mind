/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  MindCategory,
  MindFileNode,
  MaterialFinish,
  FormationMode,
} from '../types';

// Pre-allocated math helpers at module scope (Zero GC in render loop)
const _tempVecA = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

// Cache procedural CanvasTextures by (symbol + color)
const textureCache = new Map<string, THREE.CanvasTexture>();

export function disposeCachedBallTextures() {
  textureCache.forEach((tex) => {
    tex.dispose();
  });
  textureCache.clear();
}

function getAppBallTexture(
  symbol: string,
  hexColor: string,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const key = `${symbol.toUpperCase()}_${hexColor.toLowerCase()}`;
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centers = [256, 768];
  const cy = 256;
  const badgeRadius = 112;

  centers.forEach((cx) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
    ctx.shadowBlur = 18;
    ctx.fill();

    ctx.fillStyle = hexColor;
    ctx.font = '800 132px "Outfit", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((symbol || 'F').slice(0, 2).toUpperCase(), cx, cy + 6);
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}

export interface SpatialMindMapProps {
  categories: MindCategory[];
  files: MindFileNode[];
  formation: FormationMode;
  explosionLevel: number;
  expandedCategoryIds: string[];
  focusedCategoryId: string | null;
  selectedFileId: string | null;
  retrievedFileIds: string[];
  isSorting: boolean;
  activeToolName: string | null;
  searchQuery: string;
  cameraPreset: 'overview' | 'top' | 'focus';
  coordinateOverridesRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
  onSelectCategory: (categoryId: string) => void;
  onSelectFile: (fileId: string) => void;
  onToggleExplodeAll: () => void;
}

const BrightStudioEnvironmentSetup: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.fog = new THREE.FogExp2('#F4F7FB', 0.015);

    return () => {
      envTarget.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
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

function computeFileLocalOffset(index: number, total: number): [number, number, number] {
  const phi = Math.acos(1 - (2 * (index + 0.5)) / Math.max(total, 1));
  const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi) * 0.72;
  const z = Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

export function getCategoryPosition(cat: MindCategory): [number, number, number] {
  const x = Math.cos(cat.orbitAngle) * cat.orbitRadius;
  const z = Math.sin(cat.orbitAngle) * cat.orbitRadius;
  const y = cat.elevation;
  return [x, y, z];
}

function getMaterialProps(finish: MaterialFinish, isOuterBubble = false) {
  switch (finish) {
    case 'glass':
      return {
        metalness: 0.04,
        roughness: 0.08,
        transmission: isOuterBubble ? 0.78 : 0.0,
        thickness: 1.0,
        ior: 1.48,
      };
    case 'metal':
      return {
        metalness: isOuterBubble ? 0.35 : 0.55,
        roughness: 0.16,
        transmission: isOuterBubble ? 0.45 : 0.0,
        thickness: 0.6,
        ior: 1.45,
      };
    case 'pearl':
      return {
        metalness: 0.12,
        roughness: 0.12,
        transmission: isOuterBubble ? 0.7 : 0.0,
        thickness: 0.9,
        ior: 1.48,
      };
    case 'matte':
    default:
      return {
        metalness: 0.05,
        roughness: 0.48,
        transmission: isOuterBubble ? 0.55 : 0.0,
        thickness: 0.4,
        ior: 1.4,
      };
  }
}

export function computeTargetBallPosition(
  file: MindFileNode,
  globalIndex: number,
  totalFiles: number,
  catPos: [number, number, number],
  indexInCat: number,
  totalInCat: number,
  effectiveExplosion: number,
  formation: FormationMode,
  retrievedFileIds: string[],
  allFiles: MindFileNode[],
  overrideCoord?: [number, number, number]
): [number, number, number] {
  // 1. Direct MCP coordinate mutation override (via useRef without React state loop)
  if (overrideCoord) {
    return overrideCoord;
  }
  if (file.coordinateOverride) {
    return file.coordinateOverride;
  }

  // 2. Retrieved / Highlighted ball pulled forward to inspection arc
  const retrievedIdx = retrievedFileIds.indexOf(file.id);
  if (
    retrievedIdx !== -1 &&
    retrievedFileIds.length > 0 &&
    retrievedFileIds.length <= 8 &&
    formation === 'clusters'
  ) {
    const count = retrievedFileIds.length;
    const spread = Math.min(count * 1.45, 8.5);
    const xOffset =
      count === 1 ? 0 : -spread / 2 + (retrievedIdx / (count - 1)) * spread;
    const yArc = Math.sin((retrievedIdx / Math.max(count - 1, 1)) * Math.PI) * 0.45 + 0.5;
    return [xOffset, yArc, 3.8];
  }

  if (formation === 'daily-flow') {
    const urgentList = allFiles.filter((f) => f.workloadPriority === 'urgent');
    const todayList = allFiles.filter((f) => f.workloadPriority === 'today');
    const caughtUpList = allFiles.filter((f) => f.workloadPriority === 'caught-up');

    if (file.workloadPriority === 'urgent') {
      const idx = urgentList.findIndex((f) => f.id === file.id);
      const count = Math.max(urgentList.length, 1);
      const span = Math.min(count * 1.9, 8.0);
      const x = count === 1 ? 0 : -span / 2 + (idx / (count - 1)) * span;
      return [x, 0.95, 2.8];
    } else if (file.workloadPriority === 'today') {
      const idx = todayList.findIndex((f) => f.id === file.id);
      const count = Math.max(todayList.length, 1);
      const span = Math.min(count * 1.75, 10.5);
      const x = count === 1 ? 0 : -span / 2 + (idx / (count - 1)) * span;
      const zCurve = -Math.abs(x) * 0.12;
      return [x, 0.05, zCurve];
    } else {
      const idx = caughtUpList.findIndex((f) => f.id === file.id);
      const count = Math.max(caughtUpList.length, 1);
      const angleSpan = Math.PI * 0.78;
      const angle =
        count === 1
          ? -Math.PI / 2
          : -Math.PI / 2 - angleSpan / 2 + (idx / (count - 1)) * angleSpan;
      const radius = 6.2;
      return [
        Math.cos(angle) * radius,
        -0.45 + (idx % 2) * 0.35,
        Math.sin(angle) * radius * 0.55 - 1.2,
      ];
    }
  }

  if (formation === 'app-grid') {
    const uniqueSymbols = Array.from(new Set(allFiles.map((f) => f.appSymbol)));
    const colIndex = uniqueSymbols.indexOf(file.appSymbol);
    const sameAppFiles = allFiles.filter((f) => f.appSymbol === file.appSymbol);
    const rowIndex = sameAppFiles.findIndex((f) => f.id === file.id);

    const totalCols = Math.max(uniqueSymbols.length, 1);
    const colSpacing = 1.45;
    const x = -((totalCols - 1) * colSpacing) / 2 + colIndex * colSpacing;
    const y = 1.6 - rowIndex * 1.25;
    const z = Math.sin((colIndex / totalCols) * Math.PI) * 0.8;
    return [x, y, z];
  }

  if (formation === 'kaleidoscope') {
    if (globalIndex < 6) {
      const angle = (globalIndex / 6) * Math.PI * 2;
      const r = 2.35;
      return [Math.cos(angle) * r, Math.sin(angle) * r * 0.85, 0.4];
    } else {
      const outerIdx = globalIndex - 6;
      const outerTotal = Math.max(totalFiles - 6, 1);
      const angle = (outerIdx / outerTotal) * Math.PI * 2;
      const petalMod = 4.6 + Math.cos(angle * 4) * 0.65;
      return [
        Math.cos(angle) * petalMod,
        Math.sin(angle) * petalMod * 0.82,
        Math.sin(angle * 4) * 0.55,
      ];
    }
  }

  if (formation === 'caught-up-smile') {
    if (globalIndex === 0) return [-2.1, 2.0, 0.5];
    if (globalIndex === 1) return [-2.1, 2.85, 0.5];
    if (globalIndex === 2) return [2.1, 2.0, 0.5];
    if (globalIndex === 3) return [2.1, 2.85, 0.5];

    const smileIdx = globalIndex - 4;
    const smileTotal = Math.max(totalFiles - 4, 1);
    const t = smileTotal === 1 ? 0.5 : smileIdx / (smileTotal - 1);
    const angle = THREE.MathUtils.lerp(-Math.PI * 0.84, -Math.PI * 0.16, t);
    const radiusX = 5.2;
    const radiusY = 3.4;
    return [
      Math.cos(angle) * radiusX,
      Math.sin(angle) * radiusY + 1.35,
      Math.sin(t * Math.PI) * 1.1,
    ];
  }

  const localDir = computeFileLocalOffset(indexInCat, totalInCat);
  const explodedDist = 1.75 + (indexInCat % 3) * 0.42;
  const clusteredDist = 0.34 + (indexInCat % 3) * 0.08;
  const r = THREE.MathUtils.lerp(clusteredDist, explodedDist, effectiveExplosion);
  return [
    catPos[0] + localDir[0] * r,
    catPos[1] + localDir[1] * r,
    catPos[2] + localDir[2] * r,
  ];
}

interface FileBubbleNodeProps {
  file: MindFileNode;
  globalIndex: number;
  totalFiles: number;
  allFiles: MindFileNode[];
  category: MindCategory;
  catPos: [number, number, number];
  indexInCat: number;
  totalInCat: number;
  effectiveExplosion: number;
  formation: FormationMode;
  isSorting: boolean;
  isSelected: boolean;
  isRetrieved: boolean;
  isDimmed: boolean;
  onSelectFile: (fileId: string) => void;
  worldPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  coordinateOverridesRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
}

const FileBubbleNode: React.FC<FileBubbleNodeProps> = ({
  file,
  globalIndex,
  totalFiles,
  allFiles,
  category,
  catPos,
  indexInCat,
  totalInCat,
  effectiveExplosion,
  formation,
  isSorting,
  isSelected,
  isRetrieved,
  isDimmed,
  onSelectFile,
  worldPositionsRef,
  coordinateOverridesRef,
}) => {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const currentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...catPos));
  const currentScaleRef = useRef<number>(1);

  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const ballTexture = useMemo(
    () => getAppBallTexture(file.appSymbol || 'F', category.color, maxAniso),
    [file.appSymbol, category.color, maxAniso]
  );

  const matProps = useMemo(() => getMaterialProps(category.finish, false), [category.finish]);
  const baseBallSize = 0.36 * (file.importance || 1.0);

  useEffect(() => {
    return () => {
      if (meshRef.current) {
        meshRef.current.geometry?.dispose();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m) => m.dispose());
        } else {
          meshRef.current.material?.dispose();
        }
      }
      if (haloRef.current) {
        haloRef.current.geometry?.dispose();
        if (Array.isArray(haloRef.current.material)) {
          haloRef.current.material.forEach((m) => m.dispose());
        } else {
          haloRef.current.material?.dispose();
        }
      }
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    const t = state.clock.getElapsedTime();
    const overrideCoord = coordinateOverridesRef?.current?.[file.id];

    const [tx, ty, tz] = computeTargetBallPosition(
      file,
      globalIndex,
      totalFiles,
      catPos,
      indexInCat,
      totalInCat,
      effectiveExplosion,
      formation,
      isRetrieved ? [file.id] : [],
      allFiles,
      overrideCoord
    );

    let sortBounceY = 0;
    let sortPullZ = 0;
    let sortScaleBoost = 0;
    if (isSorting) {
      const wavePhase = t * 9.5 - globalIndex * 0.42;
      const wavePulse = Math.max(0, Math.sin(wavePhase));
      sortBounceY = wavePulse * 0.75;
      sortPullZ = wavePulse * 0.9;
      sortScaleBoost = wavePulse * 0.32;
    }

    const calmFloatY = Math.sin(t * 1.1 + globalIndex * 0.9) * 0.05;
    const calmFloatX =
      formation === 'kaleidoscope'
        ? Math.cos(t * 0.35 + globalIndex) * 0.08
        : Math.cos(t * 0.5 + globalIndex) * 0.03;

    const goalX = tx + calmFloatX;
    const goalY = ty + calmFloatY + sortBounceY;
    const goalZ = tz + sortPullZ;

    currentPosRef.current.x = THREE.MathUtils.damp(
      currentPosRef.current.x,
      goalX,
      6.0,
      delta
    );
    currentPosRef.current.y = THREE.MathUtils.damp(
      currentPosRef.current.y,
      goalY,
      6.0,
      delta
    );
    currentPosRef.current.z = THREE.MathUtils.damp(
      currentPosRef.current.z,
      goalZ,
      6.0,
      delta
    );

    groupRef.current.position.copy(currentPosRef.current);

    meshRef.current.lookAt(state.camera.position);
    meshRef.current.rotateY(-Math.PI / 2);

    if (!worldPositionsRef.current[file.id]) {
      worldPositionsRef.current[file.id] = new THREE.Vector3();
    }
    worldPositionsRef.current[file.id].copy(currentPosRef.current);

    const targetScale =
      (isSelected
        ? 1.42
        : hovered
        ? 1.25
        : isRetrieved
        ? 1.22
        : isDimmed
        ? 0.68
        : 1.0) + sortScaleBoost;

    currentScaleRef.current = THREE.MathUtils.damp(
      currentScaleRef.current,
      targetScale,
      9,
      delta
    );
    meshRef.current.scale.setScalar(currentScaleRef.current);

    if (haloRef.current) {
      haloRef.current.scale.setScalar(currentScaleRef.current * 1.32);
    }
  });

  const showLabel =
    formation !== 'clusters' ||
    effectiveExplosion > 0.35 ||
    isSelected ||
    isRetrieved ||
    hovered;

  return (
    <group ref={groupRef} position={catPos}>
      {(isSelected || isRetrieved || hovered || isSorting) && (
        <mesh ref={haloRef}>
          <sphereGeometry args={[baseBallSize, 24, 24]} />
          <meshBasicMaterial
            color={category.color}
            transparent
            opacity={isSelected ? 0.28 : isSorting ? 0.22 : 0.16}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectFile(file.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[baseBallSize, 36, 36]} />
        <meshPhysicalMaterial
          map={ballTexture}
          color="#FFFFFF"
          emissive={category.color}
          emissiveIntensity={
            isSelected ? 0.24 : isRetrieved || isSorting ? 0.18 : hovered ? 0.12 : 0.04
          }
          metalness={matProps.metalness}
          roughness={matProps.roughness}
          clearcoat={1.0}
          clearcoatRoughness={0.06}
          transparent={isDimmed}
          opacity={isDimmed ? 0.28 : 1.0}
        />
      </mesh>

      {showLabel && (
        <Html
          position={[0, -baseBallSize - 0.22, 0]}
          center
          distanceFactor={12}
          zIndexRange={[10, 0]}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectFile(file.id);
            }}
            className={`group flex flex-col items-center text-center transition-transform duration-150 ${
              isDimmed ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <div
              className={`px-2.5 py-1 rounded-xl backdrop-blur-md border transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105'
                  : isRetrieved
                  ? 'bg-white text-slate-900 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white/90 text-slate-800 border-slate-200/90 shadow-xs hover:bg-white hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-tight">
                <span
                  className="w-4 h-4 rounded-full text-white text-[9px] font-extrabold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: category.color }}
                >
                  {file.appSymbol}
                </span>
                <span>{file.title}</span>
              </div>
              {(isSelected || isRetrieved || hovered || formation === 'daily-flow') && (
                <div
                  className={`text-[10px] mt-0.5 ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {file.locationPath}
                </div>
              )}
            </div>
          </button>
        </Html>
      )}
    </group>
  );
};

const CategoryClusterShell: React.FC<{
  category: MindCategory;
  categoryFileCount: number;
  explosionLevel: number;
  isExpanded: boolean;
  isFocused: boolean;
  hasRetrievedInCat: boolean;
  visible: boolean;
  onSelectCategory: (categoryId: string) => void;
}> = ({
  category,
  categoryFileCount,
  explosionLevel,
  isExpanded,
  isFocused,
  hasRetrievedInCat,
  visible,
  onSelectCategory,
}) => {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const catPos = useMemo(() => getCategoryPosition(category), [category]);
  const shellMatProps = useMemo(() => getMaterialProps(category.finish, true), [category.finish]);
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const hubEmblemTexture = useMemo(
    () =>
      getAppBallTexture(
        category.symbol || category.name.charAt(0),
        category.color,
        maxAniso
      ),
    [category.symbol, category.name, category.color, maxAniso]
  );

  const effectiveExplosion = Math.max(
    explosionLevel,
    isExpanded || isFocused || hasRetrievedInCat ? 0.95 : 0.0
  );

  const shellScaleRef = useRef(1);
  const groupScaleRef = useRef(1);

  useEffect(() => {
    return () => {
      if (coreRef.current) {
        coreRef.current.geometry?.dispose();
        if (Array.isArray(coreRef.current.material)) {
          coreRef.current.material.forEach((m) => m.dispose());
        } else {
          coreRef.current.material?.dispose();
        }
      }
      if (shellRef.current) {
        shellRef.current.geometry?.dispose();
        if (Array.isArray(shellRef.current.material)) {
          shellRef.current.material.forEach((m) => m.dispose());
        } else {
          shellRef.current.material?.dispose();
        }
      }
    };
  }, []);

  useFrame((state, delta) => {
    const targetGroupScale = visible ? 1.0 : 0.001;
    groupScaleRef.current = THREE.MathUtils.damp(
      groupScaleRef.current,
      targetGroupScale,
      7,
      delta
    );
    if (groupRef.current) {
      groupRef.current.scale.setScalar(groupScaleRef.current);
    }

    if (shellRef.current) {
      const targetShellScale = THREE.MathUtils.lerp(
        hovered ? 1.06 : 1.0,
        0.48,
        effectiveExplosion
      );
      shellScaleRef.current = THREE.MathUtils.damp(
        shellScaleRef.current,
        targetShellScale,
        6,
        delta
      );
      shellRef.current.scale.setScalar(shellScaleRef.current);
    }
    if (coreRef.current) {
      coreRef.current.lookAt(state.camera.position);
      coreRef.current.rotateY(-Math.PI / 2);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={catPos}>
      <mesh
        ref={coreRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectCategory(category.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.46, 36, 36]} />
        <meshPhysicalMaterial
          map={hubEmblemTexture}
          color="#FFFFFF"
          emissive={category.color}
          emissiveIntensity={isFocused || hovered ? 0.18 : 0.06}
          metalness={0.15}
          roughness={0.15}
          clearcoat={1.0}
        />
      </mesh>

      <mesh
        ref={shellRef}
        renderOrder={2}
        onClick={(e) => {
          e.stopPropagation();
          onSelectCategory(category.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[1.08, 44, 44]} />
        <meshPhysicalMaterial
          color={category.color}
          emissive={category.color}
          emissiveIntensity={hovered || isFocused ? 0.15 : 0.05}
          metalness={shellMatProps.metalness}
          roughness={shellMatProps.roughness}
          transmission={shellMatProps.transmission}
          thickness={shellMatProps.thickness}
          ior={shellMatProps.ior}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transparent
          opacity={THREE.MathUtils.lerp(0.68, 0.22, effectiveExplosion)}
          depthWrite={false}
        />
      </mesh>

      <Html position={[0, 1.32, 0]} center distanceFactor={12} zIndexRange={[20, 0]}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory(category.id);
          }}
          className="px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 hover:border-slate-400 text-slate-900 shadow-md transition-transform duration-150 hover:scale-105 whitespace-nowrap"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <span className="font-display font-bold text-xs tracking-tight">
              {category.name}
            </span>
            <span className="text-[11px] text-slate-500 font-medium tabular-nums">
              · {categoryFileCount}
            </span>
          </div>
        </button>
      </Html>
    </group>
  );
};

const FormationStageLabels: React.FC<{
  formation: FormationMode;
  isSorting: boolean;
  activeToolName: string | null;
}> = ({ formation, isSorting, activeToolName }) => {
  if (isSorting) {
    return (
      <Html position={[0, 3.6, 0]} center distanceFactor={12} zIndexRange={[30, 0]}>
        <div className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xl whitespace-nowrap flex items-center gap-2">
          <span>Location Engine Tool Active:</span>
          <span className="font-mono text-sky-300">{activeToolName || 'sorting_balls'}</span>
        </div>
      </Html>
    );
  }

  if (formation === 'daily-flow') {
    return (
      <group>
        <Html position={[0, 2.1, 2.8]} center distanceFactor={13}>
          <div className="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold shadow-md whitespace-nowrap">
            Priority Front Row · Needs Attention Today
          </div>
        </Html>
        <Html position={[0, 1.2, 0]} center distanceFactor={13}>
          <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-md whitespace-nowrap">
            Middle Flow · On Deck Today
          </div>
        </Html>
        <Html position={[0, 0.9, -3.2]} center distanceFactor={14}>
          <div className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md whitespace-nowrap">
            Calm Back Arc · All Caught Up ✓
          </div>
        </Html>
      </group>
    );
  }

  if (formation === 'caught-up-smile') {
    return (
      <Html position={[0, 3.85, 0]} center distanceFactor={13}>
        <div className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-lg whitespace-nowrap">
          All Caught Up! Your Workspace is Organized & Peaceful
        </div>
      </Html>
    );
  }

  if (formation === 'kaleidoscope') {
    return (
      <Html position={[0, 3.85, 0]} center distanceFactor={13}>
        <div className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg whitespace-nowrap">
          Kaleidoscope Harmony · Color-Coordinated Balance
        </div>
      </Html>
    );
  }

  if (formation === 'app-grid') {
    return (
      <Html position={[0, 3.6, 0]} center distanceFactor={13}>
        <div className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg whitespace-nowrap">
          App Shelf Columns · Sorted by App Emblem
        </div>
      </Html>
    );
  }

  return null;
};

const CameraChoreographer: React.FC<{
  categories: MindCategory[];
  formation: FormationMode;
  focusedCategoryId: string | null;
  selectedFileId: string | null;
  cameraPreset: 'overview' | 'top' | 'focus';
  explosionLevel: number;
  worldPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  controlsRef: React.RefObject<any>;
}> = ({
  categories,
  formation,
  focusedCategoryId,
  selectedFileId,
  cameraPreset,
  explosionLevel,
  worldPositionsRef,
  controlsRef,
}) => {
  const { camera } = useThree();
  const desiredDistanceRef = useRef<number>(13.0);
  const isTransitioningRef = useRef<boolean>(false);

  useEffect(() => {
    isTransitioningRef.current = true;
    const timer = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1350);
    return () => clearTimeout(timer);
  }, [focusedCategoryId, selectedFileId, cameraPreset, explosionLevel, formation]);

  useFrame((_state, delta) => {
    if (!controlsRef.current) return;

    if (selectedFileId && worldPositionsRef.current[selectedFileId]) {
      const fPos = worldPositionsRef.current[selectedFileId];
      _camGoalTarget.copy(fPos);
      desiredDistanceRef.current = 4.6;
    } else if (focusedCategoryId && formation === 'clusters') {
      const cat = categories.find((c) => c.id === focusedCategoryId);
      if (cat) {
        const [cx, cy, cz] = getCategoryPosition(cat);
        _camGoalTarget.set(cx, cy, cz);
        desiredDistanceRef.current = 6.5;
      }
    } else {
      _camGoalTarget.set(0, 0.2, 0);
      desiredDistanceRef.current =
        formation === 'clusters' && explosionLevel < 0.5 ? 11.8 : 13.4;
    }

    controlsRef.current.target.x = THREE.MathUtils.damp(
      controlsRef.current.target.x,
      _camGoalTarget.x,
      5.5,
      delta
    );
    controlsRef.current.target.y = THREE.MathUtils.damp(
      controlsRef.current.target.y,
      _camGoalTarget.y,
      5.5,
      delta
    );
    controlsRef.current.target.z = THREE.MathUtils.damp(
      controlsRef.current.target.z,
      _camGoalTarget.z,
      5.5,
      delta
    );

    if (isTransitioningRef.current) {
      if (cameraPreset === 'top') {
        _camGoalPos.set(
          _camGoalTarget.x,
          _camGoalTarget.y + desiredDistanceRef.current * 1.15,
          _camGoalTarget.z + 0.01
        );
      } else if (
        formation === 'caught-up-smile' ||
        formation === 'kaleidoscope' ||
        formation === 'app-grid'
      ) {
        _camGoalPos.set(0, 1.2, desiredDistanceRef.current);
      } else {
        _tempVecA.copy(camera.position).sub(controlsRef.current.target);
        if (_tempVecA.lengthSq() < 0.01) {
          _tempVecA.set(0, 3, 10);
        }
        _tempVecA.normalize().multiplyScalar(desiredDistanceRef.current);
        _camGoalPos.copy(_camGoalTarget).add(_tempVecA);
        _camGoalPos.y = THREE.MathUtils.clamp(_camGoalPos.y, -2.0, 8.5);
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 4.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 4.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 4.5, delta);
    }

    controlsRef.current.update();
  });

  return null;
};

export const SpatialMindMap: React.FC<SpatialMindMapProps> = ({
  categories,
  files,
  formation,
  explosionLevel,
  expandedCategoryIds,
  focusedCategoryId,
  selectedFileId,
  retrievedFileIds,
  isSorting,
  activeToolName,
  searchQuery,
  cameraPreset,
  coordinateOverridesRef,
  onSelectCategory,
  onSelectFile,
}) => {
  const controlsRef = useRef<any>(null);
  const worldPositionsRef = useRef<Record<string, THREE.Vector3>>({});
  const [webglLost, setWebglLost] = useState(false);

  // Dispose cached procedural textures on component unmount
  useEffect(() => {
    return () => {
      disposeCachedBallTextures();
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#F8FAFC] via-[#EFF4FB] to-[#E2E8F0] select-none pointer-events-auto">
      {webglLost ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <p className="text-lg font-display font-bold text-slate-900 mb-2">
            3D Location Engine Paused
          </p>
          <p className="text-sm text-slate-600 max-w-md">
            Click below to resume your 3D bubble workspace.
          </p>
          <button
            type="button"
            onClick={() => setWebglLost(false)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-500 transition-colors"
          >
            Resume 3D Engine
          </button>
        </div>
      ) : (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 3.2, 12.2], fov: 44, near: 0.1, far: 120 }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setWebglLost(true);
            });
            canvas.addEventListener('webglcontextrestored', () => {
              setWebglLost(false);
            });
          }}
        >
          <BrightStudioEnvironmentSetup />

          <ambientLight intensity={0.85} color="#FFFFFF" />
          <directionalLight position={[12, 16, 12]} intensity={1.6} color="#FFFDF9" />
          <directionalLight position={[-10, 6, -8]} intensity={0.8} color="#E0F2FE" />
          <pointLight position={[0, 8, 6]} intensity={0.6} color="#FFFFFF" />

          <FormationStageLabels
            formation={formation}
            isSorting={isSorting}
            activeToolName={activeToolName}
          />

          {/* Category Group Containment Bubbles */}
          {categories.map((category) => {
            const catFiles = files.filter((f) => f.categoryId === category.id);
            const isExpanded = expandedCategoryIds.includes(category.id);
            const isFocused = focusedCategoryId === category.id;
            const hasRetrieved = catFiles.some(
              (f) => retrievedFileIds.includes(f.id) || f.id === selectedFileId
            );

            return (
              <CategoryClusterShell
                key={category.id}
                category={category}
                categoryFileCount={catFiles.length}
                explosionLevel={explosionLevel}
                isExpanded={isExpanded}
                isFocused={isFocused}
                hasRetrievedInCat={hasRetrieved}
                visible={formation === 'clusters'}
                onSelectCategory={onSelectCategory}
              />
            );
          })}

          {/* All Everyday & Imported File Balls */}
          {files.map((file, globalIdx) => {
            const category =
              categories.find((c) => c.id === file.categoryId) || categories[0];
            const catFiles = files.filter((f) => f.categoryId === category.id);
            const indexInCat = catFiles.findIndex((f) => f.id === file.id);
            const catPos = getCategoryPosition(category);

            const isExpanded = expandedCategoryIds.includes(category.id);
            const isFocused = focusedCategoryId === category.id;
            const hasRetrievedInCat = catFiles.some(
              (f) => retrievedFileIds.includes(f.id) || f.id === selectedFileId
            );
            const effectiveExplosion = Math.max(
              explosionLevel,
              isExpanded || isFocused || hasRetrievedInCat ? 0.95 : 0.0
            );

            const matchesSearch =
              !normalizedQuery ||
              file.title.toLowerCase().includes(normalizedQuery) ||
              file.appName.toLowerCase().includes(normalizedQuery) ||
              file.locationPath.toLowerCase().includes(normalizedQuery) ||
              file.summary.toLowerCase().includes(normalizedQuery);

            const isSelected = selectedFileId === file.id;
            const isRetrieved = retrievedFileIds.includes(file.id);
            const isDimmed =
              (normalizedQuery.length > 0 && !matchesSearch) ||
              (retrievedFileIds.length > 0 &&
                !isRetrieved &&
                !isSelected &&
                formation === 'clusters');

            return (
              <FileBubbleNode
                key={file.id}
                file={file}
                globalIndex={globalIdx}
                totalFiles={files.length}
                allFiles={files}
                category={category}
                catPos={catPos}
                indexInCat={Math.max(indexInCat, 0)}
                totalInCat={catFiles.length}
                effectiveExplosion={effectiveExplosion}
                formation={formation}
                isSorting={isSorting}
                isSelected={isSelected}
                isRetrieved={isRetrieved}
                isDimmed={isDimmed}
                onSelectFile={onSelectFile}
                worldPositionsRef={worldPositionsRef}
                coordinateOverridesRef={coordinateOverridesRef}
              />
            );
          })}

          <ContactShadows
            position={[0, -3.9, 0]}
            opacity={0.26}
            scale={28}
            blur={2.6}
            far={8}
            color="#64748B"
          />

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={2.4}
            maxDistance={26}
            maxPolarAngle={Math.PI * 0.85}
          />

          <CameraChoreographer
            categories={categories}
            formation={formation}
            focusedCategoryId={focusedCategoryId}
            selectedFileId={selectedFileId}
            cameraPreset={cameraPreset}
            explosionLevel={explosionLevel}
            worldPositionsRef={worldPositionsRef}
            controlsRef={controlsRef}
          />
        </Canvas>
      )}
    </div>
  );
};

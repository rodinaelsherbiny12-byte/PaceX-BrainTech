import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { DeviceComponentId, DeviceState } from '../types';

interface WearableDevice3DProps {
  device: DeviceState;
  selectedComponent: DeviceComponentId;
  onSelectComponent: (id: DeviceComponentId) => void;
  reduceMotion?: boolean;
  compact?: boolean;
}

interface HotspotProjection {
  id: DeviceComponentId;
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

// Anatomical 10-20 placement around the circular blue headband
const ELECTRODE_LAYOUT: Array<{
  id: DeviceComponentId;
  short: string;
  angleRad: number;
  yOffset: number;
  tiltPitch: number;
}> = [
  { id: 'E1', short: 'E1·Fp1', angleRad: -0.44, yOffset: 0.04, tiltPitch: 0.06 },
  { id: 'E2', short: 'E2·Fp2', angleRad: 0.44, yOffset: 0.04, tiltPitch: 0.06 },
  { id: 'E3', short: 'E3·F3', angleRad: -1.05, yOffset: 0.07, tiltPitch: 0.1 },
  { id: 'E4', short: 'E4·F4', angleRad: 1.05, yOffset: 0.07, tiltPitch: 0.1 },
  { id: 'E5', short: 'E5·C3', angleRad: -1.72, yOffset: 0.09, tiltPitch: 0.08 },
  { id: 'E6', short: 'E6·C4', angleRad: 1.72, yOffset: 0.09, tiltPitch: 0.08 },
  { id: 'E7', short: 'E7·P3', angleRad: -2.42, yOffset: 0.05, tiltPitch: 0.04 },
  { id: 'E8', short: 'E8·P4', angleRad: 2.42, yOffset: 0.05, tiltPitch: 0.04 },
];

// Reusable module-level math objects (zero GC in render loop)
const _projVec = new THREE.Vector3();
const _camDir = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const WearableDevice3D: React.FC<WearableDevice3DProps> = ({
  device,
  selectedComponent,
  onSelectComponent,
  reduceMotion = false,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(!reduceMotion);
  const [showHeadform, setShowHeadform] = useState(true);
  const [explodedAmount, setExplodedAmount] = useState(0);
  const [showHotspots, setShowHotspots] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [hotspots, setHotspots] = useState<HotspotProjection[]>([]);

  // Refs synced to Three.js render loop without recreating WebGL context
  const deviceRef = useRef(device);
  const selectedRef = useRef(selectedComponent);
  const autoRotateRef = useRef(autoRotate && !reduceMotion);
  const showHeadformRef = useRef(showHeadform);
  const explodedTargetRef = useRef(explodedAmount);
  const showHotspotsRef = useRef(showHotspots);
  const onSelectRef = useRef(onSelectComponent);

  deviceRef.current = device;
  selectedRef.current = selectedComponent;
  autoRotateRef.current = autoRotate && !reduceMotion;
  showHeadformRef.current = showHeadform;
  explodedTargetRef.current = explodedAmount;
  showHotspotsRef.current = showHotspots;
  onSelectRef.current = onSelectComponent;

  const controlsApiRef = useRef<{
    zoomBy: (factor: number) => void;
    resetView: () => void;
    focusAngle: (azimuth: number, polar: number) => void;
  } | null>(null);

  useEffect(() => {
    const mountEl = containerRef.current;
    if (!mountEl) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = Math.max(mountEl.clientWidth, 320);
    const height = Math.max(mountEl.clientHeight, 320);
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1228);
    scene.fog = new THREE.FogExp2(0x0b1228, 0.045);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.2, 2.2, 3.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 8.2;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI - 0.12;
    controls.target.set(0, 0.1, 0);

    // Three-point + Neuroflow studio lighting
    const hemiLight = new THREE.HemisphereLight(0x7cc4ff, 0x111b3a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.1);
    keyLight.position.set(4.5, 6.5, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.camera.left = -2.8;
    keyLight.shadow.camera.right = 2.8;
    keyLight.shadow.camera.top = 2.8;
    keyLight.shadow.camera.bottom = -2.8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimCyan = new THREE.DirectionalLight(0x20c5d8, 1.3);
    rimCyan.position.set(-4.5, 2.5, -3.5);
    scene.add(rimCyan);

    const rimPurple = new THREE.DirectionalLight(0x7657f6, 0.9);
    rimPurple.position.set(2.0, -2.5, -4.5);
    scene.add(rimPurple);

    // Subtle diagnostic reference ring floor + contact shadow plane
    const gridHelper = new THREE.PolarGridHelper(3.4, 12, 6, 64, 0x20c5d8, 0x1e2c5c);
    gridHelper.position.y = -1.35;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    scene.add(gridHelper);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
      grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
      grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.28)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const contactTex = new THREE.CanvasTexture(shadowCanvas);
    const contactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }),
    );
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.y = -1.33;
    scene.add(contactPlane);

    // Master Wearable Device Group
    const deviceRoot = new THREE.Group();
    deviceRoot.position.y = 0.1;
    scene.add(deviceRoot);

    // Optional translucent reference headform
    const headformGroup = new THREE.Group();
    const headMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b2a52,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.38,
      clearcoat: 0.4,
      depthWrite: false,
    });
    const craniumGeo = new THREE.SphereGeometry(0.95, 36, 28);
    craniumGeo.scale(0.86, 1.06, 1.02);
    const craniumMesh = new THREE.Mesh(craniumGeo, headMat);
    craniumMesh.position.set(0, -0.05, -0.04);
    headformGroup.add(craniumMesh);

    const jawGeo = new THREE.CylinderGeometry(0.62, 0.42, 0.72, 28);
    const jawMesh = new THREE.Mesh(jawGeo, headMat);
    jawMesh.position.set(0, -0.62, 0.08);
    headformGroup.add(jawMesh);

    const noseGeo = new THREE.ConeGeometry(0.11, 0.28, 12);
    const noseMesh = new THREE.Mesh(noseGeo, headMat);
    noseMesh.rotation.x = Math.PI * 0.42;
    noseMesh.position.set(0, -0.32, 0.94);
    headformGroup.add(noseMesh);

    deviceRoot.add(headformGroup);

    // Materials library matching the original blue wearable EEG head device
    const blueChassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e66e8,
      roughness: 0.26,
      metalness: 0.2,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    });
    const blueTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1344a6,
      roughness: 0.42,
      metalness: 0.35,
    });
    const innerPadMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.05,
    });
    const brushedMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.9,
      anisotropy: 0.6,
    });
    const goldContactMat = new THREE.MeshStandardMaterial({
      color: 0xf5b942,
      roughness: 0.25,
      metalness: 0.92,
    });
    const electronicsMat = new THREE.MeshPhysicalMaterial({
      color: 0x1850bd,
      roughness: 0.24,
      metalness: 0.3,
      clearcoat: 0.7,
    });
    const batteryMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.6,
    });

    const clickableMeshes: THREE.Object3D[] = [];
    const componentMaterials: Partial<Record<DeviceComponentId, THREE.MeshStandardMaterial[]>> = {};

    function registerClickable(mesh: THREE.Object3D, compId: DeviceComponentId) {
      mesh.userData.componentId = compId;
      mesh.layers.enable(1);
      clickableMeshes.push(mesh);
    }

    // 1. Main Circular Blue Wearable Halo Frame (Elliptical anatomical ring)
    const structureGroup = new THREE.Group();
    const ringPoints: THREE.Vector3[] = [];
    const rx = 1.02;
    const rz = 1.16;
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const x = Math.sin(a) * rx;
      const z = Math.cos(a) * rz;
      // Subtle anatomical cranial contour: slightly higher over temples, lower at occipital rear
      const y = 0.06 * Math.cos(a * 2) + 0.05 * Math.sin(a * 0.5) * 0;
      ringPoints.push(new THREE.Vector3(x, y, z));
    }
    const haloCurve = new THREE.CatmullRomCurve3(ringPoints, true);
    const haloGeo = new THREE.TubeGeometry(haloCurve, 128, 0.088, 24, true);
    const haloMesh = new THREE.Mesh(haloGeo, blueChassisMat.clone());
    haloMesh.castShadow = true;
    haloMesh.receiveShadow = true;
    registerClickable(haloMesh, 'structure');
    structureGroup.add(haloMesh);

    // Secondary sculpted blue top-bezel rib
    const ribGeo = new THREE.TubeGeometry(haloCurve, 128, 0.048, 16, true);
    const ribMesh = new THREE.Mesh(ribGeo, blueTrimMat.clone());
    ribMesh.position.y = 0.068;
    ribMesh.scale.set(1.01, 0.7, 1.01);
    registerClickable(ribMesh, 'structure');
    structureGroup.add(ribMesh);

    // Inner comfort cushion ring
    const padGeo = new THREE.TubeGeometry(haloCurve, 96, 0.055, 16, true);
    const padMesh = new THREE.Mesh(padGeo, innerPadMat);
    padMesh.scale.set(0.94, 0.85, 0.94);
    structureGroup.add(padMesh);

    // Anterior forehead stabilizer bridge (subtle neuro-emblem accent)
    const bridgeGeo = new THREE.BoxGeometry(0.42, 0.08, 0.07);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, brushedMetalMat);
    bridgeMesh.position.set(0, 0.08, rz + 0.055);
    registerClickable(bridgeMesh, 'structure');
    structureGroup.add(bridgeMesh);

    componentMaterials.structure = [
      haloMesh.material as THREE.MeshStandardMaterial,
      ribMesh.material as THREE.MeshStandardMaterial,
    ];
    deviceRoot.add(structureGroup);

    // 2. Posterior 8-Channel Recording Electronics Module
    const electronicsGroup = new THREE.Group();
    const podBasePos = new THREE.Vector3(0, 0.06, -(rz + 0.12));
    electronicsGroup.position.copy(podBasePos);

    const podShape = new THREE.BoxGeometry(0.76, 0.28, 0.24);
    const podMesh = new THREE.Mesh(podShape, electronicsMat.clone());
    podMesh.castShadow = true;
    registerClickable(podMesh, 'electronics');
    electronicsGroup.add(podMesh);

    // Chamfered brushed aluminum AFE shield plate
    const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.17, 0.04), brushedMetalMat);
    plateMesh.position.set(0, 0.01, -0.12);
    registerClickable(plateMesh, 'electronics');
    electronicsGroup.add(plateMesh);

    // 8 micro channel indicator fins on the electronics housing
    const ledStripMat = new THREE.MeshStandardMaterial({
      color: 0x20c5d8,
      emissive: 0x20c5d8,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    for (let i = 0; i < 8; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.07, 0.03), ledStripMat);
      fin.position.set(-0.245 + i * 0.07, 0.02, -0.135);
      electronicsGroup.add(fin);
    }
    componentMaterials.electronics = [podMesh.material as THREE.MeshStandardMaterial];
    deviceRoot.add(electronicsGroup);

    // 3. Integrated Power & Battery Cell (mounted below posterior module)
    const batteryGroup = new THREE.Group();
    const batteryBasePos = new THREE.Vector3(0, -0.15, -(rz + 0.08));
    batteryGroup.position.copy(batteryBasePos);

    const cellMesh = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.13, 0.18), batteryMat.clone());
    cellMesh.castShadow = true;
    registerClickable(cellMesh, 'battery');
    batteryGroup.add(cellMesh);

    const batteryGlowMat = new THREE.MeshStandardMaterial({
      color: 0x35c98a,
      emissive: 0x35c98a,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const batteryBar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.025), batteryGlowMat);
    batteryBar.position.set(0, 0, -0.095);
    batteryGroup.add(batteryBar);
    componentMaterials.battery = [cellMesh.material as THREE.MeshStandardMaterial];
    deviceRoot.add(batteryGroup);

    // 4. Eight Electrode Holders & Eight Individually Selectable Dry EEG Electrodes
    const holdersMatList: THREE.MeshStandardMaterial[] = [];
    const electrodeRecords: Array<{
      id: DeviceComponentId;
      short: string;
      holderGroup: THREE.Group;
      electrodeGroup: THREE.Group;
      holderBasePos: THREE.Vector3;
      electrodeBasePos: THREE.Vector3;
      radialDir: THREE.Vector3;
      collarMat: THREE.MeshStandardMaterial;
      housingMat: THREE.MeshStandardMaterial;
      worldAnchor: THREE.Object3D;
    }> = [];

    for (const item of ELECTRODE_LAYOUT) {
      const x = Math.sin(item.angleRad) * rx;
      const z = Math.cos(item.angleRad) * rz;
      const y = 0.06 * Math.cos(item.angleRad * 2) + item.yOffset;

      const radialDir = new THREE.Vector3(x, 0, z).normalize();
      const inwardDir = radialDir.clone().negate();

      // Articulated Electrode Holder (mounted on outer halo frame)
      const holderGroup = new THREE.Group();
      const holderBasePos = new THREE.Vector3(x, y, z);
      holderGroup.position.copy(holderBasePos);
      holderGroup.lookAt(x + radialDir.x, y, z + radialDir.z);

      const clampMat = blueTrimMat.clone();
      holdersMatList.push(clampMat);

      // Outer clamp saddle
      const saddleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.096, 0.14, 20), clampMat);
      saddleMesh.rotation.x = Math.PI / 2;
      saddleMesh.castShadow = true;
      registerClickable(saddleMesh, 'holders');
      holderGroup.add(saddleMesh);

      // Brushed aluminum spring sleeve
      const sleeveMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.056, 0.17, 16),
        brushedMetalMat,
      );
      sleeveMesh.rotation.x = Math.PI / 2;
      sleeveMesh.position.z = 0.025;
      registerClickable(sleeveMesh, 'holders');
      holderGroup.add(sleeveMesh);

      deviceRoot.add(holderGroup);

      // Individual Dry EEG Electrode Assembly (extends inward toward scalp + glowing status cap outside)
      const electrodeGroup = new THREE.Group();
      const electrodeBasePos = holderBasePos.clone().addScaledVector(inwardDir, 0.06);
      electrodeGroup.position.copy(electrodeBasePos);
      electrodeGroup.lookAt(
        electrodeBasePos.x + inwardDir.x,
        electrodeBasePos.y - item.tiltPitch,
        electrodeBasePos.z + inwardDir.z,
      );

      const housingMat = new THREE.MeshPhysicalMaterial({
        color: 0x2563eb,
        roughness: 0.25,
        metalness: 0.35,
        clearcoat: 0.6,
      });
      const collarMat = new THREE.MeshStandardMaterial({
        color: 0x20c5d8,
        emissive: 0x20c5d8,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });

      // Outer selectable cap
      const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.08, 20), housingMat);
      capMesh.rotation.x = Math.PI / 2;
      capMesh.position.z = -0.11;
      registerClickable(capMesh, item.id);
      electrodeGroup.add(capMesh);

      // Glowing status ring around electrode
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.013, 12, 24), collarMat);
      glowRing.position.z = -0.135;
      registerClickable(glowRing, item.id);
      electrodeGroup.add(glowRing);

      // Dry-comb base disc
      const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.054, 0.04, 18), brushedMetalMat);
      baseDisc.rotation.x = Math.PI / 2;
      baseDisc.position.z = 0.05;
      registerClickable(baseDisc, item.id);
      electrodeGroup.add(baseDisc);

      // 5 gold-plated dry EEG contact pins facing inward
      for (let p = 0; p < 5; p++) {
        const pinAngle = (p / 5) * Math.PI * 2;
        const pinR = p === 0 ? 0 : 0.036;
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.075, 10), goldContactMat);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(Math.cos(pinAngle) * pinR, Math.sin(pinAngle) * pinR, 0.095);
        registerClickable(pin, item.id);
        electrodeGroup.add(pin);
      }

      // World anchor for 2D hotspot projection
      const worldAnchor = new THREE.Object3D();
      worldAnchor.position.set(0, 0.09, -0.15);
      electrodeGroup.add(worldAnchor);

      componentMaterials[item.id] = [housingMat];
      deviceRoot.add(electrodeGroup);

      electrodeRecords.push({
        id: item.id,
        short: item.short,
        holderGroup,
        electrodeGroup,
        holderBasePos,
        electrodeBasePos,
        radialDir,
        collarMat,
        housingMat,
        worldAnchor,
      });
    }
    componentMaterials.holders = holdersMatList;

    // Electronics + Structure Hotspot anchors
    const electronicsAnchor = new THREE.Object3D();
    electronicsAnchor.position.set(0, 0.24, -0.05);
    electronicsGroup.add(electronicsAnchor);

    const structureAnchor = new THREE.Object3D();
    structureAnchor.position.set(0, 0.22, rz + 0.05);
    structureGroup.add(structureAnchor);

    // Pointer Raycasting for clicking 3D parts (distinguishing click vs orbit drag)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return; // Was a drag/orbit, not a click

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const compId = hits[0].object.userData.componentId as DeviceComponentId | undefined;
        if (compId) {
          onSelectRef.current(compId);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // Camera transition state
    let camTargetPos: THREE.Vector3 | null = null;
    controls.addEventListener('start', () => {
      camTargetPos = null;
    });

    controlsApiRef.current = {
      zoomBy: (factor: number) => {
        const offset = camera.position.clone().sub(controls.target);
        const len = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
        offset.setLength(len);
        camTargetPos = controls.target.clone().add(offset);
      },
      resetView: () => {
        camTargetPos = new THREE.Vector3(3.2, 2.2, 3.6);
      },
      focusAngle: (azimuth: number, polar: number) => {
        const dist = camera.position.distanceTo(controls.target);
        const sinP = Math.sin(polar);
        camTargetPos = new THREE.Vector3(
          dist * sinP * Math.sin(azimuth),
          dist * Math.cos(polar) + controls.target.y,
          dist * sinP * Math.cos(azimuth),
        );
      },
    };

    // ResizeObserver for crisp responsive sizing
    const resizeObserver = new ResizeObserver(() => {
      if (!mountEl) return;
      const w = Math.max(mountEl.clientWidth, 240);
      const h = Math.max(mountEl.clientHeight, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mountEl);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation loop with exponential damping and software-WebGL pacing
    let frameId = 0;
    let disposed = false;
    let explodedCurrent = 0;
    let lastHotspotPush = 0;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 6);
    };

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const curDevice = deviceRef.current;
      const curSelected = selectedRef.current;

      // Smooth exploded view separation
      explodedCurrent = THREE.MathUtils.damp(explodedCurrent, explodedTargetRef.current, 7, delta);
      headformGroup.visible = showHeadformRef.current;

      // Update camera preset glide if active
      if (camTargetPos) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, camTargetPos.x, 7, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, camTargetPos.y, 7, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, camTargetPos.z, 7, delta);
        if (camera.position.distanceTo(camTargetPos) < 0.03) {
          camTargetPos = null;
        }
      }

      controls.autoRotate = autoRotateRef.current;
      controls.autoRotateSpeed = 1.1;
      controls.update();

      // Update exploded positions + live LED & selection highlights
      for (const rec of electrodeRecords) {
        const comp = curDevice.components[rec.id];
        const isSelected = curSelected === rec.id;
        const isActive = comp?.active ?? true;

        // Radial exploded offset
        rec.holderGroup.position
          .copy(rec.holderBasePos)
          .addScaledVector(rec.radialDir, explodedCurrent * 0.42);
        rec.electrodeGroup.position
          .copy(rec.electrodeBasePos)
          .addScaledVector(rec.radialDir, explodedCurrent * 0.85);

        if (!curDevice.connected) {
          rec.collarMat.color.setHex(0x64748b);
          rec.collarMat.emissive.setHex(0x1e293b);
          rec.collarMat.emissiveIntensity = 0.25;
        } else if (isSelected) {
          rec.collarMat.color.setHex(0x7657f6);
          rec.collarMat.emissive.setHex(0x7657f6);
          rec.collarMat.emissiveIntensity = 2.1 + Math.sin(elapsed * 5) * 0.4;
        } else if (!isActive) {
          rec.collarMat.color.setHex(0xffb547);
          rec.collarMat.emissive.setHex(0xffb547);
          rec.collarMat.emissiveIntensity = 0.8;
        } else if (curDevice.monitoring) {
          rec.collarMat.color.setHex(0x20c5d8);
          rec.collarMat.emissive.setHex(0x20c5d8);
          rec.collarMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 4 + rec.holderBasePos.x) * 0.35;
        } else {
          rec.collarMat.color.setHex(0x35c98a);
          rec.collarMat.emissive.setHex(0x35c98a);
          rec.collarMat.emissiveIntensity = 1.25;
        }

        rec.housingMat.emissive.setHex(isSelected ? 0x7657f6 : 0x000000);
        rec.housingMat.emissiveIntensity = isSelected ? 0.55 : 0;
      }

      // Posterior electronics & battery exploded offsets + selection highlights
      electronicsGroup.position.set(
        podBasePos.x,
        podBasePos.y + explodedCurrent * 0.14,
        podBasePos.z - explodedCurrent * 0.65,
      );
      batteryGroup.position.set(
        batteryBasePos.x,
        batteryBasePos.y - explodedCurrent * 0.32,
        batteryBasePos.z - explodedCurrent * 0.48,
      );

      // Highlight selected hardware assembly
      (['structure', 'holders', 'electronics', 'battery'] as DeviceComponentId[]).forEach((hid) => {
        const mats = componentMaterials[hid];
        if (!mats) return;
        const isSel = curSelected === hid;
        for (const m of mats) {
          m.emissive.setHex(isSel ? 0x7657f6 : 0x000000);
          m.emissiveIntensity = isSel ? 0.45 : 0;
        }
      });

      // Electronics LED strip & battery indicator color
      if (!curDevice.connected) {
        ledStripMat.color.setHex(0x64748b);
        ledStripMat.emissive.setHex(0x334155);
        ledStripMat.emissiveIntensity = 0.3;
      } else if (curDevice.monitoring) {
        ledStripMat.color.setHex(0x20c5d8);
        ledStripMat.emissive.setHex(0x20c5d8);
        ledStripMat.emissiveIntensity = 1.5;
      } else {
        ledStripMat.color.setHex(0x35c98a);
        ledStripMat.emissive.setHex(0x35c98a);
        ledStripMat.emissiveIntensity = 1.1;
      }

      batteryGlowMat.color.setHex(curDevice.batteryLevel < 20 ? 0xf05263 : 0x35c98a);
      batteryGlowMat.emissive.setHex(curDevice.batteryLevel < 20 ? 0xf05263 : 0x35c98a);

      renderer.render(scene, camera);

      // Throttled 2D projection for interactive hotspot labels (~18Hz)
      if (showHotspotsRef.current && elapsed - lastHotspotPush > 0.055) {
        lastHotspotPush = elapsed;
        const cw = renderer.domElement.clientWidth;
        const ch = renderer.domElement.clientHeight;
        camera.getWorldDirection(_camDir);

        const nextHotspots: HotspotProjection[] = [];
        for (const rec of electrodeRecords) {
          rec.worldAnchor.getWorldPosition(_projVec);
          _projVec.project(camera);
          const inFront = _projVec.z < 1 && _projVec.z > -1;
          nextHotspots.push({
            id: rec.id,
            label: rec.short,
            x: ((_projVec.x + 1) / 2) * cw,
            y: ((-_projVec.y + 1) / 2) * ch,
            visible: inFront,
          });
        }

        // Add Electronics & Frame anchors
        electronicsAnchor.getWorldPosition(_projVec);
        _projVec.project(camera);
        nextHotspots.push({
          id: 'electronics',
          label: '8-Ch AFE',
          x: ((_projVec.x + 1) / 2) * cw,
          y: ((-_projVec.y + 1) / 2) * ch,
          visible: _projVec.z < 1 && _projVec.z > -1,
        });

        structureAnchor.getWorldPosition(_projVec);
        _projVec.project(camera);
        nextHotspots.push({
          id: 'structure',
          label: 'Halo Frame',
          x: ((_projVec.x + 1) / 2) * cw,
          y: ((-_projVec.y + 1) / 2) * ch,
          visible: _projVec.z < 1 && _projVec.z > -1,
        });

        setHotspots(nextHotspots);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      contactTex.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  if (webglError) {
    return (
      <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-[#0B1228] p-6 text-center">
        <p className="text-base font-semibold text-white">3D WebGL Viewport Unavailable</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Your browser environment does not currently expose WebGL. Use the component list panel to inspect all 8 dry EEG electrodes and structural assemblies.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0B1228] ${
        compact ? 'h-[340px]' : 'h-[520px] lg:h-[620px]'
      }`}
    >
      {/* Dedicated WebGL Mount Container */}
      <div ref={containerRef} className="h-full w-full" aria-label="Interactive 3D NEUROFLOW EEG Wearable Head Device" />

      {/* Projected Interactive 3D Hotspots */}
      {showHotspots && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {hotspots.map((spot) => {
            if (!spot.visible) return null;
            const isSelected = selectedComponent === spot.id;
            const comp = device.components[spot.id];
            const active = comp?.active ?? true;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => onSelectComponent(spot.id)}
                style={{
                  transform: `translate3d(${spot.x}px, ${spot.y}px, 0) translate(-50%, -50%)`,
                }}
                className={`pointer-events-auto absolute left-0 top-0 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20C5D8] ${
                  isSelected
                    ? 'border-[#7657F6] bg-[#7657F6] text-white shadow-lg'
                    : active
                      ? 'border-[#20C5D8]/60 bg-[#111B3A]/90 text-slate-100 hover:border-[#20C5D8]'
                      : 'border-[#FFB547]/60 bg-[#111B3A]/90 text-[#FFB547]'
                }`}
              >
                {spot.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Top-Left Non-Intrusive Simulation Marker */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-slate-700/70 bg-[#111B3A]/90 px-3 py-1.5 text-xs font-medium text-slate-200">
          360° Interactive Concept · Drag to Orbit · Scroll/Pinch to Zoom
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Center Occlusion) */}
      <div className="absolute bottom-4 left-1/2 z-10 w-[min(94%,780px)] -translate-x-1/2">
        <div className="mb-1.5 flex justify-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((c) => !c)}
            className="flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/70 bg-[#111B3A]/95 px-3 py-1 text-xs font-medium text-slate-200 hover:text-white focus-visible:outline-2 focus-visible:outline-[#20C5D8]"
          >
            {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{dockCollapsed ? 'Show 3D Controls' : 'Hide 3D Controls'}</span>
          </button>
        </div>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-[#111B3A]/95 px-4 py-2.5 shadow-2xl">
            {/* Zoom & Angle Presets */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => controlsApiRef.current?.zoomBy(0.82)}
                className="flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#20C5D8] hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                <span>Zoom +</span>
              </button>
              <button
                type="button"
                onClick={() => controlsApiRef.current?.zoomBy(1.22)}
                className="flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#20C5D8] hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
                <span>Zoom -</span>
              </button>
              <button
                type="button"
                onClick={() => controlsApiRef.current?.resetView()}
                className="flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7657F6] hover:text-white"
                title="Reset Camera Angle"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => controlsApiRef.current?.focusAngle(0, 0.25)}
                className="hidden min-h-[38px] items-center rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7657F6] hover:text-white sm:flex"
              >
                Top View
              </button>
              <button
                type="button"
                onClick={() => controlsApiRef.current?.focusAngle(Math.PI, 1.3)}
                className="hidden min-h-[38px] items-center rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7657F6] hover:text-white sm:flex"
              >
                Rear AFE
              </button>
            </div>

            {/* Exploded View Slider */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-200">
              <Layers className="h-3.5 w-3.5 text-[#20C5D8]" />
              <span className="whitespace-nowrap">Explode</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explodedAmount}
                onChange={(e) => setExplodedAmount(Number(e.target.value))}
                className="w-20 accent-[#7657F6] sm:w-24"
              />
            </label>

            {/* Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoRotate((r) => !r)}
                className={`flex min-h-[38px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  autoRotate
                    ? 'border-[#7657F6] bg-[#7657F6]/20 text-white'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300'
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Orbit</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHeadform((h) => !h)}
                className={`flex min-h-[38px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showHeadform
                    ? 'border-[#20C5D8]/70 bg-[#20C5D8]/15 text-white'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300'
                }`}
              >
                {showHeadform ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>Headform</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHotspots((s) => !s)}
                className={`flex min-h-[38px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showHotspots
                    ? 'border-[#35C98A]/70 bg-[#35C98A]/15 text-white'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300'
                }`}
              >
                <span>Hotspots</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

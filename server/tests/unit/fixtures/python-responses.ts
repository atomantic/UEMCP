/**
 * Realistic Python response fixtures for integration testing
 * 
 * These are based on actual responses from the Python operations
 * and test the real data structures, not simplified mocks.
 */

// Wall asset from ModularOldTown - realistic response structure
export const WALL_ASSET_RESPONSE = {
  success: true,
  assetType: 'StaticMesh',
  bounds: {
    size: { x: 300.0, y: 30.0, z: 400.0 },
    extent: { x: 150.0, y: 15.0, z: 200.0 },
    origin: { x: 0.0, y: 0.0, z: 0.0 },
    min: { x: -150.0, y: -15.0, z: -200.0 },
    max: { x: 150.0, y: 15.0, z: 200.0 }
  },
  pivot: {
    type: 'bottom-center',
    offset: { x: 0.0, y: 0.0, z: -200.0 }
  },
  collision: {
    hasCollision: true,
    numCollisionPrimitives: 1,
    collisionComplexity: 'simple',
    hasSimpleCollision: true
  },
  sockets: [
    {
      name: 'DoorSocket',
      location: { x: 0.0, y: 0.0, z: 100.0 },
      rotation: { roll: 0.0, pitch: 0.0, yaw: 0.0 },
      scale: { x: 1.0, y: 1.0, z: 1.0 }
    }
  ],
  materialSlots: [
    { slotName: 'Wall', materialPath: '/Game/ModularOldTown/Materials/M_Wall' }
  ],
  numVertices: 24,
  numTriangles: 12,
  numLODs: 1
};

// Corner piece with complex structure
export const CORNER_ASSET_RESPONSE = {
  success: true,
  assetType: 'StaticMesh',
  bounds: {
    size: { x: 300.0, y: 300.0, z: 400.0 },
    extent: { x: 150.0, y: 150.0, z: 200.0 },
    origin: { x: 0.0, y: 0.0, z: 0.0 },
    min: { x: -150.0, y: -150.0, z: -200.0 },
    max: { x: 150.0, y: 150.0, z: 200.0 }
  },
  pivot: {
    type: 'corner-bottom', 
    offset: { x: -150.0, y: -150.0, z: -200.0 }
  },
  collision: {
    hasCollision: true,
    numCollisionPrimitives: 3,
    collisionComplexity: 'simple',
    hasSimpleCollision: true
  },
  sockets: [
    {
      name: 'DoorSocket_North',
      location: { x: 0.0, y: -150.0, z: 100.0 },
      rotation: { roll: 0.0, pitch: 0.0, yaw: 0.0 }
    },
    {
      name: 'DoorSocket_East',
      location: { x: 150.0, y: 0.0, z: 100.0 },
      rotation: { roll: 0.0, pitch: 0.0, yaw: 90.0 }
    }
  ],
  materialSlots: [
    { slotName: 'Wall_North', materialPath: '/Game/ModularOldTown/Materials/M_Wall' },
    { slotName: 'Wall_East', materialPath: '/Game/ModularOldTown/Materials/M_Wall' }
  ],
  numVertices: 48,
  numTriangles: 24,
  numLODs: 3
};

// Blueprint door with components
export const BLUEPRINT_DOOR_RESPONSE = {
  success: true,
  assetType: 'Blueprint',
  blueprintClass: 'BP_Door',
  bounds: {
    size: { x: 120.0, y: 10.0, z: 250.0 },
    extent: { x: 60.0, y: 5.0, z: 125.0 },
    origin: { x: 0.0, y: 0.0, z: 0.0 },
    min: { x: -60.0, y: -5.0, z: -125.0 },
    max: { x: 60.0, y: 5.0, z: 125.0 }
  },
  pivot: {
    type: 'bottom-center',
    offset: { x: 0.0, y: 0.0, z: -125.0 }
  },
  collision: {
    hasCollision: true,
    numCollisionPrimitives: 2,
    collisionComplexity: 'simple',
    hasSimpleCollision: true
  },
  components: [
    { name: 'DoorMesh', class: 'StaticMeshComponent', meshPath: '/Game/Doors/SM_Door' },
    { name: 'DoorTrigger', class: 'BoxComponent' },
    { name: 'AudioComponent', class: 'AudioComponent' }
  ],
  sockets: [],
  materialSlots: [
    { slotName: 'DoorWood', materialPath: '/Game/Materials/M_Wood' },
    { slotName: 'DoorMetal', materialPath: '/Game/Materials/M_Metal' }
  ]
};

// Material asset response
export const MATERIAL_RESPONSE = {
  success: true,
  assetType: 'Material',
  materialProperties: {
    baseColor: { r: 0.8, g: 0.6, b: 0.4 },
    metallic: 0.0,
    roughness: 0.7,
    emissive: { r: 0.0, g: 0.0, b: 0.0 }
  },
  textureParameters: [
    { name: 'BaseColorTexture', value: '/Game/Textures/T_Wall_Diffuse' },
    { name: 'NormalTexture', value: '/Game/Textures/T_Wall_Normal' },
    { name: 'RoughnessTexture', value: '/Game/Textures/T_Wall_Roughness' }
  ],
  scalarParameters: [
    { name: 'TileScale', value: 2.0 },
    { name: 'BumpIntensity', value: 1.0 }
  ]
};

// Complex mesh with many features
export const COMPLEX_MESH_RESPONSE = {
  success: true,
  assetType: 'StaticMesh',
  bounds: {
    size: { x: 500.0, y: 800.0, z: 1200.0 },
    extent: { x: 250.0, y: 400.0, z: 600.0 },
    origin: { x: 0.0, y: 0.0, z: 50.0 },
    min: { x: -250.0, y: -400.0, z: -550.0 },
    max: { x: 250.0, y: 400.0, z: 650.0 }
  },
  pivot: {
    type: 'custom',
    offset: { x: 0.0, y: 0.0, z: 50.0 }
  },
  collision: {
    hasCollision: true,
    numCollisionPrimitives: 12,
    collisionComplexity: 'complex',
    hasSimpleCollision: true
  },
  sockets: [
    {
      name: 'AttachPoint_01',
      location: { x: 200.0, y: 0.0, z: 500.0 },
      rotation: { roll: 0.0, pitch: 0.0, yaw: 45.0 }
    },
    {
      name: 'AttachPoint_02',
      location: { x: -200.0, y: 0.0, z: 500.0 },
      rotation: { roll: 0.0, pitch: 0.0, yaw: -45.0 }
    },
    {
      name: 'SpawnPoint',
      location: { x: 0.0, y: 300.0, z: 0.0 },
      rotation: { roll: 0.0, pitch: 0.0, yaw: 180.0 }
    }
  ],
  materialSlots: [
    { slotName: 'Base', materialPath: '/Game/Materials/M_Base' },
    { slotName: 'Trim', materialPath: '/Game/Materials/M_Trim' },
    { slotName: 'Glass', materialPath: '/Game/Materials/M_Glass' },
    { slotName: 'Metal', materialPath: '/Game/Materials/M_Metal' }
  ],
  numVertices: 15420,
  numTriangles: 7830,
  numLODs: 5
};

// Asset with no collision
export const NO_COLLISION_RESPONSE = {
  success: true,
  assetType: 'StaticMesh',
  bounds: {
    size: { x: 100.0, y: 100.0, z: 100.0 },
    extent: { x: 50.0, y: 50.0, z: 50.0 },
    origin: { x: 0.0, y: 0.0, z: 0.0 },
    min: { x: -50.0, y: -50.0, z: -50.0 },
    max: { x: 50.0, y: 50.0, z: 50.0 }
  },
  pivot: {
    type: 'center',
    offset: { x: 0.0, y: 0.0, z: 0.0 }
  },
  collision: {
    hasCollision: false,
    numCollisionPrimitives: 0,
    collisionComplexity: 'none',
    hasSimpleCollision: false
  },
  sockets: [],
  materialSlots: [
    { slotName: 'Default', materialPath: null }
  ],
  numVertices: 8,
  numTriangles: 12,
  numLODs: 1
};

// Asset list response
export const ASSET_LIST_RESPONSE = {
  success: true,
  assets: [
    { name: 'SM_Wall_01', type: 'StaticMesh', path: '/Game/ModularOldTown/Meshes/SM_Wall_01' },
    { name: 'SM_Wall_02', type: 'StaticMesh', path: '/Game/ModularOldTown/Meshes/SM_Wall_02' },
    { name: 'SM_Corner_01', type: 'StaticMesh', path: '/Game/ModularOldTown/Meshes/SM_Corner_01' },
    { name: 'SM_Door_01', type: 'StaticMesh', path: '/Game/ModularOldTown/Meshes/SM_Door_01' },
    { name: 'M_Wall', type: 'Material', path: '/Game/ModularOldTown/Materials/M_Wall' }
  ]
};

// Level actors response
export const LEVEL_ACTORS_RESPONSE = {
  success: true,
  actors: [
    {
      name: 'Wall_01',
      class: 'StaticMeshActor',
      location: [1000, 2000, 100],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01'
    },
    {
      name: 'Corner_01', 
      class: 'StaticMeshActor',
      location: [1300, 2000, 100],
      rotation: [0, 0, 90],
      scale: [1, 1, 1],
      assetPath: '/Game/ModularOldTown/Meshes/SM_Corner_01'
    },
    {
      name: 'Door_01',
      class: 'Blueprint',
      location: [1150, 2000, 100],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      assetPath: '/Game/Blueprints/BP_Door'
    }
  ]
};

// Actor spawn response with validation
export const ACTOR_SPAWN_SUCCESS_RESPONSE = {
  success: true,
  actorName: 'Wall_TestSpawn',
  validated: true,
  validation_warnings: [
    'Actor placed outside recommended building bounds'
  ]
};

export const ACTOR_SPAWN_VALIDATION_ERROR_RESPONSE = {
  success: false,
  error: 'Spawn validation failed',
  validated: false,
  validation_errors: [
    'Asset not found at path /Game/Invalid/Asset',
    'Location [0, 0, 0] intersects with existing actor'
  ]
};

// Material application responses
export const MATERIAL_APPLY_SUCCESS_RESPONSE = {
  success: true,
  materialApplied: '/Game/Materials/M_Sand',
  slotIndex: 0,
  validated: true
};

// Viewport screenshot response
export const VIEWPORT_SCREENSHOT_RESPONSE = {
  success: true,
  screenshotPath: '/tmp/viewport_screenshot_20241201_143052.png',
  resolution: { width: 640, height: 360 },
  fileSize: 52840
};

// Error responses
export const ASSET_NOT_FOUND_ERROR = {
  success: false,
  error: 'Asset not found at path \'/Game/NonExistent/Asset\''
};

export const PYTHON_BRIDGE_ERROR = {
  success: false,
  error: 'Python bridge connection failed: Connection refused on port 8765'
};

export const VALIDATION_ERROR_RESPONSE = {
  success: false,
  error: 'Validation failed',
  validated: false,
  validation_errors: [
    'Asset path must start with /Game/ or /Engine/',
    'Location must be a 3-element array'
  ],
  validation_warnings: []
};
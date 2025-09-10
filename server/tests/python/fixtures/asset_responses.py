"""
Realistic asset response fixtures for testing

These fixtures contain real-world examples of asset information responses
that would come from Unreal Engine operations, used for testing formatters
and validation logic.
"""

# Static Mesh Asset Info - Wall piece from ModularOldTown
STATIC_MESH_WALL_RESPONSE = {
    "success": True,
    "assetType": "StaticMesh",
    "bounds": {
        "size": {"x": 300.0, "y": 30.0, "z": 400.0},
        "extent": {"x": 150.0, "y": 15.0, "z": 200.0},
        "origin": {"x": 0.0, "y": 0.0, "z": 0.0},
        "min": {"x": -150.0, "y": -15.0, "z": -200.0},
        "max": {"x": 150.0, "y": 15.0, "z": 200.0},
    },
    "pivot": {"type": "bottom-center", "offset": {"x": 0.0, "y": 0.0, "z": -200.0}},
    "collision": {
        "hasCollision": True,
        "numCollisionPrimitives": 1,
        "collisionComplexity": "simple",
        "hasSimpleCollision": True,
    },
    "sockets": [
        {
            "name": "DoorSocket",
            "location": {"x": 0.0, "y": 0.0, "z": 100.0},
            "rotation": {"roll": 0.0, "pitch": 0.0, "yaw": 0.0},
            "scale": {"x": 1.0, "y": 1.0, "z": 1.0},
        }
    ],
    "materialSlots": [{"slotName": "Wall", "materialPath": "/Game/ModularOldTown/Materials/M_Wall"}],
    "numVertices": 24,
    "numTriangles": 12,
    "numLODs": 1,
}

# Static Mesh Asset Info - Corner piece with complex collision
STATIC_MESH_CORNER_RESPONSE = {
    "success": True,
    "assetType": "StaticMesh",
    "bounds": {
        "size": {"x": 300.0, "y": 300.0, "z": 400.0},
        "extent": {"x": 150.0, "y": 150.0, "z": 200.0},
        "origin": {"x": 0.0, "y": 0.0, "z": 0.0},
        "min": {"x": -150.0, "y": -150.0, "z": -200.0},
        "max": {"x": 150.0, "y": 150.0, "z": 200.0},
    },
    "pivot": {"type": "corner-bottom", "offset": {"x": -150.0, "y": -150.0, "z": -200.0}},
    "collision": {
        "hasCollision": True,
        "numCollisionPrimitives": 3,
        "collisionComplexity": "simple",
        "hasSimpleCollision": True,
    },
    "sockets": [
        {
            "name": "DoorSocket_North",
            "location": {"x": 0.0, "y": -150.0, "z": 100.0},
            "rotation": {"roll": 0.0, "pitch": 0.0, "yaw": 0.0},
        },
        {
            "name": "DoorSocket_East",
            "location": {"x": 150.0, "y": 0.0, "z": 100.0},
            "rotation": {"roll": 0.0, "pitch": 0.0, "yaw": 90.0},
        },
    ],
    "materialSlots": [
        {"slotName": "Wall_North", "materialPath": "/Game/ModularOldTown/Materials/M_Wall"},
        {"slotName": "Wall_East", "materialPath": "/Game/ModularOldTown/Materials/M_Wall"},
    ],
    "numVertices": 48,
    "numTriangles": 24,
    "numLODs": 3,
}

# Blueprint Asset Info - Interactive door
BLUEPRINT_DOOR_RESPONSE = {
    "success": True,
    "assetType": "Blueprint",
    "blueprintClass": "BP_Door",
    "bounds": {
        "size": {"x": 120.0, "y": 10.0, "z": 250.0},
        "extent": {"x": 60.0, "y": 5.0, "z": 125.0},
        "origin": {"x": 0.0, "y": 0.0, "z": 0.0},
        "min": {"x": -60.0, "y": -5.0, "z": -125.0},
        "max": {"x": 60.0, "y": 5.0, "z": 125.0},
    },
    "pivot": {"type": "bottom-center", "offset": {"x": 0.0, "y": 0.0, "z": -125.0}},
    "collision": {
        "hasCollision": True,
        "numCollisionPrimitives": 2,
        "collisionComplexity": "simple",
        "hasSimpleCollision": True,
    },
    "components": [
        {"name": "DoorMesh", "class": "StaticMeshComponent", "meshPath": "/Game/Doors/SM_Door"},
        {"name": "DoorTrigger", "class": "BoxComponent"},
        {"name": "AudioComponent", "class": "AudioComponent"},
    ],
    "sockets": [],
    "materialSlots": [
        {"slotName": "DoorWood", "materialPath": "/Game/Materials/M_Wood"},
        {"slotName": "DoorMetal", "materialPath": "/Game/Materials/M_Metal"},
    ],
}

# Material Asset Info
MATERIAL_RESPONSE = {
    "success": True,
    "assetType": "Material",
    "materialProperties": {
        "baseColor": {"r": 0.8, "g": 0.6, "b": 0.4},
        "metallic": 0.0,
        "roughness": 0.7,
        "emissive": {"r": 0.0, "g": 0.0, "b": 0.0},
    },
    "textureParameters": [
        {"name": "BaseColorTexture", "value": "/Game/Textures/T_Wall_Diffuse"},
        {"name": "NormalTexture", "value": "/Game/Textures/T_Wall_Normal"},
        {"name": "RoughnessTexture", "value": "/Game/Textures/T_Wall_Roughness"},
    ],
    "scalarParameters": [{"name": "TileScale", "value": 2.0}, {"name": "BumpIntensity", "value": 1.0}],
}

# Texture Asset Info
TEXTURE_RESPONSE = {
    "success": True,
    "assetType": "Texture2D",
    "dimensions": {"width": 1024, "height": 1024},
    "format": "DXT5",
    "compressionSettings": "TC_Default",
    "sRGB": True,
    "numMips": 10,
    "fileSizeKB": 683,
    "hasAlpha": True,
}

# Asset with no collision
NO_COLLISION_RESPONSE = {
    "success": True,
    "assetType": "StaticMesh",
    "bounds": {
        "size": {"x": 100.0, "y": 100.0, "z": 100.0},
        "extent": {"x": 50.0, "y": 50.0, "z": 50.0},
        "origin": {"x": 0.0, "y": 0.0, "z": 0.0},
    },
    "pivot": {"type": "center", "offset": {"x": 0.0, "y": 0.0, "z": 0.0}},
    "collision": {
        "hasCollision": False,
        "numCollisionPrimitives": 0,
        "collisionComplexity": "none",
        "hasSimpleCollision": False,
    },
    "sockets": [],
    "materialSlots": [{"slotName": "Default", "materialPath": None}],
    "numVertices": 8,
    "numTriangles": 12,
    "numLODs": 1,
}

# Asset with many LODs and complex geometry
COMPLEX_MESH_RESPONSE = {
    "success": True,
    "assetType": "StaticMesh",
    "bounds": {
        "size": {"x": 500.0, "y": 800.0, "z": 1200.0},
        "extent": {"x": 250.0, "y": 400.0, "z": 600.0},
        "origin": {"x": 0.0, "y": 0.0, "z": 50.0},
        "min": {"x": -250.0, "y": -400.0, "z": -550.0},
        "max": {"x": 250.0, "y": 400.0, "z": 650.0},
    },
    "pivot": {"type": "custom", "offset": {"x": 0.0, "y": 0.0, "z": 50.0}},
    "collision": {
        "hasCollision": True,
        "numCollisionPrimitives": 12,
        "collisionComplexity": "complex",
        "hasSimpleCollision": True,
    },
    "sockets": [
        {
            "name": "AttachPoint_01",
            "location": {"x": 200.0, "y": 0.0, "z": 500.0},
            "rotation": {"roll": 0.0, "pitch": 0.0, "yaw": 45.0},
        },
        {
            "name": "AttachPoint_02",
            "location": {"x": -200.0, "y": 0.0, "z": 500.0},
            "rotation": {"roll": 0.0, "pitch": 0.0, "yaw": -45.0},
        },
        {
            "name": "SpawnPoint",
            "location": {"x": 0.0, "y": 300.0, "z": 0.0},
            "rotation": {"roll": 0.0, "pitch": 0.0, "yaw": 180.0},
        },
    ],
    "materialSlots": [
        {"slotName": "Base", "materialPath": "/Game/Materials/M_Base"},
        {"slotName": "Trim", "materialPath": "/Game/Materials/M_Trim"},
        {"slotName": "Glass", "materialPath": "/Game/Materials/M_Glass"},
        {"slotName": "Metal", "materialPath": "/Game/Materials/M_Metal"},
    ],
    "numVertices": 15420,
    "numTriangles": 7830,
    "numLODs": 5,
}

# Error responses for testing error handling
ASSET_NOT_FOUND_ERROR = {"success": False, "error": "Asset not found at path '/Game/NonExistent/Asset'"}

ASSET_LOAD_ERROR = {"success": False, "error": "Failed to load asset: Asset class is not StaticMesh"}

PERMISSION_ERROR = {"success": False, "error": "Access denied: Cannot read asset in protected folder"}

# Edge case responses
MINIMAL_ASSET_RESPONSE = {"success": True, "assetType": "StaticMesh"}

ASSET_WITH_LARGE_VALUES = {
    "success": True,
    "assetType": "StaticMesh",
    "bounds": {
        "size": {"x": 999999.0, "y": 999999.0, "z": 999999.0},
        "extent": {"x": 499999.5, "y": 499999.5, "z": 499999.5},
        "origin": {"x": 0.0, "y": 0.0, "z": 0.0},
    },
    "numVertices": 2000000,
    "numTriangles": 1000000,
    "numLODs": 8,
}

ASSET_WITH_SPECIAL_CHARACTERS = {
    "success": True,
    "assetType": "StaticMesh",
    "bounds": {
        "size": {"x": 100.0, "y": 100.0, "z": 100.0},
        "extent": {"x": 50.0, "y": 50.0, "z": 50.0},
        "origin": {"x": 0.0, "y": 0.0, "z": 0.0},
    },
    "materialSlots": [
        {"slotName": "Material_ñoño", "materialPath": "/Game/Materials/M_Español"},
        {"slotName": "Material_中文", "materialPath": "/Game/Materials/M_中文"},
        {"slotName": "Material_🎨", "materialPath": "/Game/Materials/M_Emoji"},
    ],
}

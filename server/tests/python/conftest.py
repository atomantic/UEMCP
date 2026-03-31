"""
pytest configuration and fixtures for Python unit tests

This file provides common fixtures and mocks for testing UEMCP Python operations
without requiring a running Unreal Engine instance.
"""

import sys
from unittest.mock import MagicMock, Mock

import pytest

# Install a base unreal mock into sys.modules at import time.
# This ensures all test files that conditionally check for "unreal"
# share the same mock object, preventing one test module from
# overwriting another's setup.  Attributes that are used with
# isinstance() must be real types, not MagicMock auto-attributes.
if "unreal" not in sys.modules:
    _base_unreal = MagicMock()
    _base_unreal.SceneComponent = type("SceneComponent", (), {})
    _base_unreal.NiagaraSystem = type("NiagaraSystem", (), {})
    sys.modules["unreal"] = _base_unreal


@pytest.fixture
def mock_unreal():
    """Mock the entire unreal module for testing without UE dependencies."""
    unreal_mock = Mock()

    # Mock common classes
    unreal_mock.Vector = Mock(side_effect=lambda x=0, y=0, z=0: Mock(x=x, y=y, z=z))
    unreal_mock.Rotator = Mock(side_effect=lambda roll=0, pitch=0, yaw=0: Mock(roll=roll, pitch=pitch, yaw=yaw))
    unreal_mock.Transform = Mock()

    # Mock asset loading
    unreal_mock.EditorAssetLibrary = Mock()

    # Mock subsystems (modern API - replaces deprecated EditorLevelLibrary)
    editor_actor_subsystem = Mock()
    level_editor_subsystem = Mock()
    unreal_editor_subsystem = Mock()
    unreal_mock.EditorActorSubsystem = Mock()
    unreal_mock.LevelEditorSubsystem = Mock()
    unreal_mock.UnrealEditorSubsystem = Mock()

    def get_editor_subsystem(subsystem_class):
        if subsystem_class == unreal_mock.EditorActorSubsystem:
            return editor_actor_subsystem
        if subsystem_class == unreal_mock.LevelEditorSubsystem:
            return level_editor_subsystem
        if subsystem_class == unreal_mock.UnrealEditorSubsystem:
            return unreal_editor_subsystem
        return Mock()

    unreal_mock.get_editor_subsystem = Mock(side_effect=get_editor_subsystem)

    # Mock common enums
    unreal_mock.TextureCompressionSettings = Mock()
    unreal_mock.TextureCompressionSettings.TC_DEFAULT = "TC_DEFAULT"
    unreal_mock.TextureCompressionSettings.TC_NORMALMAP = "TC_NORMALMAP"
    unreal_mock.TextureCompressionSettings.TC_MASKS = "TC_MASKS"
    unreal_mock.TextureCompressionSettings.TC_GRAYSCALE = "TC_GRAYSCALE"

    return unreal_mock


@pytest.fixture
def mock_actor():
    """Create a mock actor for testing."""
    actor = Mock()
    actor.get_actor_label.return_value = "TestActor"
    actor.get_actor_location.return_value = Mock(x=100, y=200, z=300)
    actor.get_actor_rotation.return_value = Mock(roll=0, pitch=0, yaw=90)
    actor.get_actor_scale3d.return_value = Mock(x=1, y=1, z=1)
    return actor


@pytest.fixture
def mock_static_mesh():
    """Create a mock static mesh for testing."""
    mesh = Mock()
    mesh.get_name.return_value = "SM_TestMesh"

    # Mock bounds
    bounds = Mock()
    bounds.box_extent = Mock(x=150, y=150, z=200)
    bounds.origin = Mock(x=0, y=0, z=0)
    mesh.get_bounds.return_value = bounds

    # Mock materials
    mesh.get_num_sections.return_value = 1
    mesh.get_material.return_value = Mock(get_name=Mock(return_value="M_TestMaterial"))

    return mesh


@pytest.fixture
def asset_info_response():
    """Sample asset info response for testing formatters."""
    return {
        "assetType": "StaticMesh",
        "bounds": {
            "size": {"x": 300, "y": 300, "z": 400},
            "extent": {"x": 150, "y": 150, "z": 200},
            "origin": {"x": 0, "y": 0, "z": 0},
        },
        "pivot": {"type": "bottom-center", "offset": {"x": 0, "y": 0, "z": -200}},
        "collision": {"hasCollision": True, "numCollisionPrimitives": 1, "collisionComplexity": "simple"},
        "sockets": [],
        "materialSlots": [{"slotName": "Default", "materialPath": "/Game/Materials/M_Default"}],
        "numVertices": 24,
        "numTriangles": 12,
        "numLODs": 1,
    }


@pytest.fixture
def validation_test_cases():
    """Test cases for validation functions."""
    return {
        "valid_location": [100, 200, 300],
        "invalid_location_short": [100, 200],
        "invalid_location_long": [100, 200, 300, 400],
        "invalid_location_non_numeric": [100, "invalid", 300],
        "valid_rotation": [0, 90, 180],
        "valid_asset_path": "/Game/Meshes/SM_Wall01",
        "invalid_asset_path": "invalid_path",
        "tolerance": 0.1,
    }


@pytest.fixture
def mock_asset_registry():
    """Mock Unreal's asset registry for asset queries."""
    registry = Mock()

    # Mock asset data
    asset_data = Mock()
    asset_data.asset_name = "SM_TestAsset"
    asset_data.asset_class = "StaticMesh"
    asset_data.object_path = "/Game/TestAssets/SM_TestAsset.SM_TestAsset"

    registry.get_assets_by_path.return_value = [asset_data]
    registry.get_asset_by_object_path.return_value = asset_data

    return registry


class MockValidationResult:
    """Mock ValidationResult for testing without imports."""

    def __init__(self, success=True, errors=None, warnings=None):
        self.success = success
        self.errors = errors or []
        self.warnings = warnings or []

    def add_error(self, error):
        self.success = False
        self.errors.append(error)

    def add_warning(self, warning):
        self.warnings.append(warning)

    def to_dict(self):
        return {"success": self.success, "errors": self.errors, "warnings": self.warnings}

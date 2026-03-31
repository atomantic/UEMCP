"""
Unit tests for material graph operations.

Tests constants without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock

if "unreal" not in sys.modules:
    mock_unreal = MagicMock()
    sys.modules["unreal"] = mock_unreal
else:
    mock_unreal = sys.modules["unreal"]

plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


class TestExpressionTypes:
    """Test _EXPRESSION_TYPES constant."""

    def test_is_dict(self):
        from ops.material_graph import _EXPRESSION_TYPES

        assert isinstance(_EXPRESSION_TYPES, dict)

    def test_has_texture_sample(self):
        from ops.material_graph import _EXPRESSION_TYPES

        assert "TextureSample" in _EXPRESSION_TYPES

    def test_has_arithmetic_operations(self):
        from ops.material_graph import _EXPRESSION_TYPES

        for op in ("Add", "Subtract", "Multiply", "Divide"):
            assert op in _EXPRESSION_TYPES, f"Missing arithmetic op: {op}"

    def test_has_parameter_types(self):
        from ops.material_graph import _EXPRESSION_TYPES

        for param in ("VectorParameter", "ScalarParameter"):
            assert param in _EXPRESSION_TYPES, f"Missing parameter type: {param}"

    def test_has_constant_types(self):
        from ops.material_graph import _EXPRESSION_TYPES

        for const in ("Constant", "Constant2Vector", "Constant3Vector", "Constant4Vector"):
            assert const in _EXPRESSION_TYPES, f"Missing constant type: {const}"

    def test_keys_are_strings(self):
        from ops.material_graph import _EXPRESSION_TYPES

        for key in _EXPRESSION_TYPES:
            assert isinstance(key, str)

    def test_has_lerp(self):
        from ops.material_graph import _EXPRESSION_TYPES

        assert "Lerp" in _EXPRESSION_TYPES

    def test_has_fresnel(self):
        from ops.material_graph import _EXPRESSION_TYPES

        assert "Fresnel" in _EXPRESSION_TYPES

    def test_has_world_position(self):
        from ops.material_graph import _EXPRESSION_TYPES

        assert "WorldPosition" in _EXPRESSION_TYPES


class TestMaterialProperties:
    """Test _MATERIAL_PROPERTIES constant."""

    def test_is_dict(self):
        from ops.material_graph import _MATERIAL_PROPERTIES

        assert isinstance(_MATERIAL_PROPERTIES, dict)

    def test_has_pbr_slots(self):
        from ops.material_graph import _MATERIAL_PROPERTIES

        for slot in ("BaseColor", "Metallic", "Roughness", "Normal", "EmissiveColor"):
            assert slot in _MATERIAL_PROPERTIES, f"Missing PBR slot: {slot}"

    def test_has_opacity_slots(self):
        from ops.material_graph import _MATERIAL_PROPERTIES

        for slot in ("Opacity", "OpacityMask"):
            assert slot in _MATERIAL_PROPERTIES, f"Missing opacity slot: {slot}"

    def test_has_specular(self):
        from ops.material_graph import _MATERIAL_PROPERTIES

        assert "Specular" in _MATERIAL_PROPERTIES

    def test_has_world_position_offset(self):
        from ops.material_graph import _MATERIAL_PROPERTIES

        assert "WorldPositionOffset" in _MATERIAL_PROPERTIES

    def test_keys_are_strings(self):
        from ops.material_graph import _MATERIAL_PROPERTIES

        for key in _MATERIAL_PROPERTIES:
            assert isinstance(key, str)

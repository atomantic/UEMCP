"""
Unit tests for animation blueprint operations.

Tests constants and pure Python logic without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock

# Mock unreal before any ops imports
if "unreal" not in sys.modules:
    mock_unreal = MagicMock()
    sys.modules["unreal"] = mock_unreal
else:
    mock_unreal = sys.modules["unreal"]

plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


class TestVariableTypeMap:
    """Test _VARIABLE_TYPE_MAP constants."""

    def test_is_dict(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        assert isinstance(_VARIABLE_TYPE_MAP, dict)

    def test_has_expected_keys(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        for key in ("bool", "int", "float", "byte", "name"):
            assert key in _VARIABLE_TYPE_MAP, f"Missing key: {key}"

    def test_values_are_strings(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        for key, value in _VARIABLE_TYPE_MAP.items():
            assert isinstance(value, str), f"Value for '{key}' should be str"

    def test_float_maps_to_real(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        assert _VARIABLE_TYPE_MAP["float"] == "real"

    def test_bool_maps_to_bool(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        assert _VARIABLE_TYPE_MAP["bool"] == "bool"

    def test_int_maps_to_int(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        assert _VARIABLE_TYPE_MAP["int"] == "int"

    def test_byte_maps_to_byte(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        assert _VARIABLE_TYPE_MAP["byte"] == "byte"

    def test_name_maps_to_name(self):
        from ops.animation import _VARIABLE_TYPE_MAP

        assert _VARIABLE_TYPE_MAP["name"] == "name"

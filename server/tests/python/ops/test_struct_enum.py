"""
Unit tests for Struct and Enum operations.

Tests PROPERTY_TYPE_MAP constants without requiring Unreal Engine.
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


class TestPropertyTypeMap:
    """Test PROPERTY_TYPE_MAP constants."""

    def test_is_dict(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        assert isinstance(PROPERTY_TYPE_MAP, dict)

    def test_has_primitive_types(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        for ptype in ("bool", "int", "float", "string", "name"):
            assert ptype in PROPERTY_TYPE_MAP, f"Missing primitive type: {ptype}"

    def test_has_numeric_types(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        for ptype in ("byte", "int64", "double"):
            assert ptype in PROPERTY_TYPE_MAP, f"Missing numeric type: {ptype}"

    def test_has_ue_struct_types(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        for ptype in ("vector", "rotator", "transform", "color"):
            assert ptype in PROPERTY_TYPE_MAP, f"Missing UE struct type: {ptype}"
            assert PROPERTY_TYPE_MAP[ptype] == "StructProperty"

    def test_has_object_types(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        for ptype in ("object", "softobject", "class"):
            assert ptype in PROPERTY_TYPE_MAP, f"Missing object type: {ptype}"

    def test_values_are_strings(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        for key, value in PROPERTY_TYPE_MAP.items():
            assert isinstance(value, str), f"Value for '{key}' should be str"

    def test_string_maps_to_str_property(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        assert PROPERTY_TYPE_MAP["string"] == "StrProperty"

    def test_bool_maps_to_bool_property(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        assert PROPERTY_TYPE_MAP["bool"] == "BoolProperty"

    def test_float_maps_to_float_property(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        assert PROPERTY_TYPE_MAP["float"] == "FloatProperty"

    def test_text_maps_to_text_property(self):
        from ops.struct_enum import PROPERTY_TYPE_MAP

        assert PROPERTY_TYPE_MAP["text"] == "TextProperty"

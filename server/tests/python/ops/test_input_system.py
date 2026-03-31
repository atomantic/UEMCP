"""
Unit tests for Enhanced Input System operations.

Tests TRIGGER_TYPE_MAP and MODIFIER_TYPE_MAP constants without requiring Unreal Engine.
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


class TestTriggerTypeMap:
    """Test TRIGGER_TYPE_MAP constant."""

    def test_is_dict(self):
        from ops.input_system import TRIGGER_TYPE_MAP

        assert isinstance(TRIGGER_TYPE_MAP, dict)

    def test_has_press_release_down(self):
        from ops.input_system import TRIGGER_TYPE_MAP

        for key in ("pressed", "released", "down"):
            assert key in TRIGGER_TYPE_MAP, f"Missing trigger: {key}"

    def test_has_hold_tap_pulse(self):
        from ops.input_system import TRIGGER_TYPE_MAP

        for key in ("hold", "tap", "pulse"):
            assert key in TRIGGER_TYPE_MAP, f"Missing trigger: {key}"

    def test_values_are_strings(self):
        from ops.input_system import TRIGGER_TYPE_MAP

        for key, value in TRIGGER_TYPE_MAP.items():
            assert isinstance(value, str), f"Value for '{key}' should be str"

    def test_pressed_maps_correctly(self):
        from ops.input_system import TRIGGER_TYPE_MAP

        assert TRIGGER_TYPE_MAP["pressed"] == "InputTriggerPressed"

    def test_released_maps_correctly(self):
        from ops.input_system import TRIGGER_TYPE_MAP

        assert TRIGGER_TYPE_MAP["released"] == "InputTriggerReleased"

    def test_down_maps_correctly(self):
        from ops.input_system import TRIGGER_TYPE_MAP

        assert TRIGGER_TYPE_MAP["down"] == "InputTriggerDown"


class TestModifierTypeMap:
    """Test MODIFIER_TYPE_MAP constant."""

    def test_is_dict(self):
        from ops.input_system import MODIFIER_TYPE_MAP

        assert isinstance(MODIFIER_TYPE_MAP, dict)

    def test_has_expected_modifiers(self):
        from ops.input_system import MODIFIER_TYPE_MAP

        for mod in ("negate", "swizzle", "scalar", "deadzone", "smooth", "response_curve"):
            assert mod in MODIFIER_TYPE_MAP, f"Missing modifier: {mod}"

    def test_values_are_strings(self):
        from ops.input_system import MODIFIER_TYPE_MAP

        for key, value in MODIFIER_TYPE_MAP.items():
            assert isinstance(value, str), f"Value for '{key}' should be str"

    def test_negate_maps_correctly(self):
        from ops.input_system import MODIFIER_TYPE_MAP

        assert MODIFIER_TYPE_MAP["negate"] == "InputModifierNegate"

    def test_deadzone_maps_correctly(self):
        from ops.input_system import MODIFIER_TYPE_MAP

        assert MODIFIER_TYPE_MAP["deadzone"] == "InputModifierDeadZone"

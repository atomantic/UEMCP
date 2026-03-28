"""
Unit tests for widget operations pure Python logic.

Tests helper functions, constant validation, and input processing
without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock, patch

# Mock the unreal module before any ops imports trigger it
# Reuse existing mock if another test file already created one (pytest imports all files during collection)
if "unreal" not in sys.modules:
    sys.modules["unreal"] = MagicMock()
mock_unreal = sys.modules["unreal"]
mock_unreal.WidgetBlueprint = type("WidgetBlueprint", (), {})
mock_unreal.CanvasPanelSlot = type("CanvasPanelSlot", (), {})
mock_unreal.SlateVisibility = MagicMock()
mock_unreal.TextJustify = MagicMock()

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


class TestSupportedConstants:
    """Test the module-level constants are well-formed."""

    def test_supported_widget_components_is_tuple(self):
        from ops.widget import SUPPORTED_WIDGET_COMPONENTS

        assert isinstance(SUPPORTED_WIDGET_COMPONENTS, tuple)
        assert len(SUPPORTED_WIDGET_COMPONENTS) > 0

    def test_supported_widget_components_has_core_types(self):
        from ops.widget import SUPPORTED_WIDGET_COMPONENTS

        core = ["TextBlock", "Button", "Image", "Slider", "CheckBox", "ProgressBar"]
        for comp in core:
            assert comp in SUPPORTED_WIDGET_COMPONENTS, f"Missing core component: {comp}"

    def test_supported_events_is_tuple(self):
        from ops.widget import SUPPORTED_EVENTS

        assert isinstance(SUPPORTED_EVENTS, tuple)
        assert len(SUPPORTED_EVENTS) > 0

    def test_supported_events_has_core_events(self):
        from ops.widget import SUPPORTED_EVENTS

        core = ["OnClicked", "OnHovered", "OnValueChanged", "OnCheckStateChanged"]
        for event in core:
            assert event in SUPPORTED_EVENTS, f"Missing core event: {event}"

    def test_visibility_map_keys(self):
        from ops.widget import VISIBILITY_MAP

        expected = ["visible", "hidden", "collapsed", "hit_test_invisible", "self_hit_test_invisible"]
        for key in expected:
            assert key in VISIBILITY_MAP, f"Missing visibility key: {key}"

    def test_justification_map_keys(self):
        from ops.widget import JUSTIFICATION_MAP

        expected = ["left", "center", "right"]
        for key in expected:
            assert key in JUSTIFICATION_MAP, f"Missing justification key: {key}"


class TestEventToDelegateProperty:
    """Test PascalCase to snake_case conversion for delegate properties."""

    def test_on_clicked(self):
        from ops.widget import _event_to_delegate_property

        assert _event_to_delegate_property("OnClicked") == "on_clicked"

    def test_on_value_changed(self):
        from ops.widget import _event_to_delegate_property

        assert _event_to_delegate_property("OnValueChanged") == "on_value_changed"

    def test_on_check_state_changed(self):
        from ops.widget import _event_to_delegate_property

        assert _event_to_delegate_property("OnCheckStateChanged") == "on_check_state_changed"

    def test_single_word(self):
        from ops.widget import _event_to_delegate_property

        assert _event_to_delegate_property("Click") == "click"

    def test_on_mouse_button_down(self):
        from ops.widget import _event_to_delegate_property

        assert _event_to_delegate_property("OnMouseButtonDown") == "on_mouse_button_down"


class TestComponentSupportsEvent:
    """Test the event support checker."""

    def test_direct_delegate_match(self):
        from ops.widget import _component_supports_event

        component = MagicMock()
        component.on_clicked = MagicMock()
        assert _component_supports_event(component, "on_clicked") is True

    def test_event_suffix_match(self):
        from ops.widget import _component_supports_event

        component = MagicMock(spec=[])
        component.on_clicked_event = MagicMock()
        assert _component_supports_event(component, "on_clicked") is True

    def test_delegate_suffix_match(self):
        from ops.widget import _component_supports_event

        component = MagicMock(spec=[])
        component.on_clicked_delegate = MagicMock()
        assert _component_supports_event(component, "on_clicked") is True

    def test_no_match(self):
        from ops.widget import _component_supports_event

        component = MagicMock(spec=[])
        assert _component_supports_event(component, "on_clicked") is False


class TestGetScreenshotPath:
    """Test platform-specific screenshot path construction."""

    def test_returns_png_path(self):
        from ops.widget import _get_screenshot_path

        with patch("ops.widget.unreal") as mock_ue:
            mock_ue.SystemLibrary.get_project_directory.return_value = "/tmp/project"
            path = _get_screenshot_path("test_file")
            assert path.endswith("test_file.png")

    def test_path_contains_screenshots_dir(self):
        from ops.widget import _get_screenshot_path

        with patch("ops.widget.unreal") as mock_ue:
            mock_ue.SystemLibrary.get_project_directory.return_value = "/tmp/project"
            path = _get_screenshot_path("test_file")
            assert "Screenshots" in path

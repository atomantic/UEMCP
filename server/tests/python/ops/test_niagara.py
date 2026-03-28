"""
Unit tests for niagara operations pure Python logic.

Tests constants, helper functions, value conversion, path resolution,
and validation logic without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Mock the unreal module before any ops imports trigger it
if "unreal" not in sys.modules:
    mock_unreal = MagicMock()
    sys.modules["unreal"] = mock_unreal
else:
    mock_unreal = sys.modules["unreal"]

# Ensure Niagara types exist on the mock so the import guard passes
mock_unreal.NiagaraSystem = type("NiagaraSystem", (), {})
mock_unreal.NiagaraEmitter = type("NiagaraEmitter", (), {})
mock_unreal.NiagaraScriptCompileStatus = MagicMock()
mock_unreal.NiagaraScriptCompileStatus.ERROR = "ERROR"
mock_unreal.NiagaraSystemFactoryNew = MagicMock
mock_unreal.NiagaraSystemEditorLibrary = MagicMock()
mock_unreal.NiagaraFunctionLibrary = MagicMock()
mock_unreal.NiagaraSpriteRendererProperties = MagicMock
mock_unreal.NiagaraMeshRendererProperties = MagicMock
mock_unreal.NiagaraRibbonRendererProperties = MagicMock
mock_unreal.NiagaraLightRendererProperties = MagicMock
mock_unreal.LinearColor = MagicMock()

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


# ---------------------------------------------------------------------------
# Constants & Registry Tests
# ---------------------------------------------------------------------------


class TestTemplatePresets:
    """Test template preset definitions are well-formed."""

    def test_template_presets_is_dict(self):
        from ops.niagara import _TEMPLATE_PRESETS

        assert isinstance(_TEMPLATE_PRESETS, dict)
        assert len(_TEMPLATE_PRESETS) > 0

    def test_all_presets_have_required_keys(self):
        from ops.niagara import _TEMPLATE_PRESETS

        for name, preset in _TEMPLATE_PRESETS.items():
            assert "description" in preset, f"Preset '{name}' missing description"
            assert "emitter_name" in preset, f"Preset '{name}' missing emitter_name"
            assert isinstance(preset["description"], str)
            assert isinstance(preset["emitter_name"], str)

    def test_expected_presets_exist(self):
        from ops.niagara import _TEMPLATE_PRESETS

        expected = ["fire", "smoke", "sparks", "rain", "snow", "dust", "explosion", "waterfall"]
        for name in expected:
            assert name in _TEMPLATE_PRESETS, f"Missing preset: {name}"

    def test_preset_keys_are_lowercase(self):
        from ops.niagara import _TEMPLATE_PRESETS

        for name in _TEMPLATE_PRESETS:
            assert name == name.lower(), f"Preset key should be lowercase: {name}"

    def test_emitter_names_are_pascal_case(self):
        from ops.niagara import _TEMPLATE_PRESETS

        for name, preset in _TEMPLATE_PRESETS.items():
            emitter = preset["emitter_name"]
            assert emitter[0].isupper(), f"Preset '{name}' emitter_name should start uppercase: {emitter}"
            assert " " not in emitter, f"Preset '{name}' emitter_name should not contain spaces: {emitter}"


class TestValidSections:
    """Test the valid emitter section constants."""

    def test_valid_sections_is_tuple(self):
        from ops.niagara import _VALID_SECTIONS

        assert isinstance(_VALID_SECTIONS, tuple)

    def test_required_sections_present(self):
        from ops.niagara import _VALID_SECTIONS

        for section in ("spawn", "update", "render"):
            assert section in _VALID_SECTIONS, f"Missing section: {section}"

    def test_section_script_map_covers_all_sections(self):
        from ops.niagara import _SECTION_SCRIPT_MAP, _VALID_SECTIONS

        for section in _VALID_SECTIONS:
            assert section in _SECTION_SCRIPT_MAP, f"Section '{section}' missing from script map"


class TestValidRendererTypes:
    """Test renderer type constants."""

    def test_valid_renderer_types_is_tuple(self):
        from ops.niagara import _VALID_RENDERER_TYPES

        assert isinstance(_VALID_RENDERER_TYPES, tuple)

    def test_required_renderer_types_present(self):
        from ops.niagara import _VALID_RENDERER_TYPES

        for rt in ("sprite", "mesh", "ribbon", "light"):
            assert rt in _VALID_RENDERER_TYPES, f"Missing renderer type: {rt}"

    def test_renderer_class_map_covers_all_types(self):
        from ops.niagara import _RENDERER_CLASS_MAP, _VALID_RENDERER_TYPES

        for rt in _VALID_RENDERER_TYPES:
            assert rt in _RENDERER_CLASS_MAP, f"Renderer type '{rt}' missing from class map"

    def test_renderer_class_names_follow_convention(self):
        from ops.niagara import _RENDERER_CLASS_MAP

        for rt, cls_name in _RENDERER_CLASS_MAP.items():
            assert cls_name.startswith("Niagara"), f"Renderer class for '{rt}' should start with 'Niagara': {cls_name}"
            assert cls_name.endswith(
                "Properties"
            ), f"Renderer class for '{rt}' should end with 'Properties': {cls_name}"


class TestValidParamTypes:
    """Test parameter value type constants."""

    def test_valid_param_types_is_tuple(self):
        from ops.niagara import _VALID_PARAM_TYPES

        assert isinstance(_VALID_PARAM_TYPES, tuple)

    def test_required_param_types_present(self):
        from ops.niagara import _VALID_PARAM_TYPES

        for pt in ("float", "int", "bool", "vector", "color", "enum"):
            assert pt in _VALID_PARAM_TYPES, f"Missing param type: {pt}"


# ---------------------------------------------------------------------------
# Helper Function Tests
# ---------------------------------------------------------------------------


class TestExtractPathParts:
    """Test asset path splitting logic."""

    def test_full_path_splits_correctly(self):
        from ops.niagara import _extract_path_parts

        package, name = _extract_path_parts("/Game/VFX/MyFire")
        assert package == "/Game/VFX"
        assert name == "MyFire"

    def test_single_name_defaults_to_game(self):
        from ops.niagara import _extract_path_parts

        package, name = _extract_path_parts("MyEffect")
        assert package == "/Game"
        assert name == "MyEffect"

    def test_deeply_nested_path(self):
        from ops.niagara import _extract_path_parts

        package, name = _extract_path_parts("/Game/VFX/Fire/Campfire/SmallFire")
        assert package == "/Game/VFX/Fire/Campfire"
        assert name == "SmallFire"

    def test_root_game_path(self):
        from ops.niagara import _extract_path_parts

        package, name = _extract_path_parts("/Game/MySystem")
        assert package == "/Game"
        assert name == "MySystem"


class TestConvertToUeValue:
    """Test Python-to-UE value conversion."""

    def test_none_returns_none(self):
        from ops.niagara import _convert_to_ue_value

        assert _convert_to_ue_value(None, "float") is None

    def test_float_conversion(self):
        from ops.niagara import _convert_to_ue_value

        result = _convert_to_ue_value(42, "float")
        assert isinstance(result, float)
        assert result == 42.0

    def test_int_conversion(self):
        from ops.niagara import _convert_to_ue_value

        result = _convert_to_ue_value(3.7, "int")
        assert isinstance(result, int)
        assert result == 3

    def test_bool_conversion(self):
        from ops.niagara import _convert_to_ue_value

        assert _convert_to_ue_value(1, "bool") is True
        assert _convert_to_ue_value(0, "bool") is False

    def test_vector_dict_calls_create_vector(self):
        from ops.niagara import _convert_to_ue_value

        with patch("ops.niagara.create_vector") as mock_cv:
            mock_cv.return_value = "mock_vector"
            result = _convert_to_ue_value({"x": 1.0, "y": 2.0, "z": 3.0}, "vector")
            mock_cv.assert_called_once_with([1.0, 2.0, 3.0])
            assert result == "mock_vector"

    def test_color_dict_creates_linear_color(self):
        from ops.niagara import _convert_to_ue_value

        _convert_to_ue_value({"r": 1.0, "g": 0.5, "b": 0.0, "a": 0.8}, "color")
        mock_unreal.LinearColor.assert_called_with(r=1.0, g=0.5, b=0.0, a=0.8)

    def test_color_dict_defaults_alpha_to_one(self):
        from ops.niagara import _convert_to_ue_value

        _convert_to_ue_value({"r": 1.0, "g": 0.5, "b": 0.0}, "color")
        mock_unreal.LinearColor.assert_called_with(r=1.0, g=0.5, b=0.0, a=1.0)

    def test_enum_converts_to_string(self):
        from ops.niagara import _convert_to_ue_value

        result = _convert_to_ue_value(42, "enum")
        assert result == "42"
        assert isinstance(result, str)

    def test_unknown_type_passes_through(self):
        from ops.niagara import _convert_to_ue_value

        result = _convert_to_ue_value("hello", "unknown")
        assert result == "hello"

    def test_vector_non_dict_passes_through(self):
        from ops.niagara import _convert_to_ue_value

        # When value is not a dict, the vector branch doesn't match
        result = _convert_to_ue_value("not_a_dict", "vector")
        assert result == "not_a_dict"


class TestResolveModulePath:
    """Test module path resolution logic."""

    def test_finds_module_in_first_candidate(self):
        from ops.niagara import _resolve_module_path

        with patch.object(
            mock_unreal.EditorAssetLibrary, "does_asset_exist", side_effect=lambda p: p == "/Niagara/Modules/SpawnRate"
        ):
            result = _resolve_module_path("SpawnRate")
            assert result == "/Niagara/Modules/SpawnRate"

    def test_finds_module_in_update_subdir(self):
        from ops.niagara import _resolve_module_path

        def exists(p):
            return p == "/Niagara/Modules/Update/ScaleColor"

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", side_effect=exists):
            result = _resolve_module_path("ScaleColor")
            assert result == "/Niagara/Modules/Update/ScaleColor"

    def test_finds_module_in_spawn_subdir(self):
        from ops.niagara import _resolve_module_path

        def exists(p):
            return p == "/Niagara/Modules/Spawn/InitialVelocity"

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", side_effect=exists):
            result = _resolve_module_path("InitialVelocity")
            assert result == "/Niagara/Modules/Spawn/InitialVelocity"

    def test_returns_none_when_not_found(self):
        from ops.niagara import _resolve_module_path

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=False):
            result = _resolve_module_path("NonexistentModule")
            assert result is None

    def test_checks_all_four_candidate_paths(self):
        from ops.niagara import _resolve_module_path

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=False) as mock_exists:
            _resolve_module_path("TestModule")
            assert mock_exists.call_count == 4
            calls = [c.args[0] for c in mock_exists.call_args_list]
            assert "/Niagara/Modules/TestModule" in calls
            assert "/Niagara/Modules/Update/TestModule" in calls
            assert "/Niagara/Modules/Spawn/TestModule" in calls
            assert "/Niagara/Modules/Render/TestModule" in calls


class TestLoadNiagaraSystem:
    """Test Niagara system asset loading and type validation."""

    def test_returns_system_when_valid(self):
        from ops.niagara import _load_niagara_system

        # Create an actual instance of the mock NiagaraSystem class so
        # the real isinstance() check in _load_niagara_system passes.
        mock_system = mock_unreal.NiagaraSystem()
        with patch("ops.niagara.require_asset", return_value=mock_system):
            result = _load_niagara_system("/Game/VFX/Test")
            assert result is mock_system

    def test_raises_on_wrong_asset_type(self):
        from ops.niagara import _load_niagara_system
        from utils.error_handling import ProcessingError

        mock_asset = MagicMock()
        mock_asset.__class__ = type("StaticMesh", (), {})
        with patch("ops.niagara.require_asset", return_value=mock_asset):
            with pytest.raises(ProcessingError, match="not a NiagaraSystem"):
                _load_niagara_system("/Game/Meshes/Cube")


class TestFindEmitterHandle:
    """Test emitter handle lookup by name."""

    def test_finds_existing_emitter(self):
        from ops.niagara import _find_emitter_handle

        handle1 = MagicMock()
        handle1.get_name.return_value = "FireEmitter"
        handle2 = MagicMock()
        handle2.get_name.return_value = "SmokeEmitter"
        mock_system = MagicMock()
        mock_system.get_emitter_handles.return_value = [handle1, handle2]

        result = _find_emitter_handle(mock_system, "SmokeEmitter")
        assert result is handle2

    def test_raises_when_emitter_not_found(self):
        from ops.niagara import _find_emitter_handle
        from utils.error_handling import ProcessingError

        handle1 = MagicMock()
        handle1.get_name.return_value = "FireEmitter"
        mock_system = MagicMock()
        mock_system.get_emitter_handles.return_value = [handle1]

        with pytest.raises(ProcessingError, match="MissingEmitter.*not found"):
            _find_emitter_handle(mock_system, "MissingEmitter")

    def test_raises_with_available_emitters_in_details(self):
        from ops.niagara import _find_emitter_handle
        from utils.error_handling import ProcessingError

        handle1 = MagicMock()
        handle1.get_name.return_value = "Alpha"
        handle2 = MagicMock()
        handle2.get_name.return_value = "Beta"
        mock_system = MagicMock()
        mock_system.get_emitter_handles.return_value = [handle1, handle2]

        with pytest.raises(ProcessingError) as exc_info:
            _find_emitter_handle(mock_system, "Gamma")
        assert "Alpha" in exc_info.value.details["available_emitters"]
        assert "Beta" in exc_info.value.details["available_emitters"]

    def test_empty_system_raises(self):
        from ops.niagara import _find_emitter_handle
        from utils.error_handling import ProcessingError

        mock_system = MagicMock()
        mock_system.get_emitter_handles.return_value = []

        with pytest.raises(ProcessingError):
            _find_emitter_handle(mock_system, "Any")


class TestGetEmitterHandles:
    """Test emitter handle list extraction."""

    def test_returns_list_from_handles(self):
        from ops.niagara import _get_emitter_handles

        h1, h2 = MagicMock(), MagicMock()
        mock_system = MagicMock()
        mock_system.get_emitter_handles.return_value = [h1, h2]

        result = _get_emitter_handles(mock_system)
        assert isinstance(result, list)
        assert len(result) == 2

    def test_returns_empty_list_when_none(self):
        from ops.niagara import _get_emitter_handles

        mock_system = MagicMock()
        mock_system.get_emitter_handles.return_value = None

        result = _get_emitter_handles(mock_system)
        assert result == []

    def test_returns_empty_list_when_empty(self):
        from ops.niagara import _get_emitter_handles

        mock_system = MagicMock()
        mock_system.get_emitter_handles.return_value = []

        result = _get_emitter_handles(mock_system)
        assert result == []


# ---------------------------------------------------------------------------
# Command Registration Tests
# ---------------------------------------------------------------------------


class TestNiagaraCommandRegistration:
    """Verify all expected Niagara tools are properly exposed."""

    def test_all_tool_functions_importable(self):
        from ops import niagara

        expected_fns = [
            "create_system",
            "add_emitter",
            "add_module",
            "configure_module",
            "set_renderer",
            "compile",
            "spawn",
            "get_metadata",
        ]
        for fn_name in expected_fns:
            assert hasattr(niagara, fn_name), f"Missing function: niagara.{fn_name}"
            assert callable(getattr(niagara, fn_name)), f"niagara.{fn_name} should be callable"

    def test_tool_count_matches_registry(self):
        """Verify the expected tool functions are all present."""
        from ops import niagara

        expected_tools = {
            "create_system",
            "add_emitter",
            "add_module",
            "configure_module",
            "set_renderer",
            "compile",
            "spawn",
            "get_metadata",
        }
        actual = {name for name in dir(niagara) if name in expected_tools}
        assert actual == expected_tools, f"Missing tools: {expected_tools - actual}"


# ---------------------------------------------------------------------------
# Validation Logic Tests (via configure_module value coercion)
# ---------------------------------------------------------------------------


class TestConvertToUeValueDictInputs:
    """Test _convert_to_ue_value with dict inputs for vector and color types."""

    def test_vector_dict_converts_via_create_vector(self):
        """Verify _convert_to_ue_value routes a vector dict through create_vector."""
        from ops.niagara import _convert_to_ue_value

        with patch("ops.niagara.create_vector") as mock_cv:
            mock_cv.return_value = "vec"
            _convert_to_ue_value({"x": 10, "y": 20, "z": 30}, "vector")
            mock_cv.assert_called_once_with([10, 20, 30])

    def test_color_dict_3_defaults_alpha(self):
        """Verify color dict with 3 components gets alpha=1.0 default."""
        from ops.niagara import _convert_to_ue_value

        _convert_to_ue_value({"r": 1.0, "g": 0.0, "b": 0.5}, "color")
        mock_unreal.LinearColor.assert_called_with(r=1.0, g=0.0, b=0.5, a=1.0)

    def test_color_dict_4_preserves_alpha(self):
        """Verify color dict with 4 components preserves custom alpha."""
        from ops.niagara import _convert_to_ue_value

        _convert_to_ue_value({"r": 1.0, "g": 0.0, "b": 0.5, "a": 0.3}, "color")
        mock_unreal.LinearColor.assert_called_with(r=1.0, g=0.0, b=0.5, a=0.3)


class TestConfigureModuleListCoercion:
    """Test configure_module's list/tuple-to-dict coercion before _convert_to_ue_value."""

    def _make_mock_system_with_module(self, module_name):
        """Build a mock system with one emitter containing one module."""
        mock_module = MagicMock()
        mock_module.get_name.return_value = module_name

        mock_script = MagicMock()
        mock_script.modules = [mock_module]

        mock_instance = MagicMock()
        # Every script attr returns the same script so the module is always found
        mock_instance.SpawnScript = mock_script
        mock_instance.UpdateScript = mock_script
        mock_instance.RenderScript = mock_script

        mock_handle = MagicMock()
        mock_handle.get_name.return_value = "TestEmitter"
        mock_handle.get_instance.return_value = mock_instance

        # Plain MagicMock with __class__ override so isinstance() passes
        mock_system = MagicMock()
        mock_system.__class__ = mock_unreal.NiagaraSystem
        mock_system.get_emitter_handles.return_value = [mock_handle]
        return mock_system, mock_module

    def test_vector_list_coerced_to_dict(self):
        """configure_module converts [x,y,z] list to dict before _convert_to_ue_value."""
        from ops.niagara import configure_module

        system, mod = self._make_mock_system_with_module("Velocity")
        with patch("ops.niagara.require_asset", return_value=system):
            with patch("ops.niagara.create_vector") as mock_cv:
                mock_cv.return_value = "vec"
                configure_module("/Game/VFX/T", "TestEmitter", "Velocity", "Speed", [1, 2, 3], "vector")
                mock_cv.assert_called_once_with([1, 2, 3])

    def test_color_tuple_3_coerced_with_default_alpha(self):
        """configure_module converts (r,g,b) tuple to dict with alpha=1.0."""
        from ops.niagara import configure_module

        system, mod = self._make_mock_system_with_module("ColorMod")
        with patch("ops.niagara.require_asset", return_value=system):
            configure_module("/Game/VFX/T", "TestEmitter", "ColorMod", "Color", (1.0, 0.0, 0.5), "color")
            mock_unreal.LinearColor.assert_called_with(r=1.0, g=0.0, b=0.5, a=1.0)

    def test_color_list_4_coerced_preserving_alpha(self):
        """configure_module converts [r,g,b,a] list to dict preserving alpha."""
        from ops.niagara import configure_module

        system, mod = self._make_mock_system_with_module("ColorMod")
        with patch("ops.niagara.require_asset", return_value=system):
            configure_module("/Game/VFX/T", "TestEmitter", "ColorMod", "Color", [1.0, 0.0, 0.5, 0.3], "color")
            mock_unreal.LinearColor.assert_called_with(r=1.0, g=0.0, b=0.5, a=0.3)


class TestSectionScriptMap:
    """Test section-to-script-attribute mapping consistency."""

    def test_spawn_maps_to_spawn_script(self):
        from ops.niagara import _SECTION_SCRIPT_MAP

        assert _SECTION_SCRIPT_MAP["spawn"] == "SpawnScript"

    def test_update_maps_to_update_script(self):
        from ops.niagara import _SECTION_SCRIPT_MAP

        assert _SECTION_SCRIPT_MAP["update"] == "UpdateScript"

    def test_render_maps_to_render_script(self):
        from ops.niagara import _SECTION_SCRIPT_MAP

        assert _SECTION_SCRIPT_MAP["render"] == "RenderScript"

    def test_all_values_end_with_script(self):
        from ops.niagara import _SECTION_SCRIPT_MAP

        for section, attr in _SECTION_SCRIPT_MAP.items():
            assert attr.endswith("Script"), f"Section '{section}' attribute should end with 'Script': {attr}"

"""
Unit tests for niagara operations pure Python logic.

Tests constants, helper functions, template definitions, and validation
logic without requiring Unreal Engine.
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
mock_unreal.NiagaraActor = MagicMock()
mock_unreal.NiagaraComponent = MagicMock()
mock_unreal.NiagaraSystemFactoryNew = MagicMock
mock_unreal.LinearColor = MagicMock()

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


# ---------------------------------------------------------------------------
# Built-in Template Tests
# ---------------------------------------------------------------------------


class TestBuiltinTemplates:
    """Test built-in Niagara template definitions are well-formed."""

    def test_builtin_templates_is_dict(self):
        from ops.niagara import _BUILTIN_TEMPLATES

        assert isinstance(_BUILTIN_TEMPLATES, dict)
        assert len(_BUILTIN_TEMPLATES) > 0

    def test_all_templates_have_required_keys(self):
        from ops.niagara import _BUILTIN_TEMPLATES

        for name, template in _BUILTIN_TEMPLATES.items():
            assert "source" in template, f"Template '{name}' missing source"
            assert "description" in template, f"Template '{name}' missing description"
            assert isinstance(template["source"], str)
            assert isinstance(template["description"], str)

    def test_expected_templates_exist(self):
        from ops.niagara import _BUILTIN_TEMPLATES

        expected = ["fountain", "burst", "explosion", "radial_burst", "minimal", "trails"]
        for name in expected:
            assert name in _BUILTIN_TEMPLATES, f"Missing template: {name}"

    def test_template_keys_are_lowercase(self):
        from ops.niagara import _BUILTIN_TEMPLATES

        for name in _BUILTIN_TEMPLATES:
            assert name == name.lower(), f"Template key should be lowercase: {name}"

    def test_source_paths_start_with_niagara(self):
        from ops.niagara import _BUILTIN_TEMPLATES

        for name, template in _BUILTIN_TEMPLATES.items():
            assert template["source"].startswith(
                "/Niagara/"
            ), f"Template '{name}' source should start with /Niagara/: {template['source']}"

    def test_template_count(self):
        from ops.niagara import _BUILTIN_TEMPLATES

        assert len(_BUILTIN_TEMPLATES) == 7


# ---------------------------------------------------------------------------
# Valid Param Types Tests
# ---------------------------------------------------------------------------


class TestValidParamTypes:
    """Test parameter value type constants."""

    def test_valid_param_types_is_tuple(self):
        from ops.niagara import _VALID_PARAM_TYPES

        assert isinstance(_VALID_PARAM_TYPES, tuple)

    def test_required_param_types_present(self):
        from ops.niagara import _VALID_PARAM_TYPES

        for pt in ("float", "int", "bool", "vector", "color"):
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


class TestLoadNiagaraSystem:
    """Test Niagara system asset loading and type validation."""

    def test_returns_system_when_valid(self):
        from ops.niagara import _load_niagara_system

        mock_system = mock_unreal.NiagaraSystem()
        with patch("ops.niagara.require_asset", return_value=mock_system):
            result = _load_niagara_system("/Game/VFX/Test")
            assert result is mock_system

    def test_raises_on_wrong_asset_type(self):
        from ops.niagara import _load_niagara_system
        from utils.error_handling import ProcessingError

        mock_asset = type("StaticMesh", (), {})()
        with patch("ops.niagara.require_asset", return_value=mock_asset):
            with pytest.raises(ProcessingError, match="not a NiagaraSystem"):
                _load_niagara_system("/Game/Meshes/Cube")


# ---------------------------------------------------------------------------
# Command Registration Tests
# ---------------------------------------------------------------------------


class TestNiagaraCommandRegistration:
    """Verify all expected Niagara tools are properly exposed."""

    def test_all_tool_functions_importable(self):
        import ops.niagara as niagara

        expected_fns = [
            "create_system",
            "spawn",
            "get_metadata",
            "compile",
            "set_parameter",
            "list_templates",
        ]
        for fn_name in expected_fns:
            assert hasattr(niagara, fn_name), f"Missing function: niagara.{fn_name}"
            assert callable(getattr(niagara, fn_name)), f"niagara.{fn_name} should be callable"

    def test_tool_count_matches_registry(self):
        """Verify the expected tool functions are all present."""
        import ops.niagara as niagara

        expected_tools = {
            "create_system",
            "spawn",
            "get_metadata",
            "compile",
            "set_parameter",
            "list_templates",
        }
        actual = {name for name in dir(niagara) if name in expected_tools}
        assert actual == expected_tools, f"Missing tools: {expected_tools - actual}"

    def test_old_broken_tools_removed(self):
        """Verify tools that relied on non-existent UE 5.7 APIs are gone."""
        import ops.niagara as niagara

        removed_fns = ["add_emitter", "add_module", "configure_module", "set_renderer"]
        for fn_name in removed_fns:
            assert not hasattr(
                niagara, fn_name
            ), f"niagara.{fn_name} should be removed (relied on non-existent UE 5.7 API)"


# ---------------------------------------------------------------------------
# create_system Tests
# ---------------------------------------------------------------------------


class TestCreateSystemValidation:
    """Test create_system input validation and template resolution."""

    def test_rejects_unknown_template(self):
        from ops.niagara import create_system

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=False):
            result = create_system("/Game/VFX/Test", template="nonexistent")
            assert result["success"] is False
            assert "Unknown template" in result["error"]

    def test_rejects_existing_asset_path(self):
        from ops.niagara import create_system

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=True):
            result = create_system("/Game/VFX/Test")
            assert result["success"] is False
            assert "already exists" in result["error"]

    def test_template_name_is_case_insensitive(self):
        from ops.niagara import _BUILTIN_TEMPLATES

        # Verify the lookup uses .lower()
        assert "fountain" in _BUILTIN_TEMPLATES
        assert "FOUNTAIN" not in _BUILTIN_TEMPLATES


class TestCreateSystemFromTemplate:
    """Test create_system duplicates from built-in templates."""

    def test_uses_duplicate_for_builtin_template(self):
        from ops.niagara import create_system

        with (
            patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=False),
            patch.object(mock_unreal.EditorAssetLibrary, "does_directory_exist", return_value=True),
            patch.object(mock_unreal.EditorAssetLibrary, "duplicate_asset", return_value=True) as mock_dup,
            patch.object(mock_unreal.EditorAssetLibrary, "save_asset"),
        ):
            result = create_system("/Game/VFX/MyFountain", template="fountain")
            assert result["success"] is True
            assert result["template"]["template"] == "fountain"
            assert "source" in result["template"]
            mock_dup.assert_called_once()

    def test_uses_factory_without_template(self):
        from ops.niagara import create_system

        mock_system = MagicMock()
        mock_asset_tools = MagicMock()
        mock_asset_tools.create_asset.return_value = mock_system

        with (
            patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=False),
            patch.object(mock_unreal.EditorAssetLibrary, "does_directory_exist", return_value=True),
            patch.object(mock_unreal.AssetToolsHelpers, "get_asset_tools", return_value=mock_asset_tools),
            patch.object(mock_unreal.EditorAssetLibrary, "save_asset"),
        ):
            result = create_system("/Game/VFX/MyEmpty")
            assert result["success"] is True
            assert "template" not in result
            mock_asset_tools.create_asset.assert_called_once()


# ---------------------------------------------------------------------------
# spawn Tests
# ---------------------------------------------------------------------------


class TestSpawnUsesEditorSubsystem:
    """Test spawn creates persistent NiagaraActor via EditorActorSubsystem."""

    def test_spawn_creates_niagara_actor(self):
        from ops.niagara import spawn

        mock_actor = MagicMock()
        mock_actor.niagara_component = MagicMock()
        mock_editor = MagicMock()
        mock_editor.spawn_actor_from_class.return_value = mock_actor
        mock_system = mock_unreal.NiagaraSystem()

        with (
            patch("ops.niagara.require_asset", return_value=mock_system),
            patch("ops.niagara.unreal.get_editor_subsystem", return_value=mock_editor),
            patch("ops.niagara.create_vector") as mock_cv,
            patch("ops.niagara.create_rotator"),
        ):
            mock_cv.return_value = MagicMock()
            result = spawn("/Game/VFX/Test", [100, 200, 300], actor_name="TestVFX")

            assert result["success"] is True
            assert result["actorName"] == "TestVFX"
            mock_editor.spawn_actor_from_class.assert_called_once()
            mock_actor.niagara_component.set_asset.assert_called_once_with(mock_system)
            mock_actor.set_actor_label.assert_called_once_with("TestVFX")

    def test_spawn_returns_error_on_failure(self):
        from ops.niagara import spawn

        mock_editor = MagicMock()
        mock_editor.spawn_actor_from_class.return_value = None
        mock_system = mock_unreal.NiagaraSystem()

        with (
            patch("ops.niagara.require_asset", return_value=mock_system),
            patch("ops.niagara.unreal.get_editor_subsystem", return_value=mock_editor),
            patch("ops.niagara.create_vector") as mock_cv,
        ):
            mock_cv.return_value = MagicMock()
            result = spawn("/Game/VFX/Test", [0, 0, 0])
            assert result["success"] is False
            assert "Failed to spawn" in result["error"]


# ---------------------------------------------------------------------------
# get_metadata Tests
# ---------------------------------------------------------------------------


class TestGetMetadata:
    """Test get_metadata reads system properties."""

    def test_returns_warmup_time(self):
        from ops.niagara import get_metadata

        mock_system = mock_unreal.NiagaraSystem()
        mock_system.get_editor_property = MagicMock(side_effect=lambda p: 2.5 if p == "warmup_time" else None)
        mock_system.get_name = MagicMock(return_value="NS_Test")

        with patch("ops.niagara.require_asset", return_value=mock_system):
            result = get_metadata("/Game/VFX/NS_Test")
            assert result["success"] is True
            assert result["systemInfo"]["warmupTime"] == 2.5
            assert result["assetName"] == "NS_Test"


# ---------------------------------------------------------------------------
# list_templates Tests
# ---------------------------------------------------------------------------


class TestListTemplates:
    """Test list_templates returns available built-in templates."""

    def test_returns_all_templates(self):
        from ops.niagara import list_templates

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=True):
            result = list_templates()
            assert result["success"] is True
            assert result["count"] == 7
            names = [t["name"] for t in result["templates"]]
            assert "fountain" in names
            assert "explosion" in names

    def test_marks_unavailable_templates(self):
        from ops.niagara import list_templates

        with patch.object(mock_unreal.EditorAssetLibrary, "does_asset_exist", return_value=False):
            result = list_templates()
            for t in result["templates"]:
                assert t["available"] is False


# ---------------------------------------------------------------------------
# set_parameter Tests
# ---------------------------------------------------------------------------


class TestSetParameter:
    """Test set_parameter value coercion and validation."""

    def _make_actor_with_component(self):
        """Helper: return a mock actor with a niagara_component."""
        nc = MagicMock()
        actor = MagicMock()
        actor.get_actor_label.return_value = "TestVFX"
        actor.niagara_component = nc
        return actor, nc

    def _patch_editor(self, actor):
        """Helper: patch EditorActorSubsystem to return [actor]."""
        mock_editor = MagicMock()
        mock_editor.get_all_level_actors.return_value = [actor]
        return patch("ops.niagara.unreal.get_editor_subsystem", return_value=mock_editor)

    def test_float_calls_set_variable_float(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor):
            result = set_parameter("TestVFX", "SpawnRate", value=42.0, value_type="float")
            assert result["success"] is True
            nc.set_variable_float.assert_called_once_with("SpawnRate", 42.0)

    def test_int_calls_set_variable_int(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor):
            result = set_parameter("TestVFX", "Count", value=10, value_type="int")
            assert result["success"] is True
            nc.set_variable_int.assert_called_once_with("Count", 10)

    def test_bool_true(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor):
            result = set_parameter("TestVFX", "Enabled", value=True, value_type="bool")
            assert result["success"] is True
            nc.set_variable_bool.assert_called_once_with("Enabled", True)

    def test_bool_rejects_string(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor):
            result = set_parameter("TestVFX", "Enabled", value="false", value_type="bool")
            assert result["success"] is False
            assert "Bool value" in result["error"]

    def test_vector_list(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor), patch("ops.niagara.create_vector") as mock_cv:
            mock_cv.return_value = "mock_vec"
            result = set_parameter("TestVFX", "Vel", value=[1, 2, 3], value_type="vector")
            assert result["success"] is True
            nc.set_variable_vec3.assert_called_once()

    def test_vector_dict_missing_key(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor):
            result = set_parameter("TestVFX", "Vel", value={"x": 1, "y": 2}, value_type="vector")
            assert result["success"] is False
            assert "missing required key" in result["error"]

    def test_color_tuple_rgb(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor):
            result = set_parameter("TestVFX", "Col", value=[1.0, 0.5, 0.0], value_type="color")
            assert result["success"] is True
            nc.set_variable_linear_color.assert_called_once()

    def test_actor_not_found(self):
        from ops.niagara import set_parameter

        mock_editor = MagicMock()
        mock_editor.get_all_level_actors.return_value = []
        with patch("ops.niagara.unreal.get_editor_subsystem", return_value=mock_editor):
            result = set_parameter("Missing", "Param", value=1.0, value_type="float")
            assert result["success"] is False
            assert "not found" in result["error"]

    def test_invalid_value_type(self):
        from ops.niagara import set_parameter

        actor, nc = self._make_actor_with_component()
        with self._patch_editor(actor):
            result = set_parameter("TestVFX", "Param", value=1, value_type="quaternion")
            assert result["success"] is False
            assert "Invalid value_type" in result["error"]

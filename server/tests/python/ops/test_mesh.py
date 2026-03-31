"""
Unit tests for Mesh and LOD management operations.

Tests _get_bounds_dict pure logic without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock

import pytest

if "unreal" not in sys.modules:
    mock_unreal = MagicMock()
    sys.modules["unreal"] = mock_unreal
else:
    mock_unreal = sys.modules["unreal"]

# Ensure StaticMesh type exists for isinstance checks
mock_unreal.StaticMesh = type("StaticMesh", (), {})

plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


def _make_mesh_bounds(ox=0.0, oy=0.0, oz=0.0, ex=50.0, ey=50.0, ez=100.0):
    origin = MagicMock()
    origin.x = ox
    origin.y = oy
    origin.z = oz
    extent = MagicMock()
    extent.x = ex
    extent.y = ey
    extent.z = ez
    bounds = MagicMock()
    bounds.origin = origin
    bounds.box_extent = extent
    mesh = MagicMock()
    mesh.get_bounds.return_value = bounds
    return mesh


class TestGetBoundsDict:
    """Test _get_bounds_dict extracts bounding box correctly."""

    def test_origin_keys(self):
        from ops.mesh import _get_bounds_dict

        mesh = _make_mesh_bounds()
        result = _get_bounds_dict(mesh)
        assert "origin" in result
        assert set(result["origin"].keys()) == {"x", "y", "z"}

    def test_extent_keys(self):
        from ops.mesh import _get_bounds_dict

        mesh = _make_mesh_bounds()
        result = _get_bounds_dict(mesh)
        assert "extent" in result
        assert set(result["extent"].keys()) == {"x", "y", "z"}

    def test_origin_values_are_floats(self):
        from ops.mesh import _get_bounds_dict

        mesh = _make_mesh_bounds(ox=10, oy=20, oz=30)
        result = _get_bounds_dict(mesh)
        assert isinstance(result["origin"]["x"], float)
        assert isinstance(result["origin"]["y"], float)
        assert isinstance(result["origin"]["z"], float)

    def test_extent_values_are_floats(self):
        from ops.mesh import _get_bounds_dict

        mesh = _make_mesh_bounds(ex=100, ey=200, ez=300)
        result = _get_bounds_dict(mesh)
        assert isinstance(result["extent"]["x"], float)
        assert isinstance(result["extent"]["y"], float)
        assert isinstance(result["extent"]["z"], float)

    def test_origin_values_correct(self):
        from ops.mesh import _get_bounds_dict

        mesh = _make_mesh_bounds(ox=1.5, oy=2.5, oz=3.5)
        result = _get_bounds_dict(mesh)
        assert result["origin"]["x"] == pytest.approx(1.5)
        assert result["origin"]["y"] == pytest.approx(2.5)
        assert result["origin"]["z"] == pytest.approx(3.5)

    def test_extent_values_correct(self):
        from ops.mesh import _get_bounds_dict

        mesh = _make_mesh_bounds(ex=50.0, ey=75.0, ez=100.0)
        result = _get_bounds_dict(mesh)
        assert result["extent"]["x"] == pytest.approx(50.0)
        assert result["extent"]["y"] == pytest.approx(75.0)
        assert result["extent"]["z"] == pytest.approx(100.0)

    def test_zero_bounds(self):
        from ops.mesh import _get_bounds_dict

        mesh = _make_mesh_bounds(ox=0, oy=0, oz=0, ex=0, ey=0, ez=0)
        result = _get_bounds_dict(mesh)
        assert result["origin"]["x"] == 0.0
        assert result["extent"]["z"] == 0.0

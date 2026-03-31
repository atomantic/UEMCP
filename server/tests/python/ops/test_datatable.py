"""
Unit tests for DataTable operations.

Tests _row_names_list pure logic without requiring Unreal Engine.
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


class TestRowNamesList:
    """Test _row_names_list helper returns string list."""

    def _make_datatable(self, keys):
        dt = MagicMock()
        dt.get_editor_property.return_value = {k: object() for k in keys}
        return dt

    def test_empty_datatable(self):
        from ops.datatable import _row_names_list

        dt = self._make_datatable([])
        assert _row_names_list(dt) == []

    def test_single_row(self):
        from ops.datatable import _row_names_list

        dt = self._make_datatable(["Row1"])
        result = _row_names_list(dt)
        assert result == ["Row1"]

    def test_multiple_rows(self):
        from ops.datatable import _row_names_list

        dt = self._make_datatable(["Alpha", "Beta", "Gamma"])
        result = _row_names_list(dt)
        assert set(result) == {"Alpha", "Beta", "Gamma"}

    def test_returns_strings(self):
        from ops.datatable import _row_names_list

        dt = self._make_datatable([1, 2, 3])
        result = _row_names_list(dt)
        for item in result:
            assert isinstance(item, str)

    def test_calls_get_editor_property_with_row_map(self):
        from ops.datatable import _row_names_list

        dt = MagicMock()
        dt.get_editor_property.return_value = {}
        _row_names_list(dt)
        dt.get_editor_property.assert_called_once_with("row_map")

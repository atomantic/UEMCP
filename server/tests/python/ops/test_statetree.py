"""
Unit tests for StateTree AI operations.

Tests constants and pure Python helpers without requiring Unreal Engine.
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


class TestSchemaTypes:
    """Test _SCHEMA_TYPES constant."""

    def test_is_dict(self):
        from ops.statetree import _SCHEMA_TYPES

        assert isinstance(_SCHEMA_TYPES, dict)

    def test_has_expected_schemas(self):
        from ops.statetree import _SCHEMA_TYPES

        for schema in ("AIController", "SmartObject", "Component", "Actor"):
            assert schema in _SCHEMA_TYPES, f"Missing schema: {schema}"

    def test_values_are_strings(self):
        from ops.statetree import _SCHEMA_TYPES

        for _key, value in _SCHEMA_TYPES.items():
            assert isinstance(value, str)

    def test_ai_controller_schema(self):
        from ops.statetree import _SCHEMA_TYPES

        assert _SCHEMA_TYPES["AIController"] == "StateTreeAIComponentSchema"


class TestTaskTypes:
    """Test _TASK_TYPES constant."""

    def test_is_dict(self):
        from ops.statetree import _TASK_TYPES

        assert isinstance(_TASK_TYPES, dict)

    def test_has_move_to(self):
        from ops.statetree import _TASK_TYPES

        assert "MoveTo" in _TASK_TYPES
        assert _TASK_TYPES["MoveTo"] == "StateTreeMoveToTask"

    def test_has_wait(self):
        from ops.statetree import _TASK_TYPES

        assert "Wait" in _TASK_TYPES

    def test_has_play_animation(self):
        from ops.statetree import _TASK_TYPES

        assert "PlayAnimation" in _TASK_TYPES

    def test_values_are_strings(self):
        from ops.statetree import _TASK_TYPES

        for _key, value in _TASK_TYPES.items():
            assert isinstance(value, str)


class TestEvaluatorTypes:
    """Test _EVALUATOR_TYPES constant."""

    def test_is_dict(self):
        from ops.statetree import _EVALUATOR_TYPES

        assert isinstance(_EVALUATOR_TYPES, dict)

    def test_has_expected_evaluators(self):
        from ops.statetree import _EVALUATOR_TYPES

        for ev in ("AIController", "ActorComponent", "SmartObjectSlot"):
            assert ev in _EVALUATOR_TYPES, f"Missing evaluator: {ev}"

    def test_values_are_strings(self):
        from ops.statetree import _EVALUATOR_TYPES

        for _key, value in _EVALUATOR_TYPES.items():
            assert isinstance(value, str)


class TestTransitionConstants:
    """Test _TRANSITION_TRIGGERS and _TRANSITION_TARGETS sets."""

    def test_triggers_is_set(self):
        from ops.statetree import _TRANSITION_TRIGGERS

        assert isinstance(_TRANSITION_TRIGGERS, set)

    def test_targets_is_set(self):
        from ops.statetree import _TRANSITION_TARGETS

        assert isinstance(_TRANSITION_TARGETS, set)

    def test_has_expected_triggers(self):
        from ops.statetree import _TRANSITION_TRIGGERS

        for trigger in ("OnCompleted", "OnFailed", "OnCondition"):
            assert trigger in _TRANSITION_TRIGGERS, f"Missing trigger: {trigger}"

    def test_has_expected_targets(self):
        from ops.statetree import _TRANSITION_TARGETS

        for target in ("NextState", "ParentState", "TreeSucceeded", "TreeFailed"):
            assert target in _TRANSITION_TARGETS, f"Missing target: {target}"


class TestResolveTaskClass:
    """Test _resolve_task_class helper."""

    def test_known_task_from_map(self):
        from ops.statetree import _TASK_TYPES, _resolve_task_class

        for task_type, class_name in _TASK_TYPES.items():
            sentinel = object()
            setattr(mock_unreal, class_name, sentinel)
            result = _resolve_task_class(task_type)
            assert result is sentinel, f"_resolve_task_class('{task_type}') should return unreal.{class_name}"

    def test_move_to_resolves(self):
        from ops.statetree import _resolve_task_class

        sentinel = object()
        mock_unreal.StateTreeMoveToTask = sentinel
        result = _resolve_task_class("MoveTo")
        assert result is sentinel


class TestResolveEvaluatorClass:
    """Test _resolve_evaluator_class helper."""

    def test_known_evaluator_from_map(self):
        from ops.statetree import _EVALUATOR_TYPES, _resolve_evaluator_class

        for ev_type, class_name in _EVALUATOR_TYPES.items():
            sentinel = object()
            setattr(mock_unreal, class_name, sentinel)
            result = _resolve_evaluator_class(ev_type)
            assert result is sentinel, f"_resolve_evaluator_class('{ev_type}') should return unreal.{class_name}"

    def test_ai_controller_evaluator_resolves(self):
        from ops.statetree import _resolve_evaluator_class

        sentinel = object()
        mock_unreal.StateTreeAIControllerEvaluator = sentinel
        result = _resolve_evaluator_class("AIController")
        assert result is sentinel

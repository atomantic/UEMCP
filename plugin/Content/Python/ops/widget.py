"""
UMG Widget operations for creating and manipulating Widget Blueprints,
adding UI components, configuring layout, binding events, and inspecting widgets.
"""

import os
import platform as py_platform
import time
from typing import Any, Optional

import unreal

from utils.blueprint_helpers import compile_blueprint as _compile_bp
from utils.error_handling import (
    AssetPathRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    require_asset,
    safe_operation,
    validate_inputs,
)
from utils.general import get_unreal_editor_subsystem, log_debug

SUPPORTED_WIDGET_COMPONENTS = (
    "TextBlock",
    "Button",
    "Image",
    "Slider",
    "CheckBox",
    "ProgressBar",
    "ScrollBox",
    "HorizontalBox",
    "VerticalBox",
    "CanvasPanel",
    "Border",
    "Overlay",
    "SizeBox",
    "ScaleBox",
    "Spacer",
    "EditableText",
    "EditableTextBox",
    "RichTextBlock",
    "ComboBoxString",
    "SpinBox",
    "CircularThrobber",
    "Throbber",
    "GridPanel",
    "UniformGridPanel",
    "WrapBox",
    "WidgetSwitcher",
    "InvalidationBox",
    "RetainerBox",
    "ListView",
    "TileView",
    "TreeView",
    "ExpandableArea",
)

SUPPORTED_EVENTS = (
    "OnClicked",
    "OnPressed",
    "OnReleased",
    "OnHovered",
    "OnUnhovered",
    "OnValueChanged",
    "OnCheckStateChanged",
    "OnMouseButtonDown",
    "OnMouseButtonUp",
    "OnMouseEnter",
    "OnMouseLeave",
    "OnFocusReceived",
    "OnFocusLost",
    "OnKeyDown",
    "OnKeyUp",
    "OnTextChanged",
    "OnTextCommitted",
    "OnSelectionChanged",
    "OnExpansionChanged",
    "OnScrollBarVisibilityChanged",
)

VISIBILITY_MAP = {
    "visible": unreal.SlateVisibility.VISIBLE,
    "hidden": unreal.SlateVisibility.HIDDEN,
    "collapsed": unreal.SlateVisibility.COLLAPSED,
    "hit_test_invisible": unreal.SlateVisibility.HIT_TEST_INVISIBLE,
    "self_hit_test_invisible": unreal.SlateVisibility.SELF_HIT_TEST_INVISIBLE,
}

JUSTIFICATION_MAP = {
    "left": unreal.TextJustify.LEFT,
    "center": unreal.TextJustify.CENTER,
    "right": unreal.TextJustify.RIGHT,
}


def _resolve_widget_blueprint(widget_path: str):
    """Load and validate a Widget Blueprint asset."""
    asset = require_asset(widget_path)
    if not isinstance(asset, unreal.WidgetBlueprint):
        raise ProcessingError(
            f"Asset is not a Widget Blueprint: {widget_path} (type: {type(asset).__name__})",
            operation="widget",
            details={"widget_path": widget_path, "actual_type": type(asset).__name__},
        )
    return asset


def _find_widget_component(widget_bp, component_name: str):
    """Find a named component inside a Widget Blueprint's widget tree."""
    widget_tree = widget_bp.widget_tree
    if not widget_tree:
        raise ProcessingError(
            "Widget Blueprint has no widget tree",
            operation="widget",
            details={"widget_path": widget_bp.get_path_name()},
        )

    all_widgets = widget_tree.get_all_widgets()
    for w in all_widgets:
        if w and w.get_name() == component_name:
            return w

    raise ProcessingError(
        f"Component '{component_name}' not found in widget",
        operation="widget",
        details={
            "component_name": component_name,
            "available": [w.get_name() for w in all_widgets if w],
        },
    )


def _compile_and_save_widget(widget_bp, widget_path: str):
    """Compile and save a Widget Blueprint."""
    _compile_bp(widget_bp)
    unreal.EditorAssetLibrary.save_asset(widget_path)
    log_debug(f"Saved Widget Blueprint: {widget_path}")


def _get_component_class(component_type: str):
    """Resolve a component type name to its UE class."""
    if component_type not in SUPPORTED_WIDGET_COMPONENTS:
        raise ProcessingError(
            f"Unsupported widget component type: {component_type}",
            operation="widget_add_component",
            details={
                "component_type": component_type,
                "supported": list(SUPPORTED_WIDGET_COMPONENTS),
            },
        )

    class_path = f"/Script/UMG.{component_type}"
    cls = unreal.load_class(None, class_path)
    if not cls:
        raise ProcessingError(
            f"Could not load UE class for component type: {component_type}",
            operation="widget_add_component",
            details={"component_type": component_type, "class_path": class_path},
        )
    return cls


def _get_screenshot_path(prefix: str) -> str:
    """Build platform-specific screenshot output path."""
    project_path = unreal.SystemLibrary.get_project_directory()
    system = py_platform.system()
    if system == "Darwin":
        subdir = "MacEditor"
    elif system == "Windows":
        subdir = "WindowsEditor"
    else:
        subdir = "LinuxEditor"
    return os.path.join(project_path, "Saved", "Screenshots", subdir, f"{prefix}.png")


def _event_to_delegate_property(event_name: str) -> str:
    """Convert PascalCase event name to snake_case delegate property name."""
    result = []
    for i, char in enumerate(event_name):
        if char.isupper() and i > 0:
            result.append("_")
        result.append(char.lower())
    return "".join(result)


def _component_supports_event(component, delegate_prop: str) -> bool:
    """Check if a component supports a given event delegate."""
    for suffix in ("", "_event", "_delegate"):
        if hasattr(component, f"{delegate_prop}{suffix}"):
            return True
    return False


def _get_widget_type_name(widget) -> str:
    """Get a human-readable type name for a widget."""
    if hasattr(widget, "get_class"):
        return widget.get_class().get_name()
    return type(widget).__name__


def _validate_panel_widget(widget, label: str, operation: str, extra_details: dict):
    """Validate that a widget is a PanelWidget that can accept children."""
    if not isinstance(widget, unreal.PanelWidget):
        widget_type = _get_widget_type_name(widget)
        raise ProcessingError(
            f"{label} is of type '{widget_type}' and cannot accept child widgets",
            operation=operation,
            details={**extra_details, "widget_type": widget_type},
        )


def _deduplicate_bindings(bindings, object_name: str, property_name):
    """Remove existing bindings for a component/property pair to prevent duplicates.

    Uses str() coercion for comparisons since binding attributes may be unreal.Name
    rather than plain str.
    """
    target_prop = str(property_name)
    target_obj = str(object_name)
    return [
        b
        for b in bindings
        if not (
            str(getattr(b, "object_name", "")) == target_obj and str(getattr(b, "property_name", "")) == target_prop
        )
    ]


def _try_get_editor_property(component, prop_name: str):
    """Try to get an editor property, returning None on failure."""
    try:
        return component.get_editor_property(prop_name)
    except (AttributeError, TypeError, RuntimeError):
        return None


def _resolve_parent_class(parent_class: str):
    """Resolve a parent class name to a UE class, raising ProcessingError on failure."""
    if "/" in parent_class:
        parent_asset = unreal.EditorAssetLibrary.load_asset(parent_class)
        if parent_asset and isinstance(parent_asset, unreal.Blueprint):
            return parent_asset.generated_class()
        raise ProcessingError(
            f"Parent class not found: {parent_class}",
            operation="widget_create",
            details={"parent_class": parent_class},
        )

    parent_cls = unreal.load_class(None, f"/Script/UMG.{parent_class}")
    if not parent_cls:
        parent_cls = unreal.load_class(None, f"/Script/Engine.{parent_class}")
    if parent_cls:
        return parent_cls
    raise ProcessingError(
        f"Parent class not found: {parent_class}",
        operation="widget_create",
        details={"parent_class": parent_class},
    )


@validate_inputs(
    {
        "widget_name": [RequiredRule(), TypeRule(str)],
        "target_folder": [RequiredRule(), TypeRule(str)],
        "parent_class": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("widget_create")
@safe_operation("widget")
def create(
    widget_name: str,
    target_folder: str = "/Game/UI",
    parent_class: Optional[str] = None,
) -> dict[str, Any]:
    """Create a new Widget Blueprint with optional parent class.

    Args:
        widget_name: Name for the new Widget Blueprint
        target_folder: Destination folder in content browser
        parent_class: Parent widget class path (defaults to UserWidget)
    """
    if not unreal.EditorAssetLibrary.does_directory_exist(target_folder):
        unreal.EditorAssetLibrary.make_directory(target_folder)

    asset_path = f"{target_folder}/{widget_name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"Widget Blueprint already exists at {asset_path}",
            operation="widget_create",
            details={"asset_path": asset_path},
        )

    factory = unreal.WidgetBlueprintFactory()

    if parent_class:
        resolved_cls = _resolve_parent_class(parent_class)
        factory.set_editor_property("parent_class", resolved_cls)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    created_asset = asset_tools.create_asset(
        widget_name,
        target_folder,
        unreal.WidgetBlueprint,
        factory,
    )

    if not created_asset:
        raise ProcessingError(
            f"Failed to create Widget Blueprint: {widget_name}",
            operation="widget_create",
            details={"widget_name": widget_name, "target_folder": target_folder},
        )

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Created Widget Blueprint: {asset_path}")

    resolved_parent = "UserWidget"
    if created_asset.parent_class:
        resolved_parent = created_asset.parent_class.get_name()

    return {
        "success": True,
        "widgetPath": asset_path,
        "widgetName": widget_name,
        "parentClass": resolved_parent,
    }


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "component_type": [RequiredRule(), TypeRule(str)],
        "component_name": [RequiredRule(), TypeRule(str)],
        "parent_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("widget_add_component")
@safe_operation("widget")
def add_component(
    widget_path: str,
    component_type: str,
    component_name: str,
    parent_name: Optional[str] = None,
) -> dict[str, Any]:
    """Add a UI component to a Widget Blueprint.

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_type: Type of component (TextBlock, Button, Image, Slider,
                        CheckBox, ProgressBar, ScrollBox, HorizontalBox,
                        VerticalBox, CanvasPanel, Border, Overlay, SizeBox, etc.)
        component_name: Unique name for the new component
        parent_name: Optional parent component name to nest under
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    widget_tree = widget_bp.widget_tree
    if not widget_tree:
        raise ProcessingError(
            "Widget Blueprint has no widget tree",
            operation="widget_add_component",
            details={"widget_path": widget_path},
        )

    # Single pass: check name collision and find parent
    all_widgets = widget_tree.get_all_widgets()
    parent_widget = None
    for w in all_widgets:
        if not w:
            continue
        name = w.get_name()
        if name == component_name:
            raise ProcessingError(
                f"Component '{component_name}' already exists in widget",
                operation="widget_add_component",
                details={"component_name": component_name},
            )
        if parent_name and name == parent_name:
            parent_widget = w

    if parent_name and parent_widget is None:
        raise ProcessingError(
            f"Parent component '{parent_name}' not found in widget",
            operation="widget_add_component",
            details={
                "parent_name": parent_name,
                "available": [w.get_name() for w in all_widgets if w],
            },
        )

    component_class = _get_component_class(component_type)
    new_widget = widget_tree.construct_widget(component_class)
    if not new_widget:
        raise ProcessingError(
            f"Failed to construct widget of type: {component_type}",
            operation="widget_add_component",
            details={"component_type": component_type},
        )

    new_widget.set_editor_property("name", component_name)

    if parent_widget:
        _validate_panel_widget(
            parent_widget,
            f"Parent component '{parent_name}'",
            "widget_add_component",
            {
                "parent_name": parent_name,
                "component_name": component_name,
                "component_type": component_type,
            },
        )
        slot = parent_widget.add_child(new_widget)
    else:
        root = widget_tree.root_widget
        if root:
            _validate_panel_widget(
                root,
                "Root widget",
                "widget_add_component",
                {
                    "component_name": component_name,
                    "component_type": component_type,
                },
            )
            slot = root.add_child(new_widget)
        else:
            widget_tree.set_editor_property("root_widget", new_widget)
            slot = None

    _compile_and_save_widget(widget_bp, widget_path)
    log_debug(f"Added {component_type} '{component_name}' to {widget_path}")

    return {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "componentType": component_type,
        "parentName": parent_name,
        "hasSlot": slot is not None,
    }


def _apply_canvas_position(slot, position):
    """Apply position to a CanvasPanelSlot."""
    current_offsets = slot.get_offsets()
    current_offsets.left = float(position[0])
    current_offsets.top = float(position[1])
    slot.set_offsets(current_offsets)


def _apply_render_position(component, position):
    """Apply position via render_transform, preserving existing scale/rotation/shear."""
    current_transform = component.get_editor_property("render_transform")
    if current_transform is None:
        current_transform = unreal.WidgetTransform()
    current_transform.translation = unreal.Vector2D(float(position[0]), float(position[1]))
    component.set_editor_property("render_transform", current_transform)


def _apply_canvas_size(slot, size):
    """Apply size to a CanvasPanelSlot."""
    current_offsets = slot.get_offsets()
    current_offsets.right = float(size[0])
    current_offsets.bottom = float(size[1])
    slot.set_offsets(current_offsets)


def _apply_canvas_anchors(slot, anchors):
    """Apply anchors to a CanvasPanelSlot."""
    anchor = unreal.Anchors()
    anchor.minimum = unreal.Vector2D(
        float(anchors.get("min_x", 0.0)),
        float(anchors.get("min_y", 0.0)),
    )
    anchor.maximum = unreal.Vector2D(
        float(anchors.get("max_x", 0.0)),
        float(anchors.get("max_y", 0.0)),
    )
    slot.set_anchors(anchor)


def _validate_list_length(value, min_length, name, operation):
    """Validate a list has the required minimum length."""
    if len(value) < min_length:
        raise ProcessingError(
            f"{name} must have at least {min_length} elements",
            operation=operation,
            details={name: value},
        )


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "component_name": [RequiredRule(), TypeRule(str)],
        "position": [TypeRule(list, allow_none=True)],
        "size": [TypeRule(list, allow_none=True)],
        "anchors": [TypeRule(dict, allow_none=True)],
        "alignment": [TypeRule(list, allow_none=True)],
        "z_order": [TypeRule(int, allow_none=True)],
    }
)
@handle_unreal_errors("widget_set_layout")
@safe_operation("widget")
def set_layout(
    widget_path: str,
    component_name: str,
    position: Optional[list[float]] = None,
    size: Optional[list[float]] = None,
    anchors: Optional[dict[str, float]] = None,
    alignment: Optional[list[float]] = None,
    z_order: Optional[int] = None,
) -> dict[str, Any]:
    """Set layout properties for a widget component (position, size, anchors, z-order, alignment).

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to modify
        position: Position offset [X, Y] in pixels
        size: Size [Width, Height] in pixels
        anchors: Anchor settings {min_x, min_y, max_x, max_y} (0.0-1.0)
        alignment: Alignment pivot [X, Y] (0.0-1.0, where 0.5 is center)
        z_order: Rendering z-order (higher renders on top)
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    component = _find_widget_component(widget_bp, component_name)

    changes = []
    skipped = []

    slot = component.slot
    is_canvas_slot = slot and isinstance(slot, unreal.CanvasPanelSlot)

    if position is not None:
        _validate_list_length(position, 2, "position", "widget_set_layout")
        if is_canvas_slot:
            _apply_canvas_position(slot, position)
            changes.append("position")
        else:
            _apply_render_position(component, position)
            changes.append("render_transform_position")

    if size is not None:
        _validate_list_length(size, 2, "size", "widget_set_layout")
        if is_canvas_slot:
            _apply_canvas_size(slot, size)
            changes.append("size")
        else:
            skipped.append("size (requires CanvasPanelSlot)")

    if anchors is not None:
        if is_canvas_slot:
            _apply_canvas_anchors(slot, anchors)
            changes.append("anchors")
        else:
            skipped.append("anchors (requires CanvasPanelSlot)")

    if alignment is not None:
        _validate_list_length(alignment, 2, "alignment", "widget_set_layout")
        if is_canvas_slot:
            slot.set_alignment(unreal.Vector2D(float(alignment[0]), float(alignment[1])))
            changes.append("alignment")
        else:
            skipped.append("alignment (requires CanvasPanelSlot)")

    if z_order is not None:
        if is_canvas_slot:
            slot.set_z_order(z_order)
            changes.append("z_order")
        else:
            skipped.append("z_order (requires CanvasPanelSlot)")

    _compile_and_save_widget(widget_bp, widget_path)
    log_debug(f"Updated layout for '{component_name}' in {widget_path}: {changes}")

    result: dict[str, Any] = {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "changes": changes,
        "isCanvasSlot": is_canvas_slot,
    }
    if skipped:
        result["skipped"] = skipped
        result["warning"] = f"Some layout properties require a CanvasPanelSlot: {skipped}"
    return result


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "component_name": [RequiredRule(), TypeRule(str)],
        "properties": [RequiredRule(), TypeRule(dict)],
    }
)
@handle_unreal_errors("widget_set_property")
@safe_operation("widget")
def set_property(
    widget_path: str,
    component_name: str,
    properties: dict[str, Any],
) -> dict[str, Any]:
    """Set component properties (text, color, font size, opacity, visibility, etc.).

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to modify
        properties: Dictionary of property name-value pairs to set.
                    Common properties: text, color_and_opacity (dict with r,g,b,a),
                    font_size, render_opacity (0.0-1.0),
                    visibility (visible/hidden/collapsed),
                    is_enabled, tool_tip_text, cursor
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    component = _find_widget_component(widget_bp, component_name)

    applied = []
    failed = []

    for prop_name, prop_value in properties.items():
        if prop_name == "text":
            _set_text_property(component, prop_value)
            applied.append(prop_name)
        elif prop_name == "color_and_opacity":
            _set_color_property(component, "color_and_opacity", prop_value)
            applied.append(prop_name)
        elif prop_name == "background_color":
            _set_color_property(component, "background_color", prop_value)
            applied.append(prop_name)
        elif prop_name == "font_size":
            _set_font_size(component, prop_value)
            applied.append(prop_name)
        elif prop_name == "visibility":
            _set_visibility(component, prop_value)
            applied.append(prop_name)
        elif prop_name == "justification":
            _set_justification(component, prop_value)
            applied.append(prop_name)
        else:
            if _try_set_editor_property(component, prop_name, prop_value):
                applied.append(prop_name)
            else:
                failed.append(prop_name)

    _compile_and_save_widget(widget_bp, widget_path)
    log_debug(f"Set properties on '{component_name}': applied={applied}, failed={failed}")

    result: dict[str, Any] = {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "applied": applied,
    }
    if failed:
        result["failed"] = failed
        result["warning"] = f"Could not set properties: {failed}"
    return result


def _set_text_property(component, value: str):
    """Set text on a text-capable widget component."""
    text_val = unreal.Text(str(value))
    if hasattr(component, "set_text"):
        component.set_text(text_val)
    else:
        component.set_editor_property("text", text_val)


def _set_color_property(component, prop_name: str, color_dict):
    """Set a color property from a dict with r, g, b, a keys.

    Handles both LinearColor and SlateColor property types automatically.
    """
    if not isinstance(color_dict, dict):
        raise ProcessingError(
            f"{prop_name} must be a dict with r, g, b, a keys (0.0-1.0)",
            operation="widget_set_property",
            details={"prop_name": prop_name, "value": str(color_dict)},
        )
    color = unreal.LinearColor(
        r=float(color_dict.get("r", 1.0)),
        g=float(color_dict.get("g", 1.0)),
        b=float(color_dict.get("b", 1.0)),
        a=float(color_dict.get("a", 1.0)),
    )

    # Detect the expected property type and wrap in SlateColor when needed
    current_value = _try_get_editor_property(component, prop_name)
    if isinstance(current_value, unreal.SlateColor):
        value_to_set = unreal.SlateColor(specified_color=color)
    else:
        value_to_set = color

    component.set_editor_property(prop_name, value_to_set)


def _set_font_size(component, size: int):
    """Set font size on a text-capable widget component."""
    component_type = _get_widget_type_name(component)

    # Validate the component supports a 'font' property before accessing it
    current_font = _try_get_editor_property(component, "font")
    if current_font is None:
        raise ProcessingError(
            "font_size is only supported for widgets with a 'font' editor property",
            operation="widget_set_property",
            details={
                "property": "font_size",
                "component_type": component_type,
            },
        )

    current_font.size = int(size)
    component.set_editor_property("font", current_font)


def _set_visibility(component, visibility_str: str):
    """Set widget visibility from a string name."""
    vis = VISIBILITY_MAP.get(str(visibility_str).lower())
    if vis is None:
        raise ProcessingError(
            f"Unknown visibility: {visibility_str}",
            operation="widget_set_property",
            details={
                "visibility": visibility_str,
                "supported": list(VISIBILITY_MAP.keys()),
            },
        )
    component.set_editor_property("visibility", vis)


def _set_justification(component, justification_str: str):
    """Set text justification from a string name."""
    just = JUSTIFICATION_MAP.get(str(justification_str).lower())
    if just is None:
        raise ProcessingError(
            f"Unknown justification: {justification_str}",
            operation="widget_set_property",
            details={
                "justification": justification_str,
                "supported": list(JUSTIFICATION_MAP.keys()),
            },
        )
    component.set_editor_property("justification", just)


def _try_set_editor_property(component, prop_name: str, prop_value) -> bool:
    """Try to set a generic editor property, returning True on success."""
    try:
        component.set_editor_property(prop_name, prop_value)
        return True
    except (AttributeError, TypeError, RuntimeError):
        return False


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "component_name": [RequiredRule(), TypeRule(str)],
        "event_name": [RequiredRule(), TypeRule(str)],
        "function_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("widget_bind_event")
@safe_operation("widget")
def bind_event(
    widget_path: str,
    component_name: str,
    event_name: str,
    function_name: str,
) -> dict[str, Any]:
    """Bind a widget event to a Blueprint function (OnClicked, OnHovered, OnValueChanged, etc.).

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to bind event on
        event_name: Event to bind (OnClicked, OnPressed, OnReleased, OnHovered,
                    OnUnhovered, OnValueChanged, OnCheckStateChanged, etc.)
        function_name: Name of the Blueprint function to call when event fires
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    component = _find_widget_component(widget_bp, component_name)

    if event_name not in SUPPORTED_EVENTS:
        raise ProcessingError(
            f"Unsupported event: {event_name}",
            operation="widget_bind_event",
            details={
                "event_name": event_name,
                "supported": list(SUPPORTED_EVENTS),
            },
        )

    delegate_prop = _event_to_delegate_property(event_name)

    has_delegate = hasattr(component, delegate_prop) or _component_supports_event(component, delegate_prop)
    if not has_delegate:
        component_type = component.get_class().get_name()
        raise ProcessingError(
            f"Component type '{component_type}' does not support event '{event_name}'",
            operation="widget_bind_event",
            details={
                "component_name": component_name,
                "component_type": component_type,
                "event_name": event_name,
            },
        )

    bindings = widget_bp.get_editor_property("bindings") or []

    # Remove existing bindings for this component/event to avoid duplicates
    bindings = _deduplicate_bindings(bindings, component_name, delegate_prop)

    binding = unreal.DelegateRuntimeBinding()
    binding.object_name = component_name
    binding.property_name = unreal.Name(delegate_prop)
    binding.function_name = unreal.Name(function_name)
    bindings.append(binding)
    widget_bp.set_editor_property("bindings", bindings)

    _compile_and_save_widget(widget_bp, widget_path)
    log_debug(f"Bound {event_name} on '{component_name}' to '{function_name}' in {widget_path}")

    return {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "eventName": event_name,
        "functionName": function_name,
        "delegateProperty": delegate_prop,
    }


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "component_name": [RequiredRule(), TypeRule(str)],
        "property_name": [RequiredRule(), TypeRule(str)],
        "binding_function": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("widget_set_binding")
@safe_operation("widget")
def set_binding(
    widget_path: str,
    component_name: str,
    property_name: str,
    binding_function: str,
) -> dict[str, Any]:
    """Set a property binding for dynamic data updates on a widget component.

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to bind
        property_name: Property to bind (e.g., text, visibility, color_and_opacity)
        binding_function: Name of the Blueprint function that returns the bound value
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    _find_widget_component(widget_bp, component_name)

    bindings = widget_bp.get_editor_property("bindings") or []

    # Remove existing bindings for this component/property to keep behavior deterministic
    bindings = _deduplicate_bindings(bindings, component_name, property_name)

    binding = unreal.DelegateRuntimeBinding()
    binding.object_name = component_name
    binding.property_name = unreal.Name(property_name)
    binding.function_name = unreal.Name(binding_function)
    bindings.append(binding)
    widget_bp.set_editor_property("bindings", bindings)

    _compile_and_save_widget(widget_bp, widget_path)
    log_debug(
        f"Bound property '{property_name}' on '{component_name}'" f" to function '{binding_function}' in {widget_path}"
    )

    return {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "propertyName": property_name,
        "bindingFunction": binding_function,
    }


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "include_hierarchy": [TypeRule(bool, allow_none=True)],
        "include_bindings": [TypeRule(bool, allow_none=True)],
    }
)
@handle_unreal_errors("widget_get_metadata")
@safe_operation("widget")
def get_metadata(
    widget_path: str,
    include_hierarchy: bool = True,
    include_bindings: bool = True,
) -> dict[str, Any]:
    """Get comprehensive widget metadata including components, layout, hierarchy, and bindings.

    Args:
        widget_path: Path to the Widget Blueprint asset
        include_hierarchy: Include component hierarchy tree (default True)
        include_bindings: Include property and event bindings (default True)
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    widget_tree = widget_bp.widget_tree

    metadata: dict[str, Any] = {
        "success": True,
        "widgetPath": widget_path,
        "widgetName": widget_bp.get_name(),
        "parentClass": (widget_bp.parent_class.get_name() if widget_bp.parent_class else "Unknown"),
    }

    # When both hierarchy and component list are needed, build in a single recursive pass
    if include_hierarchy and widget_tree:
        root = widget_tree.root_widget
        if root:
            components: list[dict[str, Any]] = []
            metadata["hierarchy"] = _build_hierarchy_with_components(root, components)
            metadata["components"] = components
            metadata["componentCount"] = len(components)
        else:
            metadata["components"] = []
            metadata["componentCount"] = 0
    else:
        components = _gather_component_list(widget_tree)
        metadata["components"] = components
        metadata["componentCount"] = len(components)

    if include_bindings:
        metadata["bindings"] = _gather_bindings(widget_bp)

    log_debug(f"Retrieved metadata for {widget_path}: {metadata['componentCount']} components")
    return metadata


def _gather_component_list(widget_tree) -> list[dict[str, Any]]:
    """Gather component info from all widgets in a widget tree."""
    if not widget_tree:
        return []

    components = []
    all_widgets = widget_tree.get_all_widgets()
    for w in all_widgets:
        if not w:
            continue
        components.append(_extract_component_info(w))
    return components


def _extract_component_info(w) -> dict[str, Any]:
    """Extract metadata from a single widget component."""
    comp_info: dict[str, Any] = {
        "name": w.get_name(),
        "type": w.get_class().get_name(),
        "visibility": str(w.get_editor_property("visibility")),
        "isEnabled": w.get_editor_property("is_enabled"),
    }

    slot = w.slot
    if slot and isinstance(slot, unreal.CanvasPanelSlot):
        offsets = slot.get_offsets()
        comp_info["layout"] = {
            "position": [offsets.left, offsets.top],
            "size": [offsets.right, offsets.bottom],
            "zOrder": slot.get_z_order(),
        }
        anchor = slot.get_anchors()
        if anchor:
            comp_info["anchors"] = {
                "min_x": anchor.minimum.x,
                "min_y": anchor.minimum.y,
                "max_x": anchor.maximum.x,
                "max_y": anchor.maximum.y,
            }

    class_name = comp_info["type"]
    if class_name == "TextBlock":
        comp_info["text"] = str(w.get_text())
    elif class_name in ("Slider", "ProgressBar", "SpinBox") and hasattr(w, "get_value"):
        comp_info["value"] = w.get_value()
    elif class_name == "CheckBox" and hasattr(w, "is_checked"):
        comp_info["isChecked"] = w.is_checked()

    return comp_info


def _gather_bindings(widget_bp) -> list[dict[str, str]]:
    """Gather all property and event bindings from a Widget Blueprint."""
    bindings_data = []
    bindings = widget_bp.get_editor_property("bindings")
    if not bindings:
        return bindings_data
    for b in bindings:
        bindings_data.append(
            {
                "objectName": str(b.object_name),
                "propertyName": str(b.property_name),
                "functionName": str(b.function_name),
            }
        )
    return bindings_data


def _build_hierarchy_with_components(widget, components: list[dict[str, Any]], depth: int = 0) -> dict[str, Any]:
    """Recursively build hierarchy tree while also collecting component info."""
    components.append(_extract_component_info(widget))

    node = {
        "name": widget.get_name(),
        "type": widget.get_class().get_name(),
        "depth": depth,
    }

    children = []
    if hasattr(widget, "get_child_count"):
        child_count = widget.get_child_count()
        for i in range(child_count):
            child = widget.get_child_at(i)
            if child:
                children.append(_build_hierarchy_with_components(child, components, depth + 1))

    if children:
        node["children"] = children
    return node


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "width": [TypeRule(int, allow_none=True)],
        "height": [TypeRule(int, allow_none=True)],
    }
)
@handle_unreal_errors("widget_screenshot")
@safe_operation("widget")
def screenshot(
    widget_path: str,
    width: int = 640,
    height: int = 360,
) -> dict[str, Any]:
    """Capture a preview screenshot of a Widget Blueprint for visual verification.

    Args:
        widget_path: Path to the Widget Blueprint asset
        width: Screenshot width in pixels (default 640)
        height: Screenshot height in pixels (default 360)
    """
    widget_bp = _resolve_widget_blueprint(widget_path)

    timestamp = int(time.time())
    widget_name = widget_bp.get_name()
    filename = f"uemcp_widget_{widget_name}_{timestamp}"

    # Ensure the widget blueprint is compiled so generated_class() is valid
    generated_class = widget_bp.generated_class()
    if generated_class is None:
        _compile_bp(widget_bp)
        generated_class = widget_bp.generated_class()

    if generated_class is None:
        raise ProcessingError(
            "Widget Blueprint has no generated class even after compilation",
            operation="widget_screenshot",
            details={"widget_path": widget_path},
        )

    world = get_unreal_editor_subsystem().get_editor_world()
    widget_instance = unreal.WidgetBlueprintLibrary.create(world, generated_class, None)

    if not widget_instance:
        raise ProcessingError(
            f"Failed to create widget instance for screenshot: {widget_path}",
            operation="widget_screenshot",
            details={"widget_path": widget_path},
        )

    # Screenshot is asynchronous — widget must stay in viewport until capture completes.
    # Schedule cleanup via a deferred tick callback so the widget persists for the capture frame.
    # Use try/finally to ensure widget is always cleaned up even if screenshot fails.
    try:
        widget_instance.add_to_viewport(0)

        unreal.AutomationLibrary.take_high_res_screenshot(
            width,
            height,
            filename,
            None,
            False,
            False,
            unreal.ComparisonTolerance.LOW,
        )
    except Exception:
        widget_instance.remove_from_parent()
        raise

    # Defer widget removal by one tick so the screenshot frame captures the widget
    _deferred_widget_cleanup(widget_instance)

    output_path = _get_screenshot_path(filename)
    log_debug(f"Widget screenshot requested: {output_path}")

    return {
        "success": True,
        "widgetPath": widget_path,
        "filepath": output_path,
        "width": width,
        "height": height,
        "message": f"Widget screenshot initiated. File will be saved to: {output_path}",
    }


def _deferred_widget_cleanup(widget_instance):
    """Remove a widget from viewport after a short delay to allow screenshot capture."""
    handle_container = {}

    def _cleanup_tick(delta_time):
        try:
            widget_instance.remove_from_parent()
        finally:
            if "handle" in handle_container:
                unreal.unregister_slate_post_tick_callback(handle_container["handle"])

    handle_container["handle"] = unreal.register_slate_post_tick_callback(_cleanup_tick)

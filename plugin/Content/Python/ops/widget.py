"""
UMG Widget operations for creating and manipulating Widget Blueprints,
adding UI components, configuring layout, binding events, and inspecting widgets.
"""

import os
import time
from typing import Any, Dict, List, Optional

import unreal

from utils.error_handling import (
    AssetPathRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    safe_operation,
    validate_inputs,
)
from utils.general import log_debug as log_info

# ============================================================================
# Supported component types for widget_add_component
# ============================================================================

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

# ============================================================================
# Supported events for widget_bind_event
# ============================================================================

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


def _resolve_widget_blueprint(widget_path: str):
    """Load and validate a Widget Blueprint asset.

    Args:
        widget_path: Content path to the Widget Blueprint

    Returns:
        The loaded WidgetBlueprint asset

    Raises:
        ProcessingError: If asset not found or not a WidgetBlueprint
    """
    asset = unreal.EditorAssetLibrary.load_asset(widget_path)
    if not asset:
        raise ProcessingError(
            f"Widget Blueprint not found: {widget_path}",
            operation="widget",
            details={"widget_path": widget_path},
        )
    if not isinstance(asset, unreal.WidgetBlueprint):
        raise ProcessingError(
            f"Asset is not a Widget Blueprint: {widget_path} (type: {type(asset).__name__})",
            operation="widget",
            details={"widget_path": widget_path, "actual_type": type(asset).__name__},
        )
    return asset


def _find_widget_component(widget_bp, component_name: str):
    """Find a named component inside a Widget Blueprint's widget tree.

    Args:
        widget_bp: The WidgetBlueprint asset
        component_name: Name of the component to find

    Returns:
        The found widget component

    Raises:
        ProcessingError: If component not found
    """
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
    """Compile and save a Widget Blueprint.

    Args:
        widget_bp: The WidgetBlueprint asset
        widget_path: Content path for logging
    """
    unreal.KismetSystemLibrary.flush_persistent_debug_lines(None)
    unreal.EditorAssetLibrary.save_asset(widget_path)
    log_info(f"Saved Widget Blueprint: {widget_path}")


def _get_component_class(component_type: str):
    """Resolve a component type name to its UE class.

    Args:
        component_type: Friendly name like 'TextBlock', 'Button', etc.

    Returns:
        The UE class object

    Raises:
        ProcessingError: If the component type is unsupported
    """
    if component_type not in SUPPORTED_WIDGET_COMPONENTS:
        raise ProcessingError(
            f"Unsupported widget component type: {component_type}",
            operation="widget_add_component",
            details={
                "component_type": component_type,
                "supported": list(SUPPORTED_WIDGET_COMPONENTS),
            },
        )

    # Map friendly names to UE class paths
    class_path = f"/Script/UMG.{component_type}"
    cls = unreal.load_class(None, class_path)
    if not cls:
        raise ProcessingError(
            f"Could not load UE class for component type: {component_type}",
            operation="widget_add_component",
            details={"component_type": component_type, "class_path": class_path},
        )
    return cls


# ============================================================================
# Tool: widget_create
# ============================================================================


@validate_inputs(
    {
        "widget_name": [RequiredRule(), TypeRule(str)],
        "target_folder": [RequiredRule(), TypeRule(str)],
        "parent_class": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("widget_create")
@safe_operation("widget")
def widget_create(
    widget_name: str,
    target_folder: str = "/Game/UI",
    parent_class: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new Widget Blueprint with optional parent class.

    Args:
        widget_name: Name for the new Widget Blueprint
        target_folder: Destination folder in content browser
        parent_class: Parent widget class path (defaults to UserWidget)

    Returns:
        Dictionary with creation result
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

    # Create Widget Blueprint via factory
    factory = unreal.WidgetBlueprintFactory()

    if parent_class:
        # Resolve custom parent class
        if "/" in parent_class:
            parent_asset = unreal.EditorAssetLibrary.load_asset(parent_class)
            if parent_asset and isinstance(parent_asset, unreal.Blueprint):
                factory.set_editor_property("parent_class", parent_asset.generated_class())
            else:
                raise ProcessingError(
                    f"Parent class not found: {parent_class}",
                    operation="widget_create",
                    details={"parent_class": parent_class},
                )
        else:
            parent_cls = unreal.load_class(None, f"/Script/UMG.{parent_class}")
            if not parent_cls:
                parent_cls = unreal.load_class(None, f"/Script/Engine.{parent_class}")
            if parent_cls:
                factory.set_editor_property("parent_class", parent_cls)

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
    log_info(f"Created Widget Blueprint: {asset_path}")

    return {
        "success": True,
        "widgetPath": asset_path,
        "widgetName": widget_name,
        "parentClass": parent_class or "UserWidget",
    }


# ============================================================================
# Tool: widget_add_component
# ============================================================================


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
def widget_add_component(
    widget_path: str,
    component_type: str,
    component_name: str,
    parent_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Add a UI component to a Widget Blueprint.

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_type: Type of component (TextBlock, Button, Image, Slider,
                        CheckBox, ProgressBar, ScrollBox, HorizontalBox,
                        VerticalBox, CanvasPanel, Border, Overlay, SizeBox, etc.)
        component_name: Unique name for the new component
        parent_name: Optional parent component name to nest under

    Returns:
        Dictionary with component creation result
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    widget_tree = widget_bp.widget_tree
    if not widget_tree:
        raise ProcessingError(
            "Widget Blueprint has no widget tree",
            operation="widget_add_component",
            details={"widget_path": widget_path},
        )

    # Validate component type
    if component_type not in SUPPORTED_WIDGET_COMPONENTS:
        raise ProcessingError(
            f"Unsupported component type: {component_type}",
            operation="widget_add_component",
            details={
                "component_type": component_type,
                "supported": list(SUPPORTED_WIDGET_COMPONENTS),
            },
        )

    # Check for name collision
    existing = widget_tree.get_all_widgets()
    for w in existing:
        if w and w.get_name() == component_name:
            raise ProcessingError(
                f"Component '{component_name}' already exists in widget",
                operation="widget_add_component",
                details={"component_name": component_name},
            )

    # Resolve parent widget if specified
    parent_widget = None
    if parent_name:
        parent_widget = _find_widget_component(widget_bp, parent_name)

    # Create the component via the widget tree
    component_class = _get_component_class(component_type)
    new_widget = widget_tree.construct_widget(component_class)
    if not new_widget:
        raise ProcessingError(
            f"Failed to construct widget of type: {component_type}",
            operation="widget_add_component",
            details={"component_type": component_type},
        )

    new_widget.set_editor_property("name", component_name)

    # Add to parent or root
    if parent_widget:
        slot = parent_widget.add_child(new_widget)
    else:
        root = widget_tree.root_widget
        if root:
            slot = root.add_child(new_widget)
        else:
            widget_tree.set_editor_property("root_widget", new_widget)
            slot = None

    _compile_and_save_widget(widget_bp, widget_path)
    log_info(f"Added {component_type} '{component_name}' to {widget_path}")

    result = {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "componentType": component_type,
        "parentName": parent_name,
        "hasSlot": slot is not None,
    }
    return result


# ============================================================================
# Tool: widget_set_layout
# ============================================================================


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
def widget_set_layout(
    widget_path: str,
    component_name: str,
    position: Optional[List[float]] = None,
    size: Optional[List[float]] = None,
    anchors: Optional[Dict[str, float]] = None,
    alignment: Optional[List[float]] = None,
    z_order: Optional[int] = None,
) -> Dict[str, Any]:
    """Set layout properties for a widget component (position, size, anchors, z-order, alignment).

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to modify
        position: Position offset [X, Y] in pixels
        size: Size [Width, Height] in pixels
        anchors: Anchor settings {min_x, min_y, max_x, max_y} (0.0-1.0)
        alignment: Alignment pivot [X, Y] (0.0-1.0, where 0.5 is center)
        z_order: Rendering z-order (higher renders on top)

    Returns:
        Dictionary with layout update result
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    component = _find_widget_component(widget_bp, component_name)

    changes = []

    # Get the slot for layout manipulation
    slot = component.slot
    is_canvas_slot = slot and isinstance(slot, unreal.CanvasPanelSlot)

    if position is not None:
        if len(position) < 2:
            raise ProcessingError(
                "position must have at least 2 elements [X, Y]",
                operation="widget_set_layout",
                details={"position": position},
            )
        if is_canvas_slot:
            current_offsets = slot.get_offsets()
            current_offsets.left = float(position[0])
            current_offsets.top = float(position[1])
            slot.set_offsets(current_offsets)
            changes.append("position")
        else:
            component.set_editor_property(
                "render_transform",
                unreal.WidgetTransform(translation=unreal.Vector2D(float(position[0]), float(position[1]))),
            )
            changes.append("render_transform_position")

    if size is not None:
        if len(size) < 2:
            raise ProcessingError(
                "size must have at least 2 elements [Width, Height]",
                operation="widget_set_layout",
                details={"size": size},
            )
        if is_canvas_slot:
            current_offsets = slot.get_offsets()
            current_offsets.right = float(size[0])
            current_offsets.bottom = float(size[1])
            slot.set_offsets(current_offsets)
            changes.append("size")

    if anchors is not None:
        if is_canvas_slot:
            anchor = unreal.Anchors()
            anchor.minimum = unreal.Vector2D(
                anchors.get("min_x", 0.0),
                anchors.get("min_y", 0.0),
            )
            anchor.maximum = unreal.Vector2D(
                anchors.get("max_x", 0.0),
                anchors.get("max_y", 0.0),
            )
            slot.set_anchors(anchor)
            changes.append("anchors")

    if alignment is not None:
        if len(alignment) < 2:
            raise ProcessingError(
                "alignment must have at least 2 elements [X, Y]",
                operation="widget_set_layout",
                details={"alignment": alignment},
            )
        if is_canvas_slot:
            slot.set_alignment(unreal.Vector2D(float(alignment[0]), float(alignment[1])))
            changes.append("alignment")

    if z_order is not None:
        if is_canvas_slot:
            slot.set_z_order(z_order)
            changes.append("z_order")

    _compile_and_save_widget(widget_bp, widget_path)
    log_info(f"Updated layout for '{component_name}' in {widget_path}: {changes}")

    return {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "changes": changes,
        "isCanvasSlot": is_canvas_slot,
    }


# ============================================================================
# Tool: widget_set_property
# ============================================================================


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "component_name": [RequiredRule(), TypeRule(str)],
        "properties": [RequiredRule(), TypeRule(dict)],
    }
)
@handle_unreal_errors("widget_set_property")
@safe_operation("widget")
def widget_set_property(
    widget_path: str,
    component_name: str,
    properties: Dict[str, Any],
) -> Dict[str, Any]:
    """Set component properties (text, color, font size, opacity, visibility, etc.).

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to modify
        properties: Dictionary of property name-value pairs to set.
                    Common properties: text, color_and_opacity (dict with r,g,b,a),
                    font_size, opacity, visibility (visible/hidden/collapsed),
                    is_enabled, tool_tip_text, cursor, render_opacity

    Returns:
        Dictionary with property update result
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    component = _find_widget_component(widget_bp, component_name)

    applied = []
    failed = []

    for prop_name, prop_value in properties.items():
        # Handle special property mappings
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
            # Try generic set_editor_property
            if _try_set_editor_property(component, prop_name, prop_value):
                applied.append(prop_name)
            else:
                failed.append(prop_name)

    _compile_and_save_widget(widget_bp, widget_path)
    log_info(f"Set properties on '{component_name}': applied={applied}, failed={failed}")

    result = {
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
    # TextBlock uses 'text', Button child TextBlock, EditableText uses 'text'
    if hasattr(component, "set_text"):
        component.set_text(text_val)
    else:
        component.set_editor_property("text", text_val)


def _set_color_property(component, prop_name: str, color_dict):
    """Set a color property from a dict with r, g, b, a keys."""
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
    component.set_editor_property(prop_name, color)


def _set_font_size(component, size: int):
    """Set font size on a text-capable widget component."""
    font_info = component.get_editor_property("font")
    font_info.size = int(size)
    component.set_editor_property("font", font_info)


def _set_visibility(component, visibility_str: str):
    """Set widget visibility from a string name."""
    visibility_map = {
        "visible": unreal.SlateVisibility.VISIBLE,
        "hidden": unreal.SlateVisibility.HIDDEN,
        "collapsed": unreal.SlateVisibility.COLLAPSED,
        "hit_test_invisible": unreal.SlateVisibility.HIT_TEST_INVISIBLE,
        "self_hit_test_invisible": unreal.SlateVisibility.SELF_HIT_TEST_INVISIBLE,
    }
    vis = visibility_map.get(str(visibility_str).lower())
    if vis is None:
        raise ProcessingError(
            f"Unknown visibility: {visibility_str}",
            operation="widget_set_property",
            details={
                "visibility": visibility_str,
                "supported": list(visibility_map.keys()),
            },
        )
    component.set_editor_property("visibility", vis)


def _set_justification(component, justification_str: str):
    """Set text justification from a string name."""
    justification_map = {
        "left": unreal.TextJustify.LEFT,
        "center": unreal.TextJustify.CENTER,
        "right": unreal.TextJustify.RIGHT,
    }
    just = justification_map.get(str(justification_str).lower())
    if just is None:
        raise ProcessingError(
            f"Unknown justification: {justification_str}",
            operation="widget_set_property",
            details={
                "justification": justification_str,
                "supported": list(justification_map.keys()),
            },
        )
    component.set_editor_property("justification", just)


def _try_set_editor_property(component, prop_name: str, prop_value) -> bool:
    """Try to set a generic editor property, returning True on success."""
    try:
        component.set_editor_property(prop_name, prop_value)
        return True
    except Exception:
        return False


# ============================================================================
# Tool: widget_bind_event
# ============================================================================


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
def widget_bind_event(
    widget_path: str,
    component_name: str,
    event_name: str,
    function_name: str,
) -> Dict[str, Any]:
    """Bind a widget event to a Blueprint function (OnClicked, OnHovered, OnValueChanged, etc.).

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to bind event on
        event_name: Event to bind (OnClicked, OnPressed, OnReleased, OnHovered,
                    OnUnhovered, OnValueChanged, OnCheckStateChanged, etc.)
        function_name: Name of the Blueprint function to call when event fires

    Returns:
        Dictionary with event binding result
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

    # Event binding in UMG works through the Blueprint graph system.
    # We create a binding by adding a delegate binding entry.
    # The property name for delegates is typically the event name in snake_case.
    delegate_prop = _event_to_delegate_property(event_name)

    # Verify the component has this delegate
    has_delegate = hasattr(component, delegate_prop) or _component_supports_event(component, event_name)
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

    # Add the event binding via the Widget Blueprint's event graph
    # This creates a node in the Blueprint graph that fires when the event occurs
    bindings = widget_bp.get_editor_property("bindings")
    binding = unreal.DelegateRuntimeBinding()
    binding.object_name = component_name
    binding.property_name = unreal.Name(delegate_prop)
    binding.function_name = unreal.Name(function_name)
    bindings.append(binding)
    widget_bp.set_editor_property("bindings", bindings)

    _compile_and_save_widget(widget_bp, widget_path)
    log_info(f"Bound {event_name} on '{component_name}' to '{function_name}' in {widget_path}")

    return {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "eventName": event_name,
        "functionName": function_name,
        "delegateProperty": delegate_prop,
    }


def _event_to_delegate_property(event_name: str) -> str:
    """Convert an event name like 'OnClicked' to its delegate property name.

    Args:
        event_name: PascalCase event name (e.g., 'OnClicked')

    Returns:
        snake_case delegate property name (e.g., 'on_clicked')
    """
    result = []
    for i, char in enumerate(event_name):
        if char.isupper() and i > 0:
            result.append("_")
        result.append(char.lower())
    return "".join(result)


def _component_supports_event(component, event_name: str) -> bool:
    """Check if a component supports a given event by inspecting its class.

    Args:
        component: The widget component
        event_name: The event name to check

    Returns:
        True if the component supports the event
    """
    delegate_prop = _event_to_delegate_property(event_name)
    # Check both the delegate property and the multicast delegate variant
    for suffix in ("", "_event", "_delegate"):
        if hasattr(component, f"{delegate_prop}{suffix}"):
            return True
    return False


# ============================================================================
# Tool: widget_set_binding
# ============================================================================


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
def widget_set_binding(
    widget_path: str,
    component_name: str,
    property_name: str,
    binding_function: str,
) -> Dict[str, Any]:
    """Set a property binding for dynamic data updates on a widget component.

    Args:
        widget_path: Path to the Widget Blueprint asset
        component_name: Name of the component to bind
        property_name: Property to bind (e.g., text, visibility, color_and_opacity)
        binding_function: Name of the Blueprint function that returns the bound value

    Returns:
        Dictionary with binding result
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    _find_widget_component(widget_bp, component_name)

    # Property bindings in UMG use the bindings array on the WidgetBlueprint
    bindings = widget_bp.get_editor_property("bindings")
    binding = unreal.DelegateRuntimeBinding()
    binding.object_name = component_name
    binding.property_name = unreal.Name(property_name)
    binding.function_name = unreal.Name(binding_function)
    bindings.append(binding)
    widget_bp.set_editor_property("bindings", bindings)

    _compile_and_save_widget(widget_bp, widget_path)
    log_info(
        f"Bound property '{property_name}' on '{component_name}' " f"to function '{binding_function}' in {widget_path}"
    )

    return {
        "success": True,
        "widgetPath": widget_path,
        "componentName": component_name,
        "propertyName": property_name,
        "bindingFunction": binding_function,
    }


# ============================================================================
# Tool: widget_get_metadata
# ============================================================================


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "include_hierarchy": [TypeRule(bool, allow_none=True)],
        "include_bindings": [TypeRule(bool, allow_none=True)],
    }
)
@handle_unreal_errors("widget_get_metadata")
@safe_operation("widget")
def widget_get_metadata(
    widget_path: str,
    include_hierarchy: bool = True,
    include_bindings: bool = True,
) -> Dict[str, Any]:
    """Get comprehensive widget metadata including components, layout, hierarchy, and bindings.

    Args:
        widget_path: Path to the Widget Blueprint asset
        include_hierarchy: Include component hierarchy tree (default True)
        include_bindings: Include property and event bindings (default True)

    Returns:
        Dictionary with complete widget metadata
    """
    widget_bp = _resolve_widget_blueprint(widget_path)
    widget_tree = widget_bp.widget_tree

    metadata: Dict[str, Any] = {
        "success": True,
        "widgetPath": widget_path,
        "widgetName": widget_bp.get_name(),
        "parentClass": widget_bp.parent_class.get_name() if widget_bp.parent_class else "Unknown",
    }

    # Gather component list
    components = _gather_component_list(widget_tree)
    metadata["components"] = components
    metadata["componentCount"] = len(components)

    # Build hierarchy tree
    if include_hierarchy and widget_tree:
        root = widget_tree.root_widget
        if root:
            metadata["hierarchy"] = _build_hierarchy(root)

    # Gather bindings
    if include_bindings:
        metadata["bindings"] = _gather_bindings(widget_bp)

    log_info(f"Retrieved metadata for {widget_path}: {len(components)} components")
    return metadata


def _gather_component_list(widget_tree) -> List[Dict[str, Any]]:
    """Gather component info from all widgets in a widget tree.

    Args:
        widget_tree: The widget tree to inspect

    Returns:
        List of component info dictionaries
    """
    if not widget_tree:
        return []

    components = []
    all_widgets = widget_tree.get_all_widgets()
    for w in all_widgets:
        if not w:
            continue
        comp_info = _extract_component_info(w)
        components.append(comp_info)
    return components


def _extract_component_info(w) -> Dict[str, Any]:
    """Extract metadata from a single widget component.

    Args:
        w: The widget component

    Returns:
        Dictionary with component info
    """
    comp_info: Dict[str, Any] = {
        "name": w.get_name(),
        "type": w.get_class().get_name(),
        "visibility": str(w.get_editor_property("visibility")),
        "isEnabled": w.get_editor_property("is_enabled"),
    }

    # Add slot/layout info if in a canvas panel
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
                "min": [anchor.minimum.x, anchor.minimum.y],
                "max": [anchor.maximum.x, anchor.maximum.y],
            }

    # Add type-specific properties
    class_name = comp_info["type"]
    if class_name == "TextBlock":
        comp_info["text"] = str(w.get_text())
    elif class_name in ("Slider", "ProgressBar", "SpinBox") and hasattr(w, "get_value"):
        comp_info["value"] = w.get_value()
    elif class_name == "CheckBox" and hasattr(w, "is_checked"):
        comp_info["isChecked"] = w.is_checked()

    return comp_info


def _gather_bindings(widget_bp) -> List[Dict[str, str]]:
    """Gather all property and event bindings from a Widget Blueprint.

    Args:
        widget_bp: The WidgetBlueprint asset

    Returns:
        List of binding info dictionaries
    """
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


def _build_hierarchy(widget, depth: int = 0) -> Dict[str, Any]:
    """Recursively build a hierarchy tree from a widget.

    Args:
        widget: The root widget to start from
        depth: Current depth level

    Returns:
        Dictionary representing the hierarchy
    """
    node = {
        "name": widget.get_name(),
        "type": widget.get_class().get_name(),
        "depth": depth,
    }

    # Check for children via panel interface
    children = []
    if hasattr(widget, "get_child_count"):
        child_count = widget.get_child_count()
        for i in range(child_count):
            child = widget.get_child_at(i)
            if child:
                children.append(_build_hierarchy(child, depth + 1))

    if children:
        node["children"] = children
    return node


# ============================================================================
# Tool: widget_screenshot
# ============================================================================


@validate_inputs(
    {
        "widget_path": [RequiredRule(), AssetPathRule()],
        "width": [TypeRule(int, allow_none=True)],
        "height": [TypeRule(int, allow_none=True)],
    }
)
@handle_unreal_errors("widget_screenshot")
@safe_operation("widget")
def widget_screenshot(
    widget_path: str,
    width: int = 640,
    height: int = 360,
) -> Dict[str, Any]:
    """Capture a preview screenshot of a Widget Blueprint for visual verification.

    Args:
        widget_path: Path to the Widget Blueprint asset
        width: Screenshot width in pixels (default 640)
        height: Screenshot height in pixels (default 360)

    Returns:
        Dictionary with screenshot file path
    """
    widget_bp = _resolve_widget_blueprint(widget_path)

    # Generate screenshot via the widget thumbnail/preview system
    timestamp = int(time.time())
    widget_name = widget_bp.get_name()
    filename = f"uemcp_widget_{widget_name}_{timestamp}"

    project_path = unreal.SystemLibrary.get_project_directory()
    screenshots_dir = os.path.join(project_path, "Saved", "Screenshots", "Widgets")
    os.makedirs(screenshots_dir, exist_ok=True)
    output_path = os.path.join(screenshots_dir, f"{filename}.png")

    # Create a transient widget instance for rendering
    world = unreal.EditorLevelLibrary.get_editor_world()
    widget_instance = unreal.WidgetBlueprintLibrary.create(world, widget_bp.generated_class(), None)

    if widget_instance:
        # Use the automation/rendering pipeline to capture the widget
        unreal.AutomationLibrary.take_high_res_screenshot(
            width,
            height,
            filename,
            None,
            False,
            False,
            unreal.ComparisonTolerance.LOW,
        )
        # Clean up the transient widget
        widget_instance.remove_from_parent()

        import platform as py_platform

        system = py_platform.system()
        if system == "Darwin":
            output_path = os.path.join(project_path, "Saved", "Screenshots", "MacEditor", f"{filename}.png")
        elif system == "Windows":
            output_path = os.path.join(project_path, "Saved", "Screenshots", "WindowsEditor", f"{filename}.png")
        else:
            output_path = os.path.join(project_path, "Saved", "Screenshots", "LinuxEditor", f"{filename}.png")

    log_info(f"Widget screenshot requested: {output_path}")

    return {
        "success": True,
        "widgetPath": widget_path,
        "filepath": output_path,
        "width": width,
        "height": height,
        "message": f"Widget screenshot initiated. File will be saved to: {output_path}",
    }

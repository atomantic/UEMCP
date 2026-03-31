"""
PCG (Procedural Content Generation) operations for creating and managing
PCG graphs, nodes, and procedural generation execution.
"""

from __future__ import annotations

from typing import Any, Optional

import unreal

# Fail fast at import time if PCG plugin is not available, so that
# try/except ImportError guards in __init__.py and command_registry work.
if not hasattr(unreal, "PCGGraphInterface"):
    raise ImportError("PCG plugin is not available (unreal.PCGGraphInterface not found)")

from utils.error_handling import (
    AssetPathRule,
    ListLengthRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    require_asset,
    safe_operation,
    validate_inputs,
)
from utils.general import create_rotator, create_vector, get_actor_subsystem, log_debug

_BUILT_IN_TEMPLATES = {
    "scatter": "Basic scatter on surface",
    "spline": "Spline-based generation",
    "grid": "Grid/array placement",
    "biome": "Multi-layer biome scatter",
}

_COMMON_NODE_TYPES = {
    "SurfaceSampler": "PCGSurfaceSamplerSettings",
    "StaticMeshSpawner": "PCGStaticMeshSpawnerSettings",
    "DensityFilter": "PCGDensityFilterSettings",
    "Transform": "PCGTransformPointsSettings",
    "BoundsModifier": "PCGBoundsModifierSettings",
    "MeshSampler": "PCGMeshSamplerSettings",
    "Difference": "PCGDifferenceSettings",
    "Union": "PCGUnionSettings",
    "Intersection": "PCGIntersectionSettings",
    "PointFilter": "PCGPointFilterSettings",
    "SplineSampler": "PCGSplineSamplerSettings",
    "Copy": "PCGCopyPointsSettings",
    "Projection": "PCGProjectionSettings",
    "Density": "PCGDensityRemapSettings",
    "AttributeNoise": "PCGAttributeNoiseSettings",
    "DistanceFilter": "PCGDistanceFilterSettings",
    "GetActorData": "PCGGetActorDataSettings",
    "SubgraphInput": "PCGSubgraphInputSettings",
    "SubgraphOutput": "PCGSubgraphOutputSettings",
}


def _resolve_pcg_graph(asset_path: str) -> unreal.PCGGraphInterface:
    """Load and validate a PCG graph asset."""
    asset = require_asset(asset_path)
    if not isinstance(asset, unreal.PCGGraphInterface):
        raise ProcessingError(
            f"Asset is not a PCG graph: {asset_path}",
            operation="pcg",
            details={"asset_path": asset_path, "actual_type": asset.get_class().get_name()},
        )
    return asset


def _find_node_by_id(graph, node_id: str):
    """Find a PCG node in a graph by string ID."""
    for node in graph.get_nodes():
        if str(node.get_editor_property("node_guid")) == node_id:
            return node
    return None


def _resolve_node_settings_class(node_type: str):
    """Resolve a node type name to its UE settings class."""
    settings_name = _COMMON_NODE_TYPES.get(node_type, node_type)
    cls = getattr(unreal, settings_name, None)
    if cls is None:
        cls = getattr(unreal, f"PCG{node_type}Settings", None)
    return cls


@validate_inputs(
    {
        "graph_name": [RequiredRule(), TypeRule(str)],
        "target_folder": [RequiredRule(), TypeRule(str)],
        "template": [TypeRule(str, allow_none=True)],
        "description": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("pcg_create_graph")
@safe_operation("pcg")
def create_graph(
    graph_name: str,
    target_folder: str = "/Game/PCG",
    template: Optional[str] = None,
    description: Optional[str] = None,
) -> dict[str, Any]:
    """Create a new PCG graph asset with optional built-in template.

    Args:
        graph_name: Name for the new PCG graph
        target_folder: Destination folder in content browser
        template: Optional built-in template name (scatter, spline, grid, biome)
        description: Optional description metadata

    Returns:
        Dictionary with created graph path and details
    """
    if template and template not in _BUILT_IN_TEMPLATES:
        raise ProcessingError(
            f"Unknown template '{template}'",
            operation="pcg_create_graph",
            details={"template": template, "available": list(_BUILT_IN_TEMPLATES.keys())},
        )

    asset_path = f"{target_folder}/{graph_name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"PCG graph already exists at {asset_path}",
            operation="pcg_create_graph",
            details={"asset_path": asset_path},
        )

    if not unreal.EditorAssetLibrary.does_directory_exist(target_folder):
        unreal.EditorAssetLibrary.make_directory(target_folder)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.PCGGraphFactory()
    graph = asset_tools.create_asset(
        asset_name=graph_name,
        package_path=target_folder,
        asset_class=unreal.PCGGraph,
        factory=factory,
    )

    if not graph:
        raise ProcessingError(
            "Failed to create PCG graph",
            operation="pcg_create_graph",
            details={"asset_path": asset_path},
        )

    if template:
        _apply_template(graph, template)

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Created PCG graph: {asset_path} (template={template})")

    result: dict[str, Any] = {
        "success": True,
        "graphPath": asset_path,
        "graphName": graph_name,
    }
    if template:
        result["template"] = template
        result["templateDescription"] = _BUILT_IN_TEMPLATES[template]
    if description:
        result["description"] = description

    return result


def _apply_template(graph, template: str):
    """Apply a built-in template to a newly created PCG graph."""
    if template == "scatter":
        _apply_scatter_template(graph)
    elif template == "spline":
        _apply_spline_template(graph)
    elif template == "grid":
        _apply_grid_template(graph)
    elif template == "biome":
        _apply_biome_template(graph)


def _apply_scatter_template(graph):
    """Add surface sampler -> mesh spawner chain."""
    sampler_cls = getattr(unreal, "PCGSurfaceSamplerSettings", None)
    spawner_cls = getattr(unreal, "PCGStaticMeshSpawnerSettings", None)
    if sampler_cls:
        graph.add_node_of_type(sampler_cls)
    if spawner_cls:
        graph.add_node_of_type(spawner_cls)


def _apply_spline_template(graph):
    """Add spline sampler -> mesh spawner chain."""
    sampler_cls = getattr(unreal, "PCGSplineSamplerSettings", None)
    spawner_cls = getattr(unreal, "PCGStaticMeshSpawnerSettings", None)
    if sampler_cls:
        graph.add_node_of_type(sampler_cls)
    if spawner_cls:
        graph.add_node_of_type(spawner_cls)


def _apply_grid_template(graph):
    """Add copy points node for grid placement."""
    copy_cls = getattr(unreal, "PCGCopyPointsSettings", None)
    spawner_cls = getattr(unreal, "PCGStaticMeshSpawnerSettings", None)
    if copy_cls:
        graph.add_node_of_type(copy_cls)
    if spawner_cls:
        graph.add_node_of_type(spawner_cls)


def _apply_biome_template(graph):
    """Add surface sampler with density and filter nodes."""
    sampler_cls = getattr(unreal, "PCGSurfaceSamplerSettings", None)
    density_cls = getattr(unreal, "PCGDensityFilterSettings", None)
    spawner_cls = getattr(unreal, "PCGStaticMeshSpawnerSettings", None)
    if sampler_cls:
        graph.add_node_of_type(sampler_cls)
    if density_cls:
        graph.add_node_of_type(density_cls)
    if spawner_cls:
        graph.add_node_of_type(spawner_cls)


@validate_inputs(
    {
        "graph_path": [RequiredRule(), AssetPathRule()],
        "node_type": [RequiredRule(), TypeRule(str)],
        "label": [TypeRule(str, allow_none=True)],
        "position_x": [TypeRule((int, float), allow_none=True)],
        "position_y": [TypeRule((int, float), allow_none=True)],
    }
)
@handle_unreal_errors("pcg_add_node")
@safe_operation("pcg")
def add_node(
    graph_path: str,
    node_type: str,
    label: Optional[str] = None,
    position_x: float = 0,
    position_y: float = 0,
) -> dict[str, Any]:
    """Add a node to a PCG graph from available node types.

    Args:
        graph_path: Path to the PCG graph asset
        node_type: Node type name (e.g. SurfaceSampler, StaticMeshSpawner,
                   DensityFilter, Transform, PointFilter). Use pcg_search_palette
                   to discover available types.
        label: Optional display label for the node
        position_x: X position in graph editor
        position_y: Y position in graph editor

    Returns:
        Dictionary with created node ID and details
    """
    graph = _resolve_pcg_graph(graph_path)
    settings_cls = _resolve_node_settings_class(node_type)

    if not settings_cls:
        raise ProcessingError(
            f"Unknown PCG node type '{node_type}'",
            operation="pcg_add_node",
            details={
                "node_type": node_type,
                "known_types": list(_COMMON_NODE_TYPES.keys()),
                "hint": "Use pcg_search_palette to discover available types",
            },
        )

    node = graph.add_node_of_type(settings_cls)
    if not node:
        raise ProcessingError(
            f"Failed to create PCG node '{node_type}'",
            operation="pcg_add_node",
            details={"node_type": node_type, "settings_class": settings_cls.__name__},
        )

    node.set_editor_property("node_pos_x", int(position_x))
    node.set_editor_property("node_pos_y", int(position_y))

    if label:
        node.set_editor_property("node_comment", label)

    unreal.EditorAssetLibrary.save_asset(graph_path)
    node_id = str(node.get_editor_property("node_guid"))
    log_debug(f"Added PCG node '{node_type}' (id: {node_id}) to {graph_path}")

    return {
        "success": True,
        "graphPath": graph_path,
        "nodeId": node_id,
        "nodeType": node_type,
    }


@validate_inputs(
    {
        "graph_path": [RequiredRule(), AssetPathRule()],
        "source_node_id": [RequiredRule(), TypeRule(str)],
        "target_node_id": [RequiredRule(), TypeRule(str)],
        "source_pin": [TypeRule(str, allow_none=True)],
        "target_pin": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("pcg_connect_nodes")
@safe_operation("pcg")
def connect_nodes(
    graph_path: str,
    source_node_id: str,
    target_node_id: str,
    source_pin: Optional[str] = None,
    target_pin: Optional[str] = None,
) -> dict[str, Any]:
    """Wire a connection between two PCG nodes.

    Args:
        graph_path: Path to the PCG graph asset
        source_node_id: GUID of the source (output) node
        target_node_id: GUID of the target (input) node
        source_pin: Optional output pin label (defaults to first output)
        target_pin: Optional input pin label (defaults to first input)

    Returns:
        Dictionary with connection result
    """
    graph = _resolve_pcg_graph(graph_path)

    source_node = _find_node_by_id(graph, source_node_id)
    if not source_node:
        raise ProcessingError(
            f"Source node '{source_node_id}' not found",
            operation="pcg_connect_nodes",
            details={"source_node_id": source_node_id},
        )

    target_node = _find_node_by_id(graph, target_node_id)
    if not target_node:
        raise ProcessingError(
            f"Target node '{target_node_id}' not found",
            operation="pcg_connect_nodes",
            details={"target_node_id": target_node_id},
        )

    out_pin_idx = 0
    in_pin_idx = 0

    if source_pin:
        output_pins = source_node.get_output_pins()
        for i, pin in enumerate(output_pins):
            if str(pin.get_editor_property("pin_label")) == source_pin:
                out_pin_idx = i
                break

    if target_pin:
        input_pins = target_node.get_input_pins()
        for i, pin in enumerate(input_pins):
            if str(pin.get_editor_property("pin_label")) == target_pin:
                in_pin_idx = i
                break

    graph.add_edge(source_node, out_pin_idx, target_node, in_pin_idx)
    unreal.EditorAssetLibrary.save_asset(graph_path)

    log_debug(f"Connected PCG nodes {source_node_id} -> {target_node_id} in {graph_path}")

    return {
        "success": True,
        "graphPath": graph_path,
        "sourceNodeId": source_node_id,
        "targetNodeId": target_node_id,
    }


@validate_inputs(
    {
        "graph_path": [RequiredRule(), AssetPathRule()],
        "node_id": [RequiredRule(), TypeRule(str)],
        "property_name": [RequiredRule(), TypeRule(str)],
        "value": [RequiredRule()],
    }
)
@handle_unreal_errors("pcg_set_node_property")
@safe_operation("pcg")
def set_node_property(
    graph_path: str,
    node_id: str,
    property_name: str,
    value: Any,
) -> dict[str, Any]:
    """Configure a property on a PCG node's settings.

    Args:
        graph_path: Path to the PCG graph asset
        node_id: GUID of the target node
        property_name: Name of the property to set (e.g. PointsPerSquaredMeter,
                       bRemoveDuplicates, PointExtents)
        value: Value to assign to the property

    Returns:
        Dictionary with property update result
    """
    graph = _resolve_pcg_graph(graph_path)

    node = _find_node_by_id(graph, node_id)
    if not node:
        raise ProcessingError(
            f"Node '{node_id}' not found",
            operation="pcg_set_node_property",
            details={"node_id": node_id},
        )

    settings = node.get_settings()
    if not settings:
        raise ProcessingError(
            f"Node '{node_id}' has no configurable settings",
            operation="pcg_set_node_property",
            details={"node_id": node_id},
        )

    settings.set_editor_property(property_name, value)
    unreal.EditorAssetLibrary.save_asset(graph_path)

    log_debug(f"Set PCG node {node_id} property '{property_name}' in {graph_path}")

    return {
        "success": True,
        "graphPath": graph_path,
        "nodeId": node_id,
        "propertyName": property_name,
    }


@validate_inputs(
    {
        "query": [TypeRule(str, allow_none=True)],
        "category": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("pcg_search_palette")
@safe_operation("pcg")
def search_palette(
    query: Optional[str] = None,
    category: Optional[str] = None,
) -> dict[str, Any]:
    """Discover available PCG node types for use with pcg_add_node.

    Args:
        query: Optional search string to filter node types (case-insensitive)
        category: Optional category filter (sampler, filter, spawner, math, data)

    Returns:
        Dictionary with matching node types and descriptions
    """
    categories = {
        "sampler": ["SurfaceSampler", "SplineSampler", "MeshSampler"],
        "filter": ["DensityFilter", "PointFilter", "DistanceFilter"],
        "spawner": ["StaticMeshSpawner"],
        "math": ["Difference", "Union", "Intersection", "Density", "AttributeNoise"],
        "data": ["GetActorData", "SubgraphInput", "SubgraphOutput"],
        "transform": ["Transform", "Copy", "Projection", "BoundsModifier"],
    }

    results = []

    for name, settings_class in _COMMON_NODE_TYPES.items():
        if query and query.lower() not in name.lower() and query.lower() not in settings_class.lower():
            continue

        if category:
            in_category = False
            cat_members = categories.get(category.lower(), [])
            if name in cat_members:
                in_category = True
            if not in_category:
                continue

        results.append(
            {
                "nodeType": name,
                "settingsClass": settings_class,
            }
        )

    return {
        "success": True,
        "nodeTypes": results,
        "totalCount": len(results),
        "availableCategories": list(categories.keys()),
        "builtInTemplates": _BUILT_IN_TEMPLATES,
    }


@validate_inputs(
    {
        "graph_path": [RequiredRule(), AssetPathRule()],
        "actor_name": [RequiredRule(), TypeRule(str)],
        "location": [ListLengthRule(3, allow_none=True)],
        "rotation": [ListLengthRule(3, allow_none=True)],
        "scale": [ListLengthRule(3, allow_none=True)],
    }
)
@handle_unreal_errors("pcg_spawn_actor")
@safe_operation("pcg")
def spawn_actor(
    graph_path: str,
    actor_name: str,
    location: Optional[list[float]] = None,
    rotation: Optional[list[float]] = None,
    scale: Optional[list[float]] = None,
) -> dict[str, Any]:
    """Create a PCG component actor in the world referencing a PCG graph.

    Args:
        graph_path: Path to the PCG graph asset
        actor_name: Label for the spawned actor
        location: World location [X, Y, Z] (defaults to origin)
        rotation: Rotation [Roll, Pitch, Yaw] in degrees (defaults to zero)
        scale: Scale [X, Y, Z] (defaults to [1, 1, 1])

    Returns:
        Dictionary with spawned actor details
    """
    graph = _resolve_pcg_graph(graph_path)

    loc = location or [0, 0, 0]
    rot = rotation or [0, 0, 0]
    scl = scale or [1, 1, 1]

    ue_location = create_vector(loc)
    ue_rotation = create_rotator(rot)
    ue_scale = create_vector(scl)

    actor_subsystem = get_actor_subsystem()
    actor = actor_subsystem.spawn_actor_from_class(
        unreal.Actor,
        ue_location,
        ue_rotation,
    )

    if not actor:
        raise ProcessingError(
            "Failed to spawn PCG actor",
            operation="pcg_spawn_actor",
            details={"graph_path": graph_path},
        )

    actor.set_actor_label(actor_name)
    actor.set_actor_scale3d(ue_scale)

    pcg_component = actor.add_component_by_class(unreal.PCGComponent)
    if not pcg_component:
        raise ProcessingError(
            "Failed to add PCGComponent to actor",
            operation="pcg_spawn_actor",
            details={"actor_name": actor_name},
        )
    pcg_component.set_editor_property("graph", graph)

    log_debug(f"Spawned PCG actor '{actor_name}' with graph {graph_path}")

    return {
        "success": True,
        "actorName": actor_name,
        "graphPath": graph_path,
        "location": loc,
        "rotation": rot,
        "scale": scl,
    }


@validate_inputs(
    {
        "graph_path": [RequiredRule(), AssetPathRule()],
        "actor_name": [TypeRule(str, allow_none=True)],
        "generate_mode": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("pcg_execute")
@safe_operation("pcg")
def execute(
    graph_path: str,
    actor_name: Optional[str] = None,
    generate_mode: Optional[str] = None,
) -> dict[str, Any]:
    """Execute procedural generation on a PCG graph.

    Args:
        graph_path: Path to the PCG graph asset
        actor_name: Optional actor name to target (if multiple PCG actors exist).
                    If omitted, executes on all actors using this graph.
        generate_mode: Optional generation mode (full, iterative)

    Returns:
        Dictionary with execution result
    """
    _resolve_pcg_graph(graph_path)

    actor_subsystem = get_actor_subsystem()
    all_actors = actor_subsystem.get_all_level_actors()

    targets = []
    for actor in all_actors:
        if not actor:
            continue
        components = actor.get_components_by_class(unreal.PCGComponent)
        for comp in components:
            comp_graph = comp.get_editor_property("graph")
            if comp_graph and comp_graph.get_path_name().split(":")[0] == graph_path:
                if actor_name and actor.get_actor_label() != actor_name:
                    continue
                targets.append((actor, comp))

    if not targets:
        raise ProcessingError(
            f"No actors found using PCG graph '{graph_path}'",
            operation="pcg_execute",
            details={"graph_path": graph_path, "actor_name": actor_name},
        )

    executed = []
    for actor, comp in targets:
        comp.generate()
        executed.append(actor.get_actor_label())

    log_debug(f"Executed PCG graph {graph_path} on {len(executed)} actor(s)")

    return {
        "success": True,
        "graphPath": graph_path,
        "executedActors": executed,
        "actorCount": len(executed),
    }

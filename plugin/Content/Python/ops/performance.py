"""
Performance profiling operations for gathering rendering stats,
GPU timing info, and per-actor scene cost breakdowns.
"""

from typing import Any

import unreal

from utils.error_handling import (
    NumericRangeRule,
    TypeRule,
    handle_unreal_errors,
    safe_operation,
    validate_inputs,
)
from utils.general import log_debug


def _get_world():
    """Return the current editor world, or None."""
    editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    if editor_subsystem:
        return editor_subsystem.get_editor_world()
    return None


def _get_all_actors():
    """Return all actors in the current level."""
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    if not actor_subsystem:
        return []
    return actor_subsystem.get_all_level_actors()


def _safe_mesh_triangle_count(static_mesh) -> int:
    """Get triangle count from a StaticMesh using available API methods.

    Tries multiple approaches since UE Python API varies across versions.
    """
    # Approach 1: get_num_triangles if available
    if hasattr(static_mesh, "get_num_triangles"):
        return static_mesh.get_num_triangles(0)

    # Approach 2: get render data section info
    if hasattr(static_mesh, "get_num_sections") and hasattr(static_mesh, "get_section_info"):
        count = 0
        num_sections = static_mesh.get_num_sections(0)
        for i in range(num_sections):
            info = static_mesh.get_section_info(0, i)
            if info and hasattr(info, "num_triangles"):
                count += info.num_triangles
        return count

    # Approach 3: fallback indicator (returns -1 to signal unknown)
    return -1


def _safe_mesh_vertex_count(static_mesh) -> int:
    """Get vertex count from a StaticMesh using available API methods."""
    if hasattr(static_mesh, "get_num_vertices"):
        return static_mesh.get_num_vertices(0)

    if hasattr(static_mesh, "get_num_sections") and hasattr(static_mesh, "get_section_info"):
        count = 0
        num_sections = static_mesh.get_num_sections(0)
        for i in range(num_sections):
            info = static_mesh.get_section_info(0, i)
            if info and hasattr(info, "num_vertices"):
                count += info.num_vertices
        return count

    return -1


def _is_instanced_component(comp) -> bool:
    """Check if a component is an InstancedStaticMeshComponent (or subclass)."""
    return isinstance(comp, unreal.InstancedStaticMeshComponent)


@validate_inputs({})
@handle_unreal_errors("perf_rendering_stats")
@safe_operation("performance")
def rendering_stats() -> dict[str, Any]:
    """Get rendering statistics including draw calls, triangle count, and mesh breakdown.

    Returns:
        Dictionary with rendering statistics
    """
    actors = _get_all_actors()
    actor_count = len(actors)

    # Collect mesh stats
    total_triangles = 0
    total_vertices = 0
    static_mesh_component_count = 0
    skeletal_mesh_component_count = 0
    instanced_mesh_component_count = 0
    material_slot_count = 0
    light_count = 0
    unique_meshes: set = set()
    unique_materials: set = set()

    for actor in actors:
        # Static mesh components (excluding instanced, which are a subclass)
        sm_comps = actor.get_components_by_class(unreal.StaticMeshComponent)
        for comp in sm_comps:
            # Skip instanced components — they are counted separately below
            if _is_instanced_component(comp):
                continue

            sm = comp.static_mesh
            if not sm:
                continue
            static_mesh_component_count += 1

            mesh_path = sm.get_path_name()
            unique_meshes.add(mesh_path)

            # Materials
            mats = comp.get_materials()
            material_slot_count += len(mats)
            for mat in mats:
                if mat:
                    unique_materials.add(mat.get_path_name())

            # Tri/vert counts from LOD 0
            tri_count = _safe_mesh_triangle_count(sm)
            vert_count = _safe_mesh_vertex_count(sm)
            if tri_count > 0:
                total_triangles += tri_count
            if vert_count > 0:
                total_vertices += vert_count

        # Instanced static mesh components — count and include scaled tri/vert totals
        instanced_comps = actor.get_components_by_class(unreal.InstancedStaticMeshComponent)
        instanced_mesh_component_count += len(instanced_comps)
        for comp in instanced_comps:
            sm = comp.static_mesh
            if not sm:
                continue

            mesh_path = sm.get_path_name()
            unique_meshes.add(mesh_path)

            mats = comp.get_materials()
            material_slot_count += len(mats)
            for mat in mats:
                if mat:
                    unique_materials.add(mat.get_path_name())

            tri_count = _safe_mesh_triangle_count(sm)
            vert_count = _safe_mesh_vertex_count(sm)
            instance_count = max(1, comp.get_instance_count()) if hasattr(comp, "get_instance_count") else 1
            if tri_count > 0:
                total_triangles += tri_count * instance_count
            if vert_count > 0:
                total_vertices += vert_count * instance_count

        # Skeletal mesh components
        skeletal_mesh_component_count += len(actor.get_components_by_class(unreal.SkeletalMeshComponent))

        # Light components
        light_count += len(actor.get_components_by_class(unreal.LightComponent))

    log_debug(
        f"📊 rendering_stats: {actor_count} actors, "
        f"{total_triangles} tris, {static_mesh_component_count} mesh comps"
    )

    return {
        "success": True,
        "actor_count": actor_count,
        "total_triangles": total_triangles,
        "total_vertices": total_vertices,
        "static_mesh_components": static_mesh_component_count,
        "skeletal_mesh_components": skeletal_mesh_component_count,
        "instanced_mesh_components": instanced_mesh_component_count,
        "unique_meshes": len(unique_meshes),
        "unique_materials": len(unique_materials),
        "material_slot_count": material_slot_count,
        "light_count": light_count,
    }


@validate_inputs({})
@handle_unreal_errors("perf_gpu_stats")
@safe_operation("performance")
def gpu_stats() -> dict[str, Any]:
    """Get GPU and frame timing statistics via engine stat commands.

    Returns:
        Dictionary with GPU timing and memory info
    """
    world = _get_world()

    # Viewport/render info from the active level viewport
    actors = _get_all_actors()
    actor_count = len(actors)

    # Collect component type counts for estimated draw call approximation
    static_mesh_count = 0
    skeletal_mesh_count = 0
    light_count = 0

    for actor in actors:
        sm_comps = actor.get_components_by_class(unreal.StaticMeshComponent)
        static_mesh_count += len(sm_comps)

        sk_comps = actor.get_components_by_class(unreal.SkeletalMeshComponent)
        skeletal_mesh_count += len(sk_comps)

        light_comps = actor.get_components_by_class(unreal.LightComponent)
        light_count += len(light_comps)

    # Approximate draw call estimate: each mesh component is at least one draw
    # call per material section; this is a lower bound.
    estimated_draw_calls = static_mesh_count + skeletal_mesh_count

    # Execute stat console commands for additional info.
    # NOTE: These commands toggle stat displays in the viewport. In particular,
    # "stat unit" will toggle the frame timing overlay and may either enable
    # or disable it depending on its prior state.
    stat_commands_fired = []

    # Fire stat unit to toggle the frame timing overlay
    if world:
        unreal.SystemLibrary.execute_console_command(world, "stat unit")
        stat_commands_fired.append("stat unit")

    # Attempt to read platform memory stats
    memory_stats = {}
    if hasattr(unreal, "SystemLibrary"):
        if hasattr(unreal.SystemLibrary, "get_platform_memory_stats"):
            mem = unreal.SystemLibrary.get_platform_memory_stats()
            if mem:
                memory_stats = {
                    "total_physical_gb": (
                        round(mem.total_physical / (1024**3), 2) if hasattr(mem, "total_physical") else None
                    ),
                    "available_physical_gb": (
                        round(mem.available_physical / (1024**3), 2) if hasattr(mem, "available_physical") else None
                    ),
                }

    log_debug(f"📊 gpu_stats: {actor_count} actors, ~{estimated_draw_calls} estimated draw calls")

    return {
        "success": True,
        "actor_count": actor_count,
        "static_mesh_components": static_mesh_count,
        "skeletal_mesh_components": skeletal_mesh_count,
        "light_count": light_count,
        "estimated_draw_calls": estimated_draw_calls,
        "memory_stats": memory_stats,
        "stat_commands_fired": stat_commands_fired,
        "note": (
            "Console stat commands toggle in-viewport overlays (calling again disables them). "
            "For precise GPU timings, check the viewport stat overlay or use "
            "'stat gpu' / 'stat unit' / 'profilegpu' console commands."
        ),
    }


@validate_inputs(
    {
        "limit": [TypeRule(int), NumericRangeRule(min_val=1, max_val=10000)],
        "sort_by": [TypeRule(str)],
    }
)
@handle_unreal_errors("perf_scene_breakdown")
@safe_operation("performance")
def scene_breakdown(
    limit: int = 50,
    sort_by: str = "triangles",
) -> dict[str, Any]:
    """Get per-actor rendering cost breakdown with poly count, LOD, and material info.

    Args:
        limit: Maximum number of actors to return (default 50)
        sort_by: Sort key — 'triangles', 'vertices', 'materials', or 'name' (default 'triangles')

    Returns:
        Dictionary with per-actor rendering costs sorted by the chosen metric
    """
    valid_sort_keys = ("triangles", "vertices", "materials", "name")
    if sort_by not in valid_sort_keys:
        return {
            "success": False,
            "error": f"sort_by must be one of {valid_sort_keys}, got '{sort_by}'",
        }

    actors = _get_all_actors()
    actor_entries: list[dict[str, Any]] = []

    for actor in actors:
        sm_comps = actor.get_components_by_class(unreal.StaticMeshComponent)
        if not sm_comps:
            continue

        actor_name = actor.get_actor_label()
        actor_class = actor.get_class().get_name()
        actor_triangles = 0
        actor_vertices = 0
        actor_materials = 0
        actor_lod_count = 0
        mesh_details: list[dict[str, Any]] = []

        for comp in sm_comps:
            is_instanced = _is_instanced_component(comp)
            sm = comp.static_mesh
            if not sm:
                continue

            mesh_path = sm.get_path_name()
            mesh_name = sm.get_name()
            num_lods = sm.get_num_lods()
            actor_lod_count = max(actor_lod_count, num_lods)

            tri_count = _safe_mesh_triangle_count(sm)
            vert_count = _safe_mesh_vertex_count(sm)

            # For instanced components, scale by instance count
            instance_count = 1
            if is_instanced and hasattr(comp, "get_instance_count"):
                instance_count = max(1, comp.get_instance_count())

            mats = comp.get_materials()
            mat_names = [m.get_name() if m else "<empty>" for m in mats]
            actor_materials += len(mats)

            scaled_tris = tri_count * instance_count if tri_count > 0 else 0
            scaled_verts = vert_count * instance_count if vert_count > 0 else 0
            actor_triangles += scaled_tris
            actor_vertices += scaled_verts

            # Bounds
            bounds_origin = None
            bounds_extent = None
            if hasattr(comp, "bounds"):
                b = comp.bounds
                if b:
                    bounds_origin = [b.origin.x, b.origin.y, b.origin.z] if hasattr(b, "origin") else None
                    bounds_extent = (
                        [b.box_extent.x, b.box_extent.y, b.box_extent.z] if hasattr(b, "box_extent") else None
                    )

            entry = {
                "mesh_name": mesh_name,
                "mesh_path": mesh_path,
                "triangles": tri_count,
                "vertices": vert_count,
                "num_lods": num_lods,
                "materials": mat_names,
                "bounds_origin": bounds_origin,
                "bounds_extent": bounds_extent,
            }
            if is_instanced:
                entry["instance_count"] = instance_count
                entry["total_triangles"] = scaled_tris
                entry["total_vertices"] = scaled_verts

            mesh_details.append(entry)

        # Only add the actor if it has at least one valid mesh entry
        if mesh_details:
            actor_entries.append(
                {
                    "actor_name": actor_name,
                    "actor_class": actor_class,
                    "total_triangles": actor_triangles,
                    "total_vertices": actor_vertices,
                    "total_materials": actor_materials,
                    "max_lod_count": actor_lod_count,
                    "mesh_count": len(mesh_details),
                    "meshes": mesh_details,
                }
            )

    # Sort
    sort_key_map = {
        "triangles": lambda e: e["total_triangles"],
        "vertices": lambda e: e["total_vertices"],
        "materials": lambda e: e["total_materials"],
        "name": lambda e: e["actor_name"],
    }
    reverse = sort_by != "name"
    actor_entries.sort(key=sort_key_map[sort_by], reverse=reverse)

    # Compute scene-wide totals before applying limit
    scene_total_tris = sum(e["total_triangles"] for e in actor_entries)
    scene_total_verts = sum(e["total_vertices"] for e in actor_entries)
    actors_total_with_meshes = len(actor_entries)

    # Apply limit to determine which actors are returned
    returned_actors = actor_entries[:limit]

    log_debug(
        f"📊 scene_breakdown: {len(returned_actors)} actors returned, "
        f"{actors_total_with_meshes} total with meshes, {scene_total_tris} tris in scene"
    )

    return {
        "success": True,
        "actors_returned": len(returned_actors),
        "actors_total_with_meshes": actors_total_with_meshes,
        "scene_triangles": scene_total_tris,
        "scene_vertices": scene_total_verts,
        "sort_by": sort_by,
        "limit": limit,
        "actors": returned_actors,
    }

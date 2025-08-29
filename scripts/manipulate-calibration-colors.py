#!/usr/bin/env python3

"""
Simple functions to manipulate calibration grid colors
Works with any grid of actors
"""

import unreal
import random

def change_all_grid_colors(base_color=(1, 0, 0)):
    """Change all calibration grid actors to a single color."""
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    
    for actor in actors:
        name = actor.get_actor_label()
        if 'Calibration' in name or 'Grid' in name:
            change_actor_color(actor, base_color)
    
    print(f"Changed all grid actors to color {base_color}")

def change_actor_color(actor, color_rgb):
    """Change a single actor's color by modifying its material."""
    r, g, b = color_rgb
    
    # Get the mesh component
    mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    if not mesh_comp:
        return False
    
    # Create a dynamic material instance
    material = mesh_comp.get_material(0)
    if material:
        # Create dynamic material instance
        dynamic_material = unreal.KismetMaterialLibrary.create_dynamic_material_instance(
            actor,
            material,
            "DynamicMaterial"
        )
        
        # Set base color
        dynamic_material.set_vector_parameter_value(
            "BaseColor",
            unreal.LinearColor(r, g, b, 1.0)
        )
        
        # Apply to mesh
        mesh_comp.set_material(0, dynamic_material)
        return True
    
    return False

def create_rainbow_pattern():
    """Apply a rainbow pattern to the grid."""
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    grid_actors = [a for a in actors if 'Grid' in a.get_actor_label()]
    
    # Sort by name to ensure consistent ordering
    grid_actors.sort(key=lambda a: a.get_actor_label())
    
    # Rainbow colors
    colors = [
        (1, 0, 0),      # Red
        (1, 0.5, 0),    # Orange
        (1, 1, 0),      # Yellow
        (0, 1, 0),      # Green
        (0, 0, 1),      # Blue
        (0.29, 0, 0.51), # Indigo
        (0.93, 0.51, 0.93) # Violet
    ]
    
    for i, actor in enumerate(grid_actors):
        color = colors[i % len(colors)]
        change_actor_color(actor, color)
    
    print(f"Applied rainbow pattern to {len(grid_actors)} actors")

def create_checkerboard_pattern(color1=(1, 1, 1), color2=(0, 0, 0)):
    """Create a checkerboard pattern on the grid."""
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    
    for actor in actors:
        name = actor.get_actor_label()
        if 'Grid_' in name:
            # Extract row and column from name (assumes Grid_ROW_COL format)
            parts = name.split('_')
            if len(parts) >= 3:
                try:
                    row = int(parts[1])
                    col = int(parts[2])
                    
                    # Checkerboard logic
                    if (row + col) % 2 == 0:
                        change_actor_color(actor, color1)
                    else:
                        change_actor_color(actor, color2)
                except:
                    pass
    
    print("Created checkerboard pattern")

def randomize_colors():
    """Randomize all grid colors."""
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    grid_actors = [a for a in actors if 'Grid' in a.get_actor_label()]
    
    for actor in grid_actors:
        color = (random.random(), random.random(), random.random())
        change_actor_color(actor, color)
    
    print(f"Randomized colors for {len(grid_actors)} actors")

def create_gradient(start_color=(0, 0, 0), end_color=(1, 1, 1)):
    """Create a gradient across the grid."""
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    grid_actors = [a for a in actors if 'Grid' in a.get_actor_label()]
    
    # Sort by location to create spatial gradient
    grid_actors.sort(key=lambda a: a.get_actor_location().x + a.get_actor_location().y)
    
    count = len(grid_actors)
    if count == 0:
        return
    
    for i, actor in enumerate(grid_actors):
        # Interpolate between start and end color
        t = i / (count - 1) if count > 1 else 0
        
        r = start_color[0] + (end_color[0] - start_color[0]) * t
        g = start_color[1] + (end_color[1] - start_color[1]) * t
        b = start_color[2] + (end_color[2] - start_color[2]) * t
        
        change_actor_color(actor, (r, g, b))
    
    print(f"Created gradient across {count} actors")

# Example usage
if __name__ == "__main__":
    print("Calibration Color Manipulation Functions")
    print("========================================")
    print("Available functions:")
    print("- change_all_grid_colors((r,g,b))")
    print("- create_rainbow_pattern()")
    print("- create_checkerboard_pattern()")
    print("- randomize_colors()")
    print("- create_gradient()")
    print("")
    print("Example: create_rainbow_pattern()")
    
    # Uncomment to run:
    # create_rainbow_pattern()
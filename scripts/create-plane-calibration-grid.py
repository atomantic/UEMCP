#!/usr/bin/env python3

"""
Create a calibration grid using simple planes with material instances.
This approach uses flat planes which are easier to see and manipulate.
"""

import unreal
import math

def create_plane_calibration_grid():
    """Create a calibration grid using planes with different colors."""
    
    # Configuration
    GRID_SIZE = 8  # 8x8 grid
    PLANE_SIZE = 200  # Size of each plane
    SPACING = 10  # Gap between planes
    
    # Basic colors for calibration
    colors = [
        ("Red", unreal.LinearColor(1, 0, 0, 1)),
        ("Green", unreal.LinearColor(0, 1, 0, 1)),
        ("Blue", unreal.LinearColor(0, 0, 1, 1)),
        ("Yellow", unreal.LinearColor(1, 1, 0, 1)),
        ("Cyan", unreal.LinearColor(0, 1, 1, 1)),
        ("Magenta", unreal.LinearColor(1, 0, 1, 1)),
        ("White", unreal.LinearColor(1, 1, 1, 1)),
        ("Black", unreal.LinearColor(0.1, 0.1, 0.1, 1)),
    ]
    
    # Get the current level
    editor_subsystem = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    world = editor_subsystem.get_current_level()
    
    # Create a base material if it doesn't exist
    material_path = "/Game/Materials/M_CalibrationBase"
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    
    # Check if base material exists
    if not unreal.EditorAssetLibrary.does_asset_exist(material_path):
        # Create a simple unlit material
        material_factory = unreal.MaterialFactoryNew()
        material = asset_tools.create_asset(
            asset_name="M_CalibrationBase",
            package_path="/Game/Materials",
            asset_class=unreal.Material,
            factory=material_factory
        )
        
        # Make it unlit and set base color parameter
        material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
        unreal.MaterialEditingLibrary.create_material_expression(
            material,
            unreal.MaterialExpressionVectorParameter,
            -200, 0
        )
    
    # Create material instances for each color
    base_material = unreal.EditorAssetLibrary.load_asset(material_path)
    material_instances = {}
    
    for color_name, color_value in colors:
        instance_path = f"/Game/Materials/MI_Calibration_{color_name}"
        
        if not unreal.EditorAssetLibrary.does_asset_exist(instance_path):
            # Create material instance
            instance_factory = unreal.MaterialInstanceConstantFactoryNew()
            instance_factory.set_editor_property("parent", base_material)
            
            instance = asset_tools.create_asset(
                asset_name=f"MI_Calibration_{color_name}",
                package_path="/Game/Materials",
                asset_class=unreal.MaterialInstanceConstant,
                factory=instance_factory
            )
            
            # Set the color parameter
            unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(
                instance, "BaseColor", color_value
            )
            
        material_instances[color_name] = unreal.EditorAssetLibrary.load_asset(instance_path)
    
    # Create the grid of planes
    plane_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Plane")
    
    # Calculate grid center offset
    grid_offset = (GRID_SIZE - 1) * (PLANE_SIZE + SPACING) / 2
    
    # Spawn planes in grid
    spawned_actors = []
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            # Calculate position
            x = col * (PLANE_SIZE + SPACING) - grid_offset
            y = row * (PLANE_SIZE + SPACING) - grid_offset
            z = 0
            
            # Determine color
            color_index = (row * GRID_SIZE + col) % len(colors)
            color_name = colors[color_index][0]
            
            # Spawn plane actor
            location = unreal.Vector(x, y, z)
            rotation = unreal.Rotator(0, 0, 0)
            
            actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                plane_mesh, location, rotation
            )
            
            # Set name
            actor_name = f"CalibrationPlane_{row:02d}_{col:02d}_{color_name}"
            actor.set_actor_label(actor_name)
            
            # Scale the plane
            actor.set_actor_scale3d(unreal.Vector(PLANE_SIZE/100, PLANE_SIZE/100, 1))
            
            # Apply material
            mesh_component = actor.get_component_by_class(unreal.StaticMeshComponent)
            if mesh_component and color_name in material_instances:
                mesh_component.set_material(0, material_instances[color_name])
            
            # Add to folder
            actor.set_folder_path("CalibrationGrid/Planes")
            
            spawned_actors.append(actor)
    
    # Add coordinate labels using simple text actors
    for i in range(GRID_SIZE):
        # Row labels (0-7 on left side)
        x = -grid_offset - PLANE_SIZE
        y = i * (PLANE_SIZE + SPACING) - grid_offset
        create_text_label(f"{i}", x, y, 50)
        
        # Column labels (A-H on top)
        x = i * (PLANE_SIZE + SPACING) - grid_offset
        y = -grid_offset - PLANE_SIZE
        create_text_label(chr(65 + i), x, y, 50)  # A, B, C, etc.
    
    # Save the level
    unreal.EditorLevelLibrary.save_current_level()
    
    print(f"Created calibration grid with {len(spawned_actors)} planes")
    print("Grid uses simple material instances that can be easily modified")
    print("Each plane is named with its grid position and color")
    
    return spawned_actors

def create_text_label(text, x, y, z):
    """Create a simple text label at the specified position."""
    # Use Text Render Actor for labels
    text_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.TextRenderActor,
        unreal.Vector(x, y, z),
        unreal.Rotator(0, 90, 0)  # Face forward
    )
    
    if text_actor:
        text_component = text_actor.get_component_by_class(unreal.TextRenderComponent)
        if text_component:
            text_component.set_text(text)
            text_component.set_text_render_color(unreal.Color(255, 255, 255, 255))
            text_component.set_world_size(100)
            text_component.set_horizontal_alignment(unreal.TextRenderHorizAlign.EHTA_CENTER)
            text_component.set_vertical_alignment(unreal.TextRenderVertAlign.EVRTA_TEXT_CENTER)
        
        text_actor.set_actor_label(f"GridLabel_{text}")
        text_actor.set_folder_path("CalibrationGrid/Labels")
    
    return text_actor

# Run the script
if __name__ == "__main__":
    create_plane_calibration_grid()
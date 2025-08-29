#!/usr/bin/env python3
"""
Update the Demo project to use a simple calibration grid
This replaces the complex text-based calibration with simple colored shapes
"""

import unreal
import math

def clear_old_calibration():
    """Remove all existing calibration-related actors."""
    print("Clearing old calibration elements...")
    
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    removed_count = 0
    
    for actor in actors:
        name = actor.get_actor_label()
        # Remove anything with "Calibration", "HueChanging", "Text", or numbered text
        if any(keyword in name for keyword in ["Calibration", "HueChanging", "Text", "Numbers"]):
            unreal.EditorLevelLibrary.destroy_actor(actor)
            removed_count += 1
    
    print(f"Removed {removed_count} old calibration actors")
    return removed_count

def create_simple_calibration_grid():
    """Create a new simple calibration grid using colored cubes."""
    print("Creating new simple calibration grid...")
    
    # Grid configuration
    GRID_ROWS = 8
    GRID_COLS = 10
    CELL_SIZE = 150  # Distance between elements (150 units = 1.5 meters in UE)
    ELEMENT_SIZE = 0.8  # Scale of each element
    
    # Define simple colors (RGB values 0-1)
    colors = [
        ("Red", 1.0, 0.0, 0.0),
        ("Green", 0.0, 1.0, 0.0),
        ("Blue", 0.0, 0.0, 1.0),
        ("Yellow", 1.0, 1.0, 0.0),
        ("Cyan", 0.0, 1.0, 1.0),
        ("Magenta", 1.0, 0.0, 1.0),
        ("Orange", 1.0, 0.5, 0.0),
        ("Purple", 0.5, 0.0, 1.0),
        ("White", 1.0, 1.0, 1.0),
        ("Gray", 0.5, 0.5, 0.5),
    ]
    
    # Load basic shapes
    cube_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
    sphere_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere")
    cylinder_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")
    
    if not cube_mesh:
        print("Error: Could not load cube mesh")
        return
    
    # Calculate grid offset to center it
    offset_x = -(GRID_COLS - 1) * CELL_SIZE / 2
    offset_y = -(GRID_ROWS - 1) * CELL_SIZE / 2
    
    spawned_actors = []
    
    # Create grid elements
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            # Calculate position
            x = col * CELL_SIZE + offset_x
            y = row * CELL_SIZE + offset_y
            z = 50  # Slightly above ground
            
            # Choose shape based on position
            if row == 0 or row == GRID_ROWS - 1 or col == 0 or col == GRID_COLS - 1:
                # Use spheres for border
                mesh = sphere_mesh
                shape_name = "Sphere"
            elif (row + col) % 3 == 0:
                # Use cylinders for some variety
                mesh = cylinder_mesh
                shape_name = "Cylinder"
            else:
                # Use cubes for most elements
                mesh = cube_mesh
                shape_name = "Cube"
            
            # Spawn actor
            location = unreal.Vector(x, y, z)
            rotation = unreal.Rotator(0, 0, 0)
            actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                mesh, location, rotation
            )
            
            if actor:
                # Set name
                color_index = (row * GRID_COLS + col) % len(colors)
                color_name = colors[color_index][0]
                actor_name = f"CalibGrid_{row:02d}_{col:02d}_{shape_name}_{color_name}"
                actor.set_actor_label(actor_name)
                
                # Set scale
                actor.set_actor_scale3d(unreal.Vector(ELEMENT_SIZE, ELEMENT_SIZE, ELEMENT_SIZE))
                
                # Set folder for organization
                actor.set_folder_path("CalibrationGrid")
                
                # Apply color using dynamic material
                apply_color_to_actor(actor, colors[color_index])
                
                spawned_actors.append(actor)
    
    print(f"Created {len(spawned_actors)} calibration grid elements")
    
    # Add corner markers for orientation
    add_corner_markers(offset_x, offset_y, GRID_COLS, GRID_ROWS, CELL_SIZE)
    
    # Add a ground plane for reference
    add_ground_plane()
    
    return spawned_actors

def apply_color_to_actor(actor, color_tuple):
    """Apply a color to an actor using a dynamic material instance."""
    name, r, g, b = color_tuple
    
    mesh_component = actor.get_component_by_class(unreal.StaticMeshComponent)
    if not mesh_component:
        return
    
    # Get or create a basic material
    base_material = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/BasicShapeMaterial")
    if not base_material:
        base_material = unreal.EditorAssetLibrary.load_asset("/Engine/EngineDebugMaterials/VertexColorMaterial")
    
    if base_material:
        # Create dynamic material instance
        dynamic_material = unreal.KismetMaterialLibrary.create_dynamic_material_instance(
            actor,
            base_material,
            "DynamicColorMaterial"
        )
        
        # Try different parameter names that might exist
        param_names = ["BaseColor", "Color", "DiffuseColor", "Diffuse"]
        for param in param_names:
            try:
                dynamic_material.set_vector_parameter_value(
                    param,
                    unreal.LinearColor(r, g, b, 1.0)
                )
                break
            except (AttributeError, RuntimeError):
                continue
        
        # Apply the material
        mesh_component.set_material(0, dynamic_material)

def add_corner_markers(offset_x, offset_y, cols, rows, cell_size):
    """Add corner markers for orientation."""
    print("Adding corner markers...")
    
    cone_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cone")
    if not cone_mesh:
        return
    
    # Define corners
    corners = [
        ("NW", offset_x - cell_size/2, offset_y - cell_size/2, "North-West"),
        ("NE", offset_x + (cols-1) * cell_size + cell_size/2, offset_y - cell_size/2, "North-East"),
        ("SW", offset_x - cell_size/2, offset_y + (rows-1) * cell_size + cell_size/2, "South-West"),
        ("SE", offset_x + (cols-1) * cell_size + cell_size/2, offset_y + (rows-1) * cell_size + cell_size/2, "South-East"),
    ]
    
    for corner_id, x, y, full_name in corners:
        location = unreal.Vector(x, y, 100)
        rotation = unreal.Rotator(0, 0, 0)
        
        actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
            cone_mesh, location, rotation
        )
        
        if actor:
            actor.set_actor_label(f"Marker_{corner_id}_{full_name}")
            actor.set_actor_scale3d(unreal.Vector(0.5, 0.5, 1.0))
            actor.set_folder_path("CalibrationGrid/Markers")
            
            # Make markers yellow for visibility
            apply_color_to_actor(actor, ("Yellow", 1.0, 1.0, 0.0))

def add_ground_plane():
    """Add a ground plane for reference."""
    print("Adding ground plane...")
    
    plane_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Plane")
    if not plane_mesh:
        return
    
    location = unreal.Vector(0, 0, 0)
    rotation = unreal.Rotator(0, 0, 0)
    
    actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
        plane_mesh, location, rotation
    )
    
    if actor:
        actor.set_actor_label("CalibrationGroundPlane")
        actor.set_actor_scale3d(unreal.Vector(30, 30, 1))
        actor.set_folder_path("CalibrationGrid")
        
        # Make it dark gray
        apply_color_to_actor(actor, ("DarkGray", 0.2, 0.2, 0.2))

def create_test_patterns():
    """Create functions for testing different color patterns."""
    
    def apply_rainbow():
        """Apply rainbow pattern to the grid."""
        actors = unreal.EditorLevelLibrary.get_all_level_actors()
        grid_actors = [a for a in actors if a.get_actor_label().startswith("CalibGrid_")]
        
        rainbow = [
            ("Red", 1.0, 0.0, 0.0),
            ("Orange", 1.0, 0.5, 0.0),
            ("Yellow", 1.0, 1.0, 0.0),
            ("Green", 0.0, 1.0, 0.0),
            ("Blue", 0.0, 0.0, 1.0),
            ("Indigo", 0.29, 0.0, 0.51),
            ("Violet", 0.93, 0.51, 0.93),
        ]
        
        for i, actor in enumerate(grid_actors):
            color = rainbow[i % len(rainbow)]
            apply_color_to_actor(actor, color)
        
        print(f"Applied rainbow pattern to {len(grid_actors)} actors")
    
    def apply_checkerboard():
        """Apply checkerboard pattern."""
        actors = unreal.EditorLevelLibrary.get_all_level_actors()
        
        for actor in actors:
            label = actor.get_actor_label()
            if label.startswith("CalibGrid_"):
                # Extract row and col from name
                parts = label.split("_")
                if len(parts) >= 3:
                    try:
                        row = int(parts[1])
                        col = int(parts[2])
                        
                        if (row + col) % 2 == 0:
                            apply_color_to_actor(actor, ("White", 1.0, 1.0, 1.0))
                        else:
                            apply_color_to_actor(actor, ("Black", 0.1, 0.1, 0.1))
                    except (ValueError, IndexError):
                        pass
        
        print("Applied checkerboard pattern")
    
    return apply_rainbow, apply_checkerboard

def main():
    """Main function to update the calibration grid."""
    print("=" * 60)
    print("UPDATING CALIBRATION GRID IN DEMO PROJECT")
    print("=" * 60)
    
    # Clear old calibration
    clear_old_calibration()
    
    # Create new grid
    actors = create_simple_calibration_grid()
    
    # Save the level
    unreal.EditorLevelLibrary.save_current_level()
    
    print("\n" + "=" * 60)
    print("CALIBRATION GRID UPDATE COMPLETE!")
    print("=" * 60)
    print("\nThe calibration grid has been updated with:")
    print("- Simple colored shapes (cubes, spheres, cylinders)")
    print("- 8x10 grid with 10 different colors")
    print("- Corner markers for orientation")
    print("- Ground plane for reference")
    print("\nYou can now easily manipulate colors using:")
    print("- Dynamic material instances")
    print("- Simple RGB values")
    print("- Pattern functions (rainbow, checkerboard)")
    
    # Create test pattern functions
    apply_rainbow, apply_checkerboard = create_test_patterns()
    
    print("\nTo test patterns, run:")
    print("  apply_rainbow()")
    print("  apply_checkerboard()")
    
    return actors, apply_rainbow, apply_checkerboard

# Run the update
if __name__ == "__main__":
    actors, apply_rainbow, apply_checkerboard = main()
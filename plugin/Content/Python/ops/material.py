"""
UEMCP Material Operations - All material creation and management operations
"""

import unreal
from typing import Dict, Any, Optional
from utils import load_asset, asset_exists, log_error, log_debug
from utils.general import find_actor_by_name


class MaterialOperations:
    """Handles all material-related operations."""

    def list_materials(self, path="/Game", pattern="", limit=50):
        """List materials in a given path with optional name filtering.

        Args:
            path: Content browser path to search
            pattern: Optional pattern to filter material names
            limit: Maximum number of materials to return

        Returns:
            dict: Result with material list
        """
        try:
            asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

            # Get all assets by path, then filter for materials
            all_assets = asset_registry.get_assets_by_path(path, recursive=True)

            # Filter for material types
            assets = []
            for asset in all_assets:
                asset_type = (
                    str(asset.asset_class_path.asset_name)
                    if hasattr(asset.asset_class_path, "asset_name")
                    else str(asset.asset_class_path)
                )

                if asset_type in ["Material", "MaterialInstance", "MaterialInstanceConstant"]:
                    assets.append(asset)

            # Apply pattern filter if specified
            filtered_assets = assets
            if pattern:
                filtered_assets = []
                pattern_lower = pattern.lower()
                for asset in assets:
                    asset_name = str(asset.asset_name).lower()
                    if pattern_lower in asset_name:
                        filtered_assets.append(asset)

            # Build material list with limit
            material_list = []
            for i, asset in enumerate(filtered_assets):
                if i >= limit:
                    break

                material_info = {
                    "name": str(asset.asset_name),
                    "path": str(asset.package_name),
                    "type": (
                        str(asset.asset_class_path.asset_name)
                        if hasattr(asset.asset_class_path, "asset_name")
                        else str(asset.asset_class_path)
                    ),
                }

                # Try to get additional info about the material
                try:
                    material = load_asset(material_info["path"])
                    if material:
                        if isinstance(material, unreal.MaterialInstance):
                            # Get parent material
                            parent = material.get_editor_property("parent")
                            if parent:
                                material_info["parentMaterial"] = str(parent.get_path_name())

                        # Get basic material properties
                        if hasattr(material, "get_editor_property"):
                            material_info["domain"] = str(material.get_editor_property("material_domain"))
                        else:
                            material_info["domain"] = "Unknown"

                except Exception as e:
                    log_debug(f"Could not load additional info for material {material_info['path']}: {e}")

                material_list.append(material_info)

            return {
                "success": True,
                "materials": material_list,
                "totalCount": len(filtered_assets),
                "path": path,
                "pattern": pattern if pattern else None,
            }

        except Exception as e:
            log_error(f"Failed to list materials: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_material_info(self, material_path: str) -> Dict[str, Any]:
        """Get detailed information about a material.

        Args:
            material_path: Path to the material

        Returns:
            dict: Material information including parameters, textures, and properties
        """
        try:
            # Check if material exists first
            if not asset_exists(material_path):
                return {"success": False, "error": f"Material does not exist: {material_path}"}

            # Load the material
            material = load_asset(material_path)
            if not material:
                return {"success": False, "error": f"Failed to load material: {material_path}"}

            info = {
                "success": True,
                "materialPath": material_path,
                "materialType": material.get_class().get_name(),
                "name": str(material.get_name()),
            }

            # Get basic material properties
            try:
                if hasattr(material, "get_editor_property"):
                    info["domain"] = str(material.get_editor_property("material_domain"))
                    info["blendMode"] = str(material.get_editor_property("blend_mode"))
                    info["shadingModel"] = str(material.get_editor_property("shading_model"))
                    info["twoSided"] = bool(material.get_editor_property("two_sided"))
            except Exception as e:
                log_debug(f"Could not get basic properties: {e}")

            # Handle Material Instance specific info
            if isinstance(material, (unreal.MaterialInstance, unreal.MaterialInstanceConstant)):
                try:
                    # Get parent material
                    parent = material.get_editor_property("parent")
                    if parent:
                        info["parentMaterial"] = str(parent.get_path_name())

                    # Get scalar parameters
                    scalar_params = []
                    try:
                        scalar_param_names = material.get_scalar_parameter_names()
                        for param_name in scalar_param_names:
                            value = material.get_scalar_parameter_value(param_name)
                            scalar_params.append({"name": str(param_name), "value": float(value)})
                    except Exception as e:
                        log_debug(f"Could not get scalar parameters: {e}")

                    info["scalarParameters"] = scalar_params

                    # Get vector parameters
                    vector_params = []
                    try:
                        vector_param_names = material.get_vector_parameter_names()
                        for param_name in vector_param_names:
                            value = material.get_vector_parameter_value(param_name)
                            vector_params.append(
                                {
                                    "name": str(param_name),
                                    "value": {
                                        "r": float(value.r),
                                        "g": float(value.g),
                                        "b": float(value.b),
                                        "a": float(value.a),
                                    },
                                }
                            )
                    except Exception as e:
                        log_debug(f"Could not get vector parameters: {e}")

                    info["vectorParameters"] = vector_params

                    # Get texture parameters
                    texture_params = []
                    try:
                        texture_param_names = material.get_texture_parameter_names()
                        for param_name in texture_param_names:
                            texture = material.get_texture_parameter_value(param_name)
                            texture_params.append(
                                {"name": str(param_name), "texture": str(texture.get_path_name()) if texture else None}
                            )
                    except Exception as e:
                        log_debug(f"Could not get texture parameters: {e}")

                    info["textureParameters"] = texture_params

                except Exception as e:
                    log_debug(f"Error getting material instance parameters: {e}")

            return info

        except Exception as e:
            log_error(f"Failed to get material info: {str(e)}")
            return {"success": False, "error": str(e)}

    def create_material_instance(
        self,
        parent_material_path: str,
        instance_name: str,
        target_folder: str = "/Game/Materials",
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new material instance from a parent material.

        Args:
            parent_material_path: Path to the parent material
            instance_name: Name for the new material instance
            target_folder: Destination folder in content browser
            parameters: Dictionary of parameter overrides to set

        Returns:
            dict: Creation result with new material instance path
        """
        try:
            # Validate parent material exists
            if not asset_exists(parent_material_path):
                return {"success": False, "error": f"Parent material does not exist: {parent_material_path}"}

            parent_material = load_asset(parent_material_path)
            if not parent_material:
                return {"success": False, "error": f"Failed to load parent material: {parent_material_path}"}

            # Create the target path
            target_path = f"{target_folder}/{instance_name}"

            # Check if material instance already exists
            if asset_exists(target_path):
                return {"success": False, "error": f"Material instance already exists: {target_path}"}

            # Create material instance using AssetTools
            asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

            # Create material instance constant
            material_instance = asset_tools.create_asset(
                asset_name=instance_name,
                package_path=target_folder,
                asset_class=unreal.MaterialInstanceConstant,
                factory=unreal.MaterialInstanceConstantFactoryNew(),
            )

            if not material_instance:
                return {"success": False, "error": "Failed to create material instance asset"}

            # Set parent material
            material_instance.set_editor_property("parent", parent_material)

            # Apply parameter overrides if provided
            if parameters:
                self._apply_material_parameters(material_instance, parameters)

            # Save the asset
            unreal.EditorAssetLibrary.save_asset(target_path)

            return {
                "success": True,
                "materialInstancePath": target_path,
                "parentMaterial": parent_material_path,
                "name": instance_name,
                "appliedParameters": list(parameters.keys()) if parameters else [],
            }

        except Exception as e:
            log_error(f"Failed to create material instance: {str(e)}")
            return {"success": False, "error": str(e)}

    def apply_material_to_actor(self, actor_name: str, material_path: str, slot_index: int = 0) -> Dict[str, Any]:
        """Apply a material to a specific material slot on an actor.

        Args:
            actor_name: Name of the actor to modify
            material_path: Path to the material to apply
            slot_index: Material slot index (default: 0)

        Returns:
            dict: Application result
        """
        try:
            # Find the actor by name
            actor = find_actor_by_name(actor_name)
            if not actor:
                return {"success": False, "error": f"Actor not found: {actor_name}"}

            # Load the material
            if not asset_exists(material_path):
                return {"success": False, "error": f"Material does not exist: {material_path}"}

            material = load_asset(material_path)
            if not material:
                return {"success": False, "error": f"Failed to load material: {material_path}"}

            # Get the static mesh component
            static_mesh_component = None

            # Try different ways to get the mesh component
            if hasattr(actor, "static_mesh_component"):
                static_mesh_component = actor.static_mesh_component
            elif hasattr(actor, "get_component_by_class"):
                static_mesh_component = actor.get_component_by_class(unreal.StaticMeshComponent)
            else:
                # Get components and find first StaticMeshComponent
                components = actor.get_components_by_class(unreal.StaticMeshComponent)
                if components and len(components) > 0:
                    static_mesh_component = components[0]

            if not static_mesh_component:
                return {"success": False, "error": f"No static mesh component found on actor: {actor_name}"}

            # Apply the material to the specified slot
            static_mesh_component.set_material(slot_index, material)

            # Mark actor as modified
            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            editor_actor_subsystem.set_actor_selection_state(actor, True)

            return {
                "success": True,
                "actorName": actor_name,
                "materialPath": material_path,
                "slotIndex": slot_index,
                "componentName": static_mesh_component.get_name(),
            }

        except Exception as e:
            log_error(f"Failed to apply material to actor: {str(e)}")
            return {"success": False, "error": str(e)}

    def create_simple_material(
        self,
        material_name: str,
        target_folder: str = "/Game/Materials",
        base_color: Optional[Dict[str, float]] = None,
        metallic: float = 0.0,
        roughness: float = 0.5,
        emissive: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Create a simple material with basic parameters.

        Args:
            material_name: Name for the new material
            target_folder: Destination folder in content browser
            base_color: RGB color values (0-1 range) e.g. {'r': 1.0, 'g': 0.5, 'b': 0.0}
            metallic: Metallic value (0-1)
            roughness: Roughness value (0-1)
            emissive: RGB emissive color values (0-1 range)

        Returns:
            dict: Creation result with new material path
        """
        try:
            # Create the target path
            target_path = f"{target_folder}/{material_name}"

            # Check if material already exists
            if asset_exists(target_path):
                return {"success": False, "error": f"Material already exists: {target_path}"}

            # Create material using AssetTools
            asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

            material = asset_tools.create_asset(
                asset_name=material_name,
                package_path=target_folder,
                asset_class=unreal.Material,
                factory=unreal.MaterialFactoryNew(),
            )

            if not material:
                return {"success": False, "error": "Failed to create material asset"}

            # Set basic material properties
            material.set_editor_property("two_sided", False)

            # Create and connect material expression nodes if values are provided
            material_editor = unreal.MaterialEditingLibrary

            # Base Color
            if base_color:
                color_node = unreal.MaterialEditingLibrary.create_material_expression(
                    material, unreal.MaterialExpressionVectorParameter
                )
                color_node.set_editor_property("parameter_name", "BaseColor")
                color_node.set_editor_property(
                    "default_value",
                    unreal.LinearColor(
                        base_color.get("r", 1.0), base_color.get("g", 1.0), base_color.get("b", 1.0), 1.0
                    ),
                )

                # Connect to base color
                material_editor.connect_material_property(color_node, "", unreal.MaterialProperty.MP_BASE_COLOR)

            # Metallic
            if metallic != 0.0:
                metallic_node = unreal.MaterialEditingLibrary.create_material_expression(
                    material, unreal.MaterialExpressionScalarParameter
                )
                metallic_node.set_editor_property("parameter_name", "Metallic")
                metallic_node.set_editor_property("default_value", metallic)

                material_editor.connect_material_property(metallic_node, "", unreal.MaterialProperty.MP_METALLIC)

            # Roughness
            roughness_node = unreal.MaterialEditingLibrary.create_material_expression(
                material, unreal.MaterialExpressionScalarParameter
            )
            roughness_node.set_editor_property("parameter_name", "Roughness")
            roughness_node.set_editor_property("default_value", roughness)

            material_editor.connect_material_property(roughness_node, "", unreal.MaterialProperty.MP_ROUGHNESS)

            # Emissive
            if emissive:
                emissive_node = unreal.MaterialEditingLibrary.create_material_expression(
                    material, unreal.MaterialExpressionVectorParameter
                )
                emissive_node.set_editor_property("parameter_name", "EmissiveColor")
                emissive_node.set_editor_property(
                    "default_value",
                    unreal.LinearColor(emissive.get("r", 0.0), emissive.get("g", 0.0), emissive.get("b", 0.0), 1.0),
                )

                material_editor.connect_material_property(emissive_node, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

            # Recompile the material
            unreal.MaterialEditingLibrary.recompile_material(material)

            # Save the asset
            unreal.EditorAssetLibrary.save_asset(target_path)

            return {
                "success": True,
                "materialPath": target_path,
                "name": material_name,
                "properties": {
                    "baseColor": base_color,
                    "metallic": metallic,
                    "roughness": roughness,
                    "emissive": emissive,
                },
            }

        except Exception as e:
            log_error(f"Failed to create simple material: {str(e)}")
            return {"success": False, "error": str(e)}

    def _apply_material_parameters(self, material_instance, parameters: Dict[str, Any]):
        """Apply parameter overrides to a material instance.

        Args:
            material_instance: The material instance to modify
            parameters: Dictionary of parameter name -> value mappings
        """
        try:
            for param_name, param_value in parameters.items():
                if isinstance(param_value, (int, float)):
                    # Scalar parameter
                    material_instance.set_scalar_parameter_value(param_name, float(param_value))
                elif isinstance(param_value, dict) and all(k in param_value for k in ["r", "g", "b"]):
                    # Vector parameter (color)
                    color = unreal.LinearColor(
                        param_value["r"], param_value["g"], param_value["b"], param_value.get("a", 1.0)
                    )
                    material_instance.set_vector_parameter_value(param_name, color)
                elif isinstance(param_value, str) and asset_exists(param_value):
                    # Texture parameter
                    texture = load_asset(param_value)
                    if texture:
                        material_instance.set_texture_parameter_value(param_name, texture)
                else:
                    log_debug(f"Unsupported parameter type for {param_name}: {type(param_value)}")

        except Exception as e:
            log_error(f"Error applying material parameters: {str(e)}")
            raise

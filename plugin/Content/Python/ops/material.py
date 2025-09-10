"""
UEMCP Material Operations - All material creation and management operations

Enhanced with improved error handling framework to eliminate try/catch boilerplate.
"""

from typing import Any, Dict, Optional

import unreal

from utils import asset_exists, load_asset, log_debug

# Enhanced error handling framework
from utils.error_handling import (
    AssetPathRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    ValidationError,
    handle_unreal_errors,
    require_actor,
    require_asset,
    safe_operation,
    validate_inputs,
)


class MaterialOperations:
    """Handles all material-related operations."""

    @validate_inputs({"path": [RequiredRule(), TypeRule(str)], "pattern": [TypeRule(str)], "limit": [TypeRule(int)]})
    @handle_unreal_errors("list_materials")
    @safe_operation("material")
    def list_materials(self, path: str = "/Game", pattern: str = "", limit: int = 50):
        """List materials in a given path with optional name filtering.

        Args:
            path: Content browser path to search
            pattern: Optional pattern to filter material names
            limit: Maximum number of materials to return

        Returns:
            dict: Result with material list
        """
        asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
        all_assets = asset_registry.get_assets_by_path(path, recursive=True)

        # Filter for material types
        material_assets = self._filter_material_assets(all_assets)

        # Apply pattern filter if specified
        filtered_assets = self._apply_pattern_filter(material_assets, pattern)

        # Build material list with limit
        material_list = self._build_material_list(filtered_assets, limit)

        return {
            "materials": material_list,
            "totalCount": len(filtered_assets),
            "path": path,
            "pattern": pattern if pattern else None,
        }

    def _filter_material_assets(self, all_assets):
        """Filter assets to only include materials.

        Args:
            all_assets: List of all assets

        Returns:
            list: Filtered material assets
        """
        material_types = ["Material", "MaterialInstance", "MaterialInstanceConstant"]
        assets = []

        for asset in all_assets:
            asset_type = self._get_asset_type(asset)
            if asset_type in material_types:
                assets.append(asset)

        return assets

    def _get_asset_type(self, asset):
        """Get the type of an asset.

        Args:
            asset: Asset to get type for

        Returns:
            str: Asset type
        """
        if hasattr(asset.asset_class_path, "asset_name"):
            return str(asset.asset_class_path.asset_name)
        return str(asset.asset_class_path)

    def _apply_pattern_filter(self, assets, pattern):
        """Apply pattern filter to assets.

        Args:
            assets: List of assets
            pattern: Filter pattern

        Returns:
            list: Filtered assets
        """
        if not pattern:
            return assets

        filtered_assets = []
        pattern_lower = pattern.lower()

        for asset in assets:
            asset_name = str(asset.asset_name).lower()
            if pattern_lower in asset_name:
                filtered_assets.append(asset)

        return filtered_assets

    def _build_material_list(self, filtered_assets, limit):
        """Build the material list with additional info.

        Args:
            filtered_assets: List of filtered assets
            limit: Maximum number of materials

        Returns:
            list: Material information list
        """
        material_list = []

        for i, asset in enumerate(filtered_assets):
            if i >= limit:
                break

            material_info = self._get_basic_material_info(asset)
            self._add_extended_material_info(material_info)
            material_list.append(material_info)

        return material_list

    def _get_basic_material_info(self, asset):
        """Get basic material information.

        Args:
            asset: Material asset

        Returns:
            dict: Basic material information
        """
        return {
            "name": str(asset.asset_name),
            "path": str(asset.package_name),
            "type": self._get_asset_type(asset),
        }

    def _add_extended_material_info(self, material_info):
        """Add extended information about a material.

        Args:
            material_info: Material info dictionary to extend
        """
        material = load_asset(material_info["path"])
        if not material:
            log_debug(f"Could not load material: {material_info['path']}")
            return

        # Add parent material for instances
        if isinstance(material, unreal.MaterialInstance):
            if hasattr(material, "get_editor_property"):
                parent = material.get_editor_property("parent")
                if parent:
                    material_info["parentMaterial"] = str(parent.get_path_name())

        # Add material domain
        if hasattr(material, "get_editor_property"):
            material_info["domain"] = str(material.get_editor_property("material_domain"))
        else:
            material_info["domain"] = "Unknown"

    @validate_inputs({"material_path": [RequiredRule(), AssetPathRule()]})
    @handle_unreal_errors("get_material_info")
    @safe_operation("material")
    def get_material_info(self, material_path: str) -> Dict[str, Any]:
        """Get detailed information about a material.

        Args:
            material_path: Path to the material

        Returns:
            dict: Material information including parameters, textures, and properties
        """
        # Load material using error handling framework
        material = require_asset(material_path)

        # Build basic info
        info = self._build_basic_material_info(material, material_path)

        # Add material properties
        self._add_material_properties(info, material)

        # Handle Material Instance specific info
        if isinstance(material, (unreal.MaterialInstance, unreal.MaterialInstanceConstant)):
            self._add_material_instance_info(info, material)

        return info

    def _validate_and_load_material(self, material_path):
        """Validate material exists and load it.

        Args:
            material_path: Path to the material

        Returns:
            tuple: (material object, error dict or None)
        """
        if not asset_exists(material_path):
            return None, {"success": False, "error": f"Material does not exist: {material_path}"}

        material = load_asset(material_path)
        if not material:
            return None, {"success": False, "error": f"Failed to load material: {material_path}"}

        return material, None

    def _build_basic_material_info(self, material, material_path):
        """Build basic material information.

        Args:
            material: Material object
            material_path: Path to the material

        Returns:
            dict: Basic material information
        """
        return {
            "success": True,
            "materialPath": material_path,
            "materialType": material.get_class().get_name(),
            "name": str(material.get_name()),
        }

    def _add_material_properties(self, info, material):
        """Add basic material properties to info.

        Args:
            info: Material info dictionary
            material: Material object
        """
        if hasattr(material, "get_editor_property"):
            info["domain"] = str(material.get_editor_property("material_domain"))
            info["blendMode"] = str(material.get_editor_property("blend_mode"))
            info["shadingModel"] = str(material.get_editor_property("shading_model"))
            info["twoSided"] = bool(material.get_editor_property("two_sided"))
        else:
            log_debug("Material does not support get_editor_property")

    def _add_material_instance_info(self, info, material):
        """Add material instance specific information.

        Args:
            info: Material info dictionary
            material: Material instance object
        """
        # Get parent material
        if hasattr(material, "get_editor_property"):
            parent = material.get_editor_property("parent")
            if parent:
                info["parentMaterial"] = str(parent.get_path_name())

        # Get all parameter types
        info["scalarParameters"] = self._get_scalar_parameters(material)
        info["vectorParameters"] = self._get_vector_parameters(material)
        info["textureParameters"] = self._get_texture_parameters(material)

    def _get_scalar_parameters(self, material):
        """Get scalar parameters from material.

        Args:
            material: Material instance

        Returns:
            list: Scalar parameters
        """
        scalar_params = []
        if hasattr(material, "get_scalar_parameter_names"):
            scalar_param_names = material.get_scalar_parameter_names()
            for param_name in scalar_param_names:
                value = material.get_scalar_parameter_value(param_name)
                scalar_params.append({"name": str(param_name), "value": float(value)})
        else:
            log_debug("Material does not support scalar parameters")
        return scalar_params

    def _get_vector_parameters(self, material):
        """Get vector parameters from material.

        Args:
            material: Material instance

        Returns:
            list: Vector parameters
        """
        vector_params = []
        if hasattr(material, "get_vector_parameter_names"):
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
        else:
            log_debug("Material does not support vector parameters")
        return vector_params

    def _get_texture_parameters(self, material):
        """Get texture parameters from material.

        Args:
            material: Material instance

        Returns:
            list: Texture parameters
        """
        texture_params = []
        if hasattr(material, "get_texture_parameter_names"):
            texture_param_names = material.get_texture_parameter_names()
            for param_name in texture_param_names:
                texture = material.get_texture_parameter_value(param_name)
                texture_params.append(
                    {"name": str(param_name), "texture": str(texture.get_path_name()) if texture else None}
                )
        else:
            log_debug("Material does not support texture parameters")
        return texture_params

    @validate_inputs(
        {
            "parent_material_path": [RequiredRule(), AssetPathRule()],
            "instance_name": [RequiredRule(), TypeRule(str)],
            "target_folder": [TypeRule(str)],
            "parameters": [TypeRule(dict, allow_none=True)],
        }
    )
    @handle_unreal_errors("create_material_instance")
    @safe_operation("material")
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
        # Validate parent material exists
        parent_material = require_asset(parent_material_path)

        # Create the target path
        target_path = f"{target_folder}/{instance_name}"

        # Check if material instance already exists
        if asset_exists(target_path):
            raise ValidationError(f"Material instance already exists: {target_path}")

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
            raise ProcessingError("Failed to create material instance asset")

        # Set parent material
        material_instance.set_editor_property("parent", parent_material)

        # Apply parameter overrides if provided
        if parameters:
            self._apply_material_parameters(material_instance, parameters)

        # Save the asset
        unreal.EditorAssetLibrary.save_asset(target_path)

        return {
            "materialInstancePath": target_path,
            "parentMaterial": parent_material_path,
            "name": instance_name,
            "appliedParameters": list(parameters.keys()) if parameters else [],
        }

    @validate_inputs(
        {
            "actor_name": [RequiredRule(), TypeRule(str)],
            "material_path": [RequiredRule(), AssetPathRule()],
            "slot_index": [TypeRule(int)],
        }
    )
    @handle_unreal_errors("apply_material_to_actor")
    @safe_operation("material")
    def apply_material_to_actor(self, actor_name: str, material_path: str, slot_index: int = 0) -> Dict[str, Any]:
        """Apply a material to a specific material slot on an actor.

        Args:
            actor_name: Name of the actor to modify
            material_path: Path to the material to apply
            slot_index: Material slot index (default: 0)

        Returns:
            dict: Application result
        """
        # Find the actor by name
        actor = require_actor(actor_name)

        # Load the material
        material = require_asset(material_path)

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
            raise ProcessingError(f"No static mesh component found on actor: {actor_name}")

        # Apply the material to the specified slot
        static_mesh_component.set_material(slot_index, material)

        # Mark actor as modified
        editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        editor_actor_subsystem.set_actor_selection_state(actor, True)

        return {
            "actorName": actor_name,
            "materialPath": material_path,
            "slotIndex": slot_index,
            "componentName": static_mesh_component.get_name(),
        }

    @validate_inputs(
        {
            "material_name": [RequiredRule(), TypeRule(str)],
            "target_folder": [TypeRule(str)],
            "base_color": [TypeRule(dict, allow_none=True)],
            "metallic": [TypeRule((int, float))],
            "roughness": [TypeRule((int, float))],
            "emissive": [TypeRule(dict, allow_none=True)],
        }
    )
    @handle_unreal_errors("create_simple_material")
    @safe_operation("material")
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
        # Create the target path
        target_path = f"{target_folder}/{material_name}"

        # Check if material already exists
        if asset_exists(target_path):
            raise ValidationError(f"Material already exists: {target_path}")

        # Create material using AssetTools
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

        material = asset_tools.create_asset(
            asset_name=material_name,
            package_path=target_folder,
            asset_class=unreal.Material,
            factory=unreal.MaterialFactoryNew(),
        )

        if not material:
            raise ProcessingError("Failed to create material asset")

        # Set basic material properties
        material.set_editor_property("two_sided", False)

        # Create and connect material expression nodes if values are
        # provided
        material_editor = unreal.MaterialEditingLibrary

        # Base Color
        if base_color:
            color_node = unreal.MaterialEditingLibrary.create_material_expression(
                material, unreal.MaterialExpressionVectorParameter
            )
            color_node.set_editor_property("parameter_name", "BaseColor")
            color_node.set_editor_property(
                "default_value",
                unreal.LinearColor(base_color.get("r", 1.0), base_color.get("g", 1.0), base_color.get("b", 1.0), 1.0),
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
            "materialPath": target_path,
            "name": material_name,
            "properties": {
                "baseColor": base_color,
                "metallic": metallic,
                "roughness": roughness,
                "emissive": emissive,
            },
        }

    def _apply_material_parameters(self, material_instance, parameters: Dict[str, Any]):
        """Apply parameter overrides to a material instance.

        Args:
            material_instance: The material instance to modify
            parameters: Dictionary of parameter name -> value mappings
        """
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

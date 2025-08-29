"""
Blueprint manipulation operations for creating and modifying Blueprint classes.
"""

import unreal
from typing import Dict, List, Optional, Any
from utils.logger import log_info, log_error, log_warning


def create(
    class_name: str,
    parent_class: str = 'Actor',
    target_folder: str = '/Game/Blueprints',
    components: Optional[List[Dict[str, Any]]] = None,
    variables: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Create a new Blueprint class.

    Args:
        class_name: Name for the new Blueprint class
        parent_class: Parent class name or path
        target_folder: Destination folder for the Blueprint
        components: Optional list of components to add
        variables: Optional list of variables to add

    Returns:
        Dictionary with creation result
    """
    try:
        # Ensure target folder exists
        if not unreal.EditorAssetLibrary.does_directory_exist(target_folder):
            unreal.EditorAssetLibrary.make_directory(target_folder)

        # Construct the full asset path
        asset_path = f"{target_folder}/{class_name}"

        # Check if Blueprint already exists
        if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
            return {
                'success': False,
                'error': f'Blueprint already exists at {asset_path}'
            }

        # Resolve parent class
        parent_class_obj = None
        if '/' in parent_class:
            # It's a path to another Blueprint
            parent_asset = unreal.EditorAssetLibrary.load_asset(parent_class)
            if parent_asset and isinstance(parent_asset, unreal.Blueprint):
                parent_class_obj = parent_asset.generated_class()
            else:
                return {
                    'success': False,
                    'error': f'Parent Blueprint not found: {parent_class}'
                }
        else:
            # It's a native class name
            parent_class_mapping = {
                'Actor': unreal.Actor,
                'Pawn': unreal.Pawn,
                'Character': unreal.Character,
                'GameMode': unreal.GameModeBase,
                'PlayerController': unreal.PlayerController,
                'ActorComponent': unreal.ActorComponent,
                'SceneComponent': unreal.SceneComponent,
            }

            parent_class_obj = parent_class_mapping.get(
                parent_class, unreal.Actor
            )

        # Create the Blueprint asset
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        blueprint_factory = unreal.BlueprintFactory()
        blueprint_factory.set_editor_property('parent_class', parent_class_obj)

        # Create the Blueprint
        blueprint = asset_tools.create_asset(
            asset_name=class_name,
            package_path=target_folder,
            asset_class=unreal.Blueprint,
            factory=blueprint_factory
        )

        if not blueprint:
            return {
                'success': False,
                'error': 'Failed to create Blueprint asset'
            }

        # Note: Direct modification of Blueprint classes via Python is limited

        # Add components if specified
        if components:
            log_warning(
                "Component addition to Blueprints is not yet implemented "
                "due to Unreal Python API limitations. Components were not added."
            )
            for comp_def in components:
                comp_name = comp_def.get('name')
                comp_type = comp_def.get('type')
                if comp_name and comp_type:
                    # Note: This only logs the intended components
                    # Actual addition requires Blueprint editor subsystem
                    log_info(
                        f"Component {comp_name} ({comp_type}) requested but "
                        f"not added - requires manual addition in Blueprint editor"
                    )

        # Add variables if specified
        if variables:
            log_warning(
                "Variable addition to Blueprints is not yet implemented "
                "due to Unreal Python API limitations. Variables were not added."
            )
            for var_def in variables:
                var_name = var_def.get('name')
                var_type = var_def.get('type')
                if var_name and var_type:
                    # Note: This only logs the intended variables
                    # Actual addition requires Blueprint editor subsystem
                    log_info(
                        f"Variable {var_name} ({var_type}) requested but "
                        f"not added - requires manual addition in Blueprint editor"
                    )

        # Compile the Blueprint
        unreal.EditorAssetLibrary.save_asset(asset_path)

        log_info(f"Created Blueprint: {asset_path}")

        result = {
            'success': True,
            'blueprintPath': asset_path
        }

        # Include warnings about limitations
        if components:
            result['componentsNotAdded'] = [
                f"{c.get('name')} ({c.get('type')})"
                for c in components
                if c.get('name') and c.get('type')
            ]
            result['componentWarning'] = (
                "Components were not added due to UE Python API limitations. "
                "Please add them manually in the Blueprint editor."
            )

        if variables:
            result['variablesNotAdded'] = [
                f"{v.get('name')}: {v.get('type')}"
                for v in variables
                if v.get('name') and v.get('type')
            ]
            result['variableWarning'] = (
                "Variables were not added due to UE Python API limitations. "
                "Please add them manually in the Blueprint editor."
            )

        return result

    except Exception as e:
        log_error(f"Error creating Blueprint: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def add_component(
    blueprint_path: str,
    component_name: str,
    component_type: str,
    parent_component: Optional[str] = None,
    attach_socket_name: Optional[str] = None,
    relative_location: Optional[List[float]] = None,
    relative_rotation: Optional[List[float]] = None,
    relative_scale: Optional[List[float]] = None,
    properties: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Add a component to an existing Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset
        component_name: Name for the new component
        component_type: Type of component to add
        parent_component: Optional parent component name
        attach_socket_name: Optional socket for attachment
        relative_location: Relative location [X, Y, Z]
        relative_rotation: Relative rotation [Roll, Pitch, Yaw]
        relative_scale: Relative scale [X, Y, Z]
        properties: Additional properties to set

    Returns:
        Dictionary with operation result
    """
    try:
        # Load the Blueprint
        blueprint = unreal.EditorAssetLibrary.load_asset(blueprint_path)
        if not blueprint or not isinstance(blueprint, unreal.Blueprint):
            return {
                'success': False,
                'error': f'Blueprint not found: {blueprint_path}'
            }

        # Note: The Unreal Python API has severe limitations for modifying
        # Blueprints. Component addition is not actually implemented.

        log_warning(
            f"Component addition not implemented: {component_name} of type "
            f"{component_type} was NOT added to {blueprint_path}. "
            f"Manual addition in Blueprint editor is required."
        )

        return {
            'success': False,
            'error': (
                f'Component addition is not implemented due to UE Python API limitations. '
                f'Please add {component_name} ({component_type}) manually in the Blueprint editor.'
            ),
            'blueprintPath': blueprint_path,
            'requestedComponent': {
                'name': component_name,
                'type': component_type,
                'properties': properties
            }
        }

    except Exception as e:
        log_error(f"Error adding component to Blueprint: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def set_variable(
    blueprint_path: str,
    variable_name: str,
    variable_type: str,
    default_value: Optional[Any] = None,
    is_editable: bool = True,
    is_read_only: bool = False,
    category: str = 'Default',
    tooltip: Optional[str] = None,
    replication_mode: str = 'None'
) -> Dict[str, Any]:
    """
    Create or modify a Blueprint variable.

    Args:
        blueprint_path: Path to the Blueprint asset
        variable_name: Name of the variable
        variable_type: Type of the variable
        default_value: Default value for the variable
        is_editable: Whether the variable is editable in instances
        is_read_only: Whether the variable is read-only
        category: Category for organizing the variable
        tooltip: Tooltip text for the variable
        replication_mode: Replication mode for multiplayer

    Returns:
        Dictionary with operation result
    """
    try:
        # Load the Blueprint
        blueprint = unreal.EditorAssetLibrary.load_asset(blueprint_path)
        if not blueprint or not isinstance(blueprint, unreal.Blueprint):
            return {
                'success': False,
                'error': f'Blueprint not found: {blueprint_path}'
            }

        # Note: The Unreal Python API has severe limitations for modifying
        # Blueprint variables. Variable addition is not actually implemented.

        log_warning(
            f"Variable addition not implemented: {variable_name} of type "
            f"{variable_type} was NOT added to {blueprint_path}. "
            f"Manual addition in Blueprint editor is required."
        )

        return {
            'success': False,
            'error': (
                f'Variable addition is not implemented due to UE Python API limitations. '
                f'Please add {variable_name} ({variable_type}) manually in the Blueprint editor.'
            ),
            'blueprintPath': blueprint_path,
            'requestedVariable': {
                'name': variable_name,
                'type': variable_type,
                'defaultValue': default_value,
                'isEditable': is_editable,
                'isReadOnly': is_read_only,
                'category': category,
                'tooltip': tooltip,
                'replicationMode': replication_mode
            }
        }

    except Exception as e:
        log_error(f"Error setting Blueprint variable: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def get_info(blueprint_path: str) -> Dict[str, Any]:
    """
    Get detailed information about a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset

    Returns:
        Dictionary with Blueprint information
    """
    try:
        # Load the Blueprint
        blueprint = unreal.EditorAssetLibrary.load_asset(blueprint_path)
        if not blueprint or not isinstance(blueprint, unreal.Blueprint):
            return {
                'success': False,
                'error': f'Blueprint not found: {blueprint_path}'
            }

        # Get basic information
        info = {
            'success': True,
            'blueprintPath': blueprint_path,
            'className': blueprint.get_name(),
        }

        # Get parent class information
        parent_class = blueprint.get_editor_property('parent_class')
        if parent_class:
            info['parentClass'] = parent_class.get_name()

        # Note: Getting detailed component and variable information
        # requires more advanced Blueprint introspection which has
        # limitations in the Python API

        return info

    except Exception as e:
        log_error(f"Error getting Blueprint info: {e}")
        return {
            'success': False,
            'error': str(e)
        }

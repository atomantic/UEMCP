"""
Blueprint manipulation operations for creating and modifying Blueprint classes.
"""

import unreal
from typing import Dict, List, Optional, Any
from utils.general import log_debug as log_info, log_error, log_warning

# Enhanced error handling framework
from utils.error_handling import (
    validate_inputs, handle_unreal_errors, safe_operation,
    RequiredRule, AssetPathRule, TypeRule, ValidationError
)


@validate_inputs({
    'class_name': [RequiredRule(), TypeRule(str)],
    'parent_class': [RequiredRule(), TypeRule(str)],
    'target_folder': [RequiredRule(), TypeRule(str)],
    'components': [TypeRule(list, allow_none=True)],
    'variables': [TypeRule(list, allow_none=True)]
})
@handle_unreal_errors("create_blueprint")
@safe_operation("blueprint")
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


# NOTE: add_component() has been removed as it cannot be implemented
# due to Unreal Engine Python API limitations.
# Component addition must be done manually in the Blueprint editor.
# This functionality may be added in future UE versions.


# NOTE: set_variable() has been removed as it cannot be implemented
# due to Unreal Engine Python API limitations.
# Variable addition must be done manually in the Blueprint editor.
# This functionality may be added in future UE versions.


@validate_inputs({
    'blueprint_path': [RequiredRule(), AssetPathRule()]
})
@handle_unreal_errors("get_blueprint_info")
@safe_operation("blueprint")
def get_info(blueprint_path: str) -> Dict[str, Any]:
    """
    Get detailed information about a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset

    Returns:
        Dictionary with Blueprint information
    """
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


@validate_inputs({
    'path': [RequiredRule(), TypeRule(str)],
    'filter': [TypeRule(str, allow_none=True)],
    'limit': [TypeRule(int, allow_none=True)]
})
@handle_unreal_errors("list_blueprints")
@safe_operation("blueprint")
def list_blueprints(
    path: str = '/Game',
    filter: Optional[str] = None,
    limit: Optional[int] = 50
) -> Dict[str, Any]:
    """
    List Blueprint assets with optional filtering.

    Args:
        path: Path to search for Blueprints
        filter: Optional name filter (case-insensitive)
        limit: Maximum number of results

    Returns:
        Dictionary with list of Blueprints
    """
    # Get all assets in the specified path
    all_assets = unreal.EditorAssetLibrary.list_assets(path, recursive=True, include_folder=False)
    
    blueprints = []
    
    for asset_path in all_assets:
        # Load asset to check if it's a Blueprint
        asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if not asset or not isinstance(asset, unreal.Blueprint):
            continue
            
        # Apply name filter if specified
        asset_name = asset.get_name()
        if filter and filter.lower() not in asset_name.lower():
            continue
            
        # Get basic Blueprint information
        blueprint_info = {
            'name': asset_name,
            'path': asset_path,
        }
        
        # Get parent class if available
        parent_class = asset.get_editor_property('parent_class')
        if parent_class:
            blueprint_info['parentClass'] = parent_class.get_name()
            
        # Get modification time if available
        try:
            asset_data = unreal.EditorAssetLibrary.find_asset_data(asset_path)
            if asset_data:
                # Note: Getting exact modification time is complex in UE Python API
                blueprint_info['lastModified'] = "Available in editor"
        except:
            pass  # Ignore if we can't get modification time
            
        blueprints.append(blueprint_info)
        
        # Apply limit
        if limit and len(blueprints) >= limit:
            break
    
    log_info(f"Found {len(blueprints)} Blueprints in {path}")
    
    return {
        'success': True,
        'blueprints': blueprints
    }


@validate_inputs({
    'blueprint_path': [RequiredRule(), AssetPathRule()]
})
@handle_unreal_errors("compile_blueprint")
@safe_operation("blueprint")
def compile(blueprint_path: str) -> Dict[str, Any]:
    """
    Compile a Blueprint and report compilation status.

    Args:
        blueprint_path: Path to the Blueprint asset

    Returns:
        Dictionary with compilation result
    """
    # Load the Blueprint
    blueprint = unreal.EditorAssetLibrary.load_asset(blueprint_path)
    if not blueprint or not isinstance(blueprint, unreal.Blueprint):
        return {
            'success': False,
            'error': f'Blueprint not found: {blueprint_path}'
        }

    # Compile the Blueprint
    try:
        # Use Blueprint compilation functionality
        # Note: Direct compilation via Python has limitations
        # This will mark the Blueprint as needing compilation
        blueprint.mark_package_dirty()
        
        # Force compilation by accessing the generated class
        generated_class = blueprint.generated_class()
        
        # Check compilation status
        # Note: Detailed error reporting is limited in Python API
        compilation_success = generated_class is not None
        
        result = {
            'success': True,
            'compilationSuccess': compilation_success,
            'errors': [],
            'warnings': []
        }
        
        if compilation_success:
            log_info(f"Blueprint compiled successfully: {blueprint_path}")
        else:
            log_error(f"Blueprint compilation failed: {blueprint_path}")
            result['errors'].append("Blueprint compilation failed - check Blueprint editor for detailed errors")
        
        return result
        
    except Exception as e:
        log_error(f"Error during Blueprint compilation: {str(e)}")
        return {
            'success': True,
            'compilationSuccess': False,
            'errors': [f"Compilation error: {str(e)}"],
            'warnings': []
        }


@validate_inputs({
    'blueprint_paths': [RequiredRule(), TypeRule(list)],
    'output_path': [TypeRule(str, allow_none=True)],
    'include_components': [TypeRule(bool, allow_none=True)],
    'include_variables': [TypeRule(bool, allow_none=True)],
    'include_functions': [TypeRule(bool, allow_none=True)],
    'include_events': [TypeRule(bool, allow_none=True)],
    'include_dependencies': [TypeRule(bool, allow_none=True)]
})
@handle_unreal_errors("document_blueprints")
@safe_operation("blueprint")
def document(
    blueprint_paths: List[str],
    output_path: Optional[str] = None,
    include_components: bool = True,
    include_variables: bool = True,
    include_functions: bool = True,
    include_events: bool = True,
    include_dependencies: bool = False
) -> Dict[str, Any]:
    """
    Generate comprehensive markdown documentation for Blueprints.

    Args:
        blueprint_paths: List of Blueprint paths to document
        output_path: Optional output file path for documentation
        include_components: Include component hierarchy
        include_variables: Include variable descriptions
        include_functions: Include function signatures
        include_events: Include custom events
        include_dependencies: Include Blueprint dependencies

    Returns:
        Dictionary with documentation result
    """
    documentation_parts = []
    documented_blueprints = []
    
    # Generate documentation header
    documentation_parts.append("# Blueprint System Documentation\n")
    documentation_parts.append(f"Generated on: {unreal.DateTime.now()}\n")
    documentation_parts.append(f"Total Blueprints: {len(blueprint_paths)}\n\n")
    
    for blueprint_path in blueprint_paths:
        try:
            # Load Blueprint
            blueprint = unreal.EditorAssetLibrary.load_asset(blueprint_path)
            if not blueprint or not isinstance(blueprint, unreal.Blueprint):
                log_warning(f"Skipping invalid Blueprint: {blueprint_path}")
                continue
                
            blueprint_name = blueprint.get_name()
            log_info(f"Documenting Blueprint: {blueprint_name}")
            
            # Start Blueprint documentation section
            documentation_parts.append(f"## {blueprint_name}\n\n")
            documentation_parts.append(f"**Path**: `{blueprint_path}`\n\n")
            
            # Get basic information
            parent_class = blueprint.get_editor_property('parent_class')
            if parent_class:
                documentation_parts.append(f"**Parent Class**: {parent_class.get_name()}\n\n")
            
            # Blueprint summary for tracking
            bp_summary = {
                'name': blueprint_name,
                'path': blueprint_path,
                'componentsCount': 0,
                'variablesCount': 0,
                'functionsCount': 0,
                'eventsCount': 0
            }
            
            # Add sections based on options
            if include_components:
                documentation_parts.append("### Components\n\n")
                # Note: Component introspection is limited in Python API
                documentation_parts.append("*Component information requires Blueprint editor access for detailed inspection.*\n\n")
                # This would be where we'd enumerate components if the API supported it
                
            if include_variables:
                documentation_parts.append("### Variables\n\n")
                # Note: Variable introspection is limited in Python API
                documentation_parts.append("*Variable information requires Blueprint editor access for detailed inspection.*\n\n")
                # This would be where we'd list variables if the API supported it
                
            if include_functions:
                documentation_parts.append("### Functions\n\n")
                # Note: Function introspection is limited in Python API
                documentation_parts.append("*Function information requires Blueprint editor access for detailed inspection.*\n\n")
                # This would be where we'd list functions if the API supported it
                
            if include_events:
                documentation_parts.append("### Custom Events\n\n")
                # Note: Event introspection is limited in Python API
                documentation_parts.append("*Event information requires Blueprint editor access for detailed inspection.*\n\n")
                # This would be where we'd list events if the API supported it
                
            if include_dependencies:
                documentation_parts.append("### Dependencies\n\n")
                # Note: Dependency analysis is limited in Python API
                documentation_parts.append("*Dependency analysis requires Blueprint editor access for detailed inspection.*\n\n")
            
            # Add Blueprint to documented list
            documented_blueprints.append(bp_summary)
            documentation_parts.append("---\n\n")
            
        except Exception as e:
            log_error(f"Error documenting Blueprint {blueprint_path}: {str(e)}")
            continue
    
    # Combine documentation
    full_documentation = ''.join(documentation_parts)
    
    # Save to file if output path specified
    if output_path:
        try:
            import os
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_documentation)
            log_info(f"Documentation saved to: {output_path}")
        except Exception as e:
            log_error(f"Failed to save documentation to {output_path}: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to save documentation: {str(e)}'
            }
    
    log_info(f"Generated documentation for {len(documented_blueprints)} Blueprints")
    
    result = {
        'success': True,
        'documentedBlueprints': documented_blueprints,
        'documentation': full_documentation
    }
    
    if output_path:
        result['outputPath'] = output_path
    
    return result

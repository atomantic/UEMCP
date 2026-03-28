"""
Audio operations for importing audio files, creating MetaSound assets,
and building audio graphs in Unreal Engine.
"""

import os
from typing import Any, Optional

import unreal

from utils.error_handling import (
    AssetPathRule,
    FileExistsRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    require_asset,
    safe_operation,
    validate_inputs,
)
from utils.general import log_debug

_SUPPORTED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".aiff", ".aif"}

_METASOUND_TYPES = {
    "source": "MetaSoundSource",
    "patch": "MetaSoundPatch",
}


def _validate_audio_extension(file_path: str) -> str:
    """Validate file extension and return it lowercased."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in _SUPPORTED_AUDIO_EXTENSIONS:
        raise ProcessingError(
            f"Unsupported audio format '{ext}'",
            operation="audio_import",
            details={
                "file_extension": ext,
                "supported_formats": sorted(_SUPPORTED_AUDIO_EXTENSIONS),
            },
        )
    return ext


@validate_inputs(
    {
        "file_path": [RequiredRule(), TypeRule(str), FileExistsRule()],
        "target_folder": [RequiredRule(), AssetPathRule(min_parts=3)],
        "asset_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("audio_import")
@safe_operation("audio")
def import_audio(
    file_path: str,
    target_folder: str = "/Game/Audio",
    asset_name: Optional[str] = None,
) -> dict[str, Any]:
    """Import an audio file (WAV, MP3, OGG, FLAC, AIFF) into Unreal Engine.

    Args:
        file_path: Absolute filesystem path to the audio file
        target_folder: Destination folder in content browser
        asset_name: Optional custom asset name (derived from filename if omitted)

    Returns:
        Dictionary with import result including the asset path
    """
    ext = _validate_audio_extension(file_path)

    if not asset_name:
        asset_name = os.path.splitext(os.path.basename(file_path))[0]

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    import_task = unreal.AssetImportTask()
    import_task.set_editor_property("filename", file_path)
    import_task.set_editor_property("destination_path", target_folder)
    import_task.set_editor_property("destination_name", asset_name)
    import_task.set_editor_property("replace_existing", True)
    import_task.set_editor_property("automated", True)
    import_task.set_editor_property("save", True)

    asset_tools.import_asset_tasks([import_task])

    imported_objects = import_task.get_editor_property("imported_object_paths")
    if not imported_objects or len(imported_objects) == 0:
        result_obj = import_task.get_editor_property("result")
        if result_obj:
            asset_path = result_obj.get_path_name().split(":")[0]
        else:
            asset_path = f"{target_folder}/{asset_name}"
            if not unreal.EditorAssetLibrary.does_asset_exist(asset_path):
                raise ProcessingError(
                    f"Audio import failed for '{file_path}'",
                    operation="audio_import",
                    details={"file_path": file_path, "target_folder": target_folder},
                )
    else:
        asset_path = str(imported_objects[0])

    log_debug(f"Imported audio '{asset_name}' from {file_path} to {asset_path}")

    return {
        "success": True,
        "assetPath": asset_path,
        "assetName": asset_name,
        "sourceFile": file_path,
        "format": ext.lstrip(".").upper(),
    }


@validate_inputs(
    {
        "asset_name": [RequiredRule(), TypeRule(str)],
        "target_folder": [RequiredRule(), AssetPathRule(min_parts=3)],
        "metasound_type": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("audio_create_metasound")
@safe_operation("audio")
def create_metasound(
    asset_name: str,
    target_folder: str = "/Game/Audio/MetaSounds",
    metasound_type: str = "source",
) -> dict[str, Any]:
    """Create a MetaSound source or patch asset.

    Args:
        asset_name: Name for the new MetaSound asset
        target_folder: Destination folder in content browser
        metasound_type: Type of MetaSound to create: 'source' or 'patch'

    Returns:
        Dictionary with the created MetaSound asset path
    """
    if metasound_type not in _METASOUND_TYPES:
        raise ProcessingError(
            f"Unknown MetaSound type: '{metasound_type}'",
            operation="audio_create_metasound",
            details={
                "metasound_type": metasound_type,
                "valid_types": sorted(_METASOUND_TYPES.keys()),
            },
        )

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    class_name = _METASOUND_TYPES[metasound_type]
    asset_class = getattr(unreal, class_name, None)

    if not asset_class:
        raise ProcessingError(
            f"MetaSound class '{class_name}' not available in this UE version",
            operation="audio_create_metasound",
            details={"class_name": class_name},
        )

    factory_name = f"{class_name}Factory"
    factory_class = getattr(unreal, factory_name, None)
    factory = factory_class() if factory_class else None

    metasound = asset_tools.create_asset(
        asset_name=asset_name,
        package_path=target_folder,
        asset_class=asset_class,
        factory=factory,
    )

    if not metasound:
        raise ProcessingError(
            f"Failed to create MetaSound '{asset_name}'",
            operation="audio_create_metasound",
            details={"asset_name": asset_name, "metasound_type": metasound_type},
        )

    asset_path = f"{target_folder}/{asset_name}"
    unreal.EditorAssetLibrary.save_asset(asset_path)

    log_debug(f"Created MetaSound '{asset_name}' ({metasound_type}) at {asset_path}")

    return {
        "success": True,
        "assetPath": asset_path,
        "assetName": asset_name,
        "metasoundType": metasound_type,
        "className": class_name,
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "node_type": [RequiredRule(), TypeRule(str)],
        "node_name": [TypeRule(str, allow_none=True)],
        "position_x": [TypeRule((int, float), allow_none=True)],
        "position_y": [TypeRule((int, float), allow_none=True)],
    }
)
@handle_unreal_errors("audio_add_node")
@safe_operation("audio")
def add_node(
    asset_path: str,
    node_type: str,
    node_name: Optional[str] = None,
    position_x: Optional[float] = None,
    position_y: Optional[float] = None,
) -> dict[str, Any]:
    """Add an audio node to a MetaSound graph.

    Args:
        asset_path: Path to the MetaSound asset
        node_type: Type of audio node to add. Common types:
            Generators: 'Oscillator', 'WhiteNoise', 'PinkNoise'
            Filters: 'LowPassFilter', 'HighPassFilter', 'BandPassFilter',
                     'BiquadFilter', 'LadderFilter'
            Envelopes: 'ADEnvelope', 'ADSREnvelope'
            Effects: 'Delay', 'Reverb', 'Chorus', 'Stereo Delay'
            Math: 'Add (Audio)', 'Multiply (Audio)', 'Subtract (Audio)'
            Utility: 'Trigger', 'Random', 'MonoMixer', 'StereoMixer',
                     'Get', 'Set'
        node_name: Optional custom name for the node
        position_x: X position in MetaSound graph editor
        position_y: Y position in MetaSound graph editor

    Returns:
        Dictionary with node creation result
    """
    metasound = require_asset(asset_path)

    builder = unreal.MetaSoundBuilderBase.get_builder(metasound)
    if not builder:
        builder = unreal.MetaSoundBuilderBase.create_builder(metasound)
    if not builder:
        raise ProcessingError(
            f"Cannot obtain MetaSound builder for '{asset_path}'",
            operation="audio_add_node",
            details={"asset_path": asset_path},
        )

    node_handle = builder.add_node_by_class_name(node_type)
    if not node_handle:
        node_handle = builder.find_node_class_and_add(node_type)
    if not node_handle:
        raise ProcessingError(
            f"Failed to add node of type '{node_type}'",
            operation="audio_add_node",
            details={"node_type": node_type, "asset_path": asset_path},
        )

    node_id = str(node_handle)

    if node_name:
        builder.set_node_comment(node_handle, node_name)

    builder.update_asset(metasound)
    unreal.EditorAssetLibrary.save_asset(asset_path)

    log_debug(f"Added audio node '{node_type}' (id: {node_id}) to {asset_path}")

    return {
        "success": True,
        "assetPath": asset_path,
        "nodeType": node_type,
        "nodeId": node_id,
        "nodeName": node_name,
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "source_node_id": [RequiredRule(), TypeRule(str)],
        "source_output": [RequiredRule(), TypeRule(str)],
        "target_node_id": [RequiredRule(), TypeRule(str)],
        "target_input": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("audio_connect_nodes")
@safe_operation("audio")
def connect_nodes(
    asset_path: str,
    source_node_id: str,
    source_output: str,
    target_node_id: str,
    target_input: str,
) -> dict[str, Any]:
    """Connect two nodes in a MetaSound graph by linking an output to an input.

    Args:
        asset_path: Path to the MetaSound asset
        source_node_id: ID of the source node
        source_output: Name of the output pin on the source node
        target_node_id: ID of the target node
        target_input: Name of the input pin on the target node

    Returns:
        Dictionary with connection result
    """
    metasound = require_asset(asset_path)

    builder = unreal.MetaSoundBuilderBase.get_builder(metasound)
    if not builder:
        raise ProcessingError(
            f"Cannot obtain MetaSound builder for '{asset_path}'",
            operation="audio_connect_nodes",
            details={"asset_path": asset_path},
        )

    source_output_handle = builder.find_node_output_by_name(source_node_id, source_output)
    if not source_output_handle:
        raise ProcessingError(
            f"Output '{source_output}' not found on node '{source_node_id}'",
            operation="audio_connect_nodes",
            details={"source_node_id": source_node_id, "source_output": source_output},
        )

    target_input_handle = builder.find_node_input_by_name(target_node_id, target_input)
    if not target_input_handle:
        raise ProcessingError(
            f"Input '{target_input}' not found on node '{target_node_id}'",
            operation="audio_connect_nodes",
            details={"target_node_id": target_node_id, "target_input": target_input},
        )

    result = builder.connect_nodes(source_output_handle, target_input_handle)
    if not result:
        raise ProcessingError(
            f"Failed to connect {source_node_id}:{source_output} -> {target_node_id}:{target_input}",
            operation="audio_connect_nodes",
            details={
                "source_node_id": source_node_id,
                "source_output": source_output,
                "target_node_id": target_node_id,
                "target_input": target_input,
            },
        )

    builder.update_asset(metasound)
    unreal.EditorAssetLibrary.save_asset(asset_path)

    log_debug(f"Connected {source_node_id}:{source_output} -> " f"{target_node_id}:{target_input} in {asset_path}")

    return {
        "success": True,
        "assetPath": asset_path,
        "sourceNodeId": source_node_id,
        "sourceOutput": source_output,
        "targetNodeId": target_node_id,
        "targetInput": target_input,
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "parameter_name": [RequiredRule(), TypeRule(str)],
        "parameter_value": [RequiredRule()],
        "parameter_type": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("audio_set_parameter")
@safe_operation("audio")
def set_parameter(
    asset_path: str,
    parameter_name: str,
    parameter_value: Any,
    parameter_type: Optional[str] = None,
) -> dict[str, Any]:
    """Configure a parameter on a MetaSound asset.

    Args:
        asset_path: Path to the MetaSound asset
        parameter_name: Name of the parameter to set
        parameter_value: Value to assign. Type depends on parameter:
            - float: Frequency, gain, time values
            - int: Integer parameters
            - bool: Toggle parameters
            - str: Enum or string parameters
        parameter_type: Optional type hint ('float', 'int', 'bool', 'string')
            to disambiguate the value type

    Returns:
        Dictionary with parameter update result
    """
    metasound = require_asset(asset_path)

    builder = unreal.MetaSoundBuilderBase.get_builder(metasound)
    if not builder:
        raise ProcessingError(
            f"Cannot obtain MetaSound builder for '{asset_path}'",
            operation="audio_set_parameter",
            details={"asset_path": asset_path},
        )

    coerced_value = parameter_value
    if parameter_type == "float":
        coerced_value = float(parameter_value)
    elif parameter_type == "int":
        coerced_value = int(parameter_value)
    elif parameter_type == "bool":
        coerced_value = bool(parameter_value)
    elif parameter_type == "string":
        coerced_value = str(parameter_value)

    result = builder.set_node_input_default(parameter_name, coerced_value)
    if not result:
        input_handle = builder.find_graph_input_by_name(parameter_name)
        if input_handle:
            result = builder.set_node_input_default_by_handle(input_handle, coerced_value)

    if not result:
        raise ProcessingError(
            f"Failed to set parameter '{parameter_name}' on '{asset_path}'",
            operation="audio_set_parameter",
            details={
                "parameter_name": parameter_name,
                "parameter_value": str(parameter_value),
                "parameter_type": parameter_type,
            },
        )

    builder.update_asset(metasound)
    unreal.EditorAssetLibrary.save_asset(asset_path)

    log_debug(f"Set parameter '{parameter_name}'={parameter_value} on {asset_path}")

    return {
        "success": True,
        "assetPath": asset_path,
        "parameterName": parameter_name,
        "parameterValue": parameter_value,
        "parameterType": parameter_type or type(coerced_value).__name__,
    }

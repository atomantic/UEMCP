"""
Material graph operations for adding expressions, connecting nodes,
and inspecting material expression structures in Unreal Engine.
"""

from typing import Any, Optional

import unreal

from utils.error_handling import (
    AssetPathRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    require_asset,
    safe_operation,
    validate_inputs,
)
from utils.general import log_debug

_EXPRESSION_TYPES = {
    "TextureSample": unreal.MaterialExpressionTextureSample,
    "TextureCoordinate": unreal.MaterialExpressionTextureCoordinate,
    "VectorParameter": unreal.MaterialExpressionVectorParameter,
    "ScalarParameter": unreal.MaterialExpressionScalarParameter,
    "StaticBoolParameter": unreal.MaterialExpressionStaticBoolParameter,
    "Constant": unreal.MaterialExpressionConstant,
    "Constant2Vector": unreal.MaterialExpressionConstant2Vector,
    "Constant3Vector": unreal.MaterialExpressionConstant3Vector,
    "Constant4Vector": unreal.MaterialExpressionConstant4Vector,
    "Add": unreal.MaterialExpressionAdd,
    "Subtract": unreal.MaterialExpressionSubtract,
    "Multiply": unreal.MaterialExpressionMultiply,
    "Divide": unreal.MaterialExpressionDivide,
    "Lerp": unreal.MaterialExpressionLinearInterpolate,
    "Power": unreal.MaterialExpressionPower,
    "Clamp": unreal.MaterialExpressionClamp,
    "Abs": unreal.MaterialExpressionAbs,
    "OneMinus": unreal.MaterialExpressionOneMinus,
    "Fresnel": unreal.MaterialExpressionFresnel,
    "Panner": unreal.MaterialExpressionPanner,
    "Time": unreal.MaterialExpressionTime,
    "WorldPosition": unreal.MaterialExpressionWorldPosition,
    "VertexNormalWS": unreal.MaterialExpressionVertexNormalWS,
    "CustomExpression": unreal.MaterialExpressionCustom,
    "Noise": unreal.MaterialExpressionNoise,
    "ComponentMask": unreal.MaterialExpressionComponentMask,
    "AppendVector": unreal.MaterialExpressionAppendVector,
}

_MATERIAL_PROPERTIES = {
    "BaseColor": unreal.MaterialProperty.MP_BASE_COLOR,
    "Metallic": unreal.MaterialProperty.MP_METALLIC,
    "Specular": unreal.MaterialProperty.MP_SPECULAR,
    "Roughness": unreal.MaterialProperty.MP_ROUGHNESS,
    "EmissiveColor": unreal.MaterialProperty.MP_EMISSIVE_COLOR,
    "Normal": unreal.MaterialProperty.MP_NORMAL,
    "Opacity": unreal.MaterialProperty.MP_OPACITY,
    "OpacityMask": unreal.MaterialProperty.MP_OPACITY_MASK,
    "WorldPositionOffset": unreal.MaterialProperty.MP_WORLD_POSITION_OFFSET,
    "AmbientOcclusion": unreal.MaterialProperty.MP_AMBIENT_OCCLUSION,
    "Subsurface": unreal.MaterialProperty.MP_SUBSURFACE_COLOR,
}


def _get_expression_index(material, expression) -> int:
    """Return the index of an expression in the material's expression list."""
    expressions = unreal.MaterialEditingLibrary.get_material_expressions(material)
    for i, expr in enumerate(expressions):
        if expr == expression:
            return i
    return -1


def _find_expression_by_index(material, index: int):
    """Find an expression in a material by its index."""
    expressions = unreal.MaterialEditingLibrary.get_material_expressions(material)
    if 0 <= index < len(expressions):
        return expressions[index]
    return None


def _find_expression_by_name(material, name: str):
    """Find a named parameter expression by its parameter_name."""
    expressions = unreal.MaterialEditingLibrary.get_material_expressions(material)
    for expr in expressions:
        if hasattr(expr, "get_editor_property"):
            param_name = None
            for prop in ("parameter_name", "desc"):
                try:
                    param_name = str(expr.get_editor_property(prop))
                except Exception:
                    continue
                if param_name == name:
                    return expr
    return None


@validate_inputs(
    {
        "material_path": [RequiredRule(), AssetPathRule()],
        "expression_type": [RequiredRule(), TypeRule(str)],
        "name": [TypeRule(str, allow_none=True)],
        "position_x": [TypeRule((int, float), allow_none=True)],
        "position_y": [TypeRule((int, float), allow_none=True)],
    }
)
@handle_unreal_errors("material_add_expression")
@safe_operation("material")
def add_expression(
    material_path: str,
    expression_type: str,
    name: Optional[str] = None,
    position_x: Optional[float] = None,
    position_y: Optional[float] = None,
) -> dict[str, Any]:
    """Add an expression node to a material graph.

    Args:
        material_path: Path to the material asset
        expression_type: Type of expression to add. Options:
            Textures: 'TextureSample', 'TextureCoordinate'
            Parameters: 'VectorParameter', 'ScalarParameter', 'StaticBoolParameter'
            Constants: 'Constant', 'Constant2Vector', 'Constant3Vector',
                       'Constant4Vector'
            Math: 'Add', 'Subtract', 'Multiply', 'Divide', 'Lerp',
                  'Power', 'Clamp', 'Abs', 'OneMinus'
            Utility: 'Fresnel', 'Panner', 'Time', 'WorldPosition',
                     'VertexNormalWS', 'ComponentMask', 'AppendVector'
            Advanced: 'CustomExpression' (HLSL), 'Noise'
        name: Optional parameter name (for parameter expressions)
        position_x: X position in material editor graph
        position_y: Y position in material editor graph

    Returns:
        Dictionary with expression creation result including its index
    """
    expr_class = _EXPRESSION_TYPES.get(expression_type)
    if not expr_class:
        raise ProcessingError(
            f"Unknown expression type: {expression_type}",
            operation="material_add_expression",
            details={
                "expression_type": expression_type,
                "supported_types": sorted(_EXPRESSION_TYPES.keys()),
            },
        )

    material = require_asset(material_path)

    expression = unreal.MaterialEditingLibrary.create_material_expression(material, expr_class)
    if not expression:
        raise ProcessingError(
            f"Failed to create expression of type '{expression_type}'",
            operation="material_add_expression",
            details={"expression_type": expression_type},
        )

    if name and hasattr(expression, "set_editor_property"):
        for prop in ("parameter_name", "desc"):
            try:
                expression.set_editor_property(prop, name)
                break
            except Exception:
                continue

    if position_x is not None:
        expression.set_editor_property("material_expression_editor_x", int(position_x))
    if position_y is not None:
        expression.set_editor_property("material_expression_editor_y", int(position_y))

    expr_index = _get_expression_index(material, expression)

    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_asset(material_path)
    log_debug(f"Added {expression_type} expression (index: {expr_index}) to {material_path}")

    return {
        "success": True,
        "materialPath": material_path,
        "expressionType": expression_type,
        "expressionIndex": expr_index,
        "expressionClass": expression.get_class().get_name(),
        "name": name,
    }


@validate_inputs(
    {
        "material_path": [RequiredRule(), AssetPathRule()],
        "source_index": [RequiredRule(), TypeRule(int)],
        "source_output": [RequiredRule(), TypeRule(str)],
        "target": [RequiredRule(), TypeRule(str)],
        "target_input": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("material_connect_expressions")
@safe_operation("material")
def connect_expressions(
    material_path: str,
    source_index: int,
    source_output: str,
    target: str,
    target_input: Optional[str] = None,
) -> dict[str, Any]:
    """Link expression outputs to material inputs or other expression inputs.

    Args:
        material_path: Path to the material asset
        source_index: Index of the source expression node
        source_output: Name of the output on the source expression (e.g., '', 'RGB', 'R')
        target: Either a material property name (e.g., 'BaseColor', 'Roughness')
            or an expression index as string (e.g., '3') to connect to another expression
        target_input: Input name on target expression (required when target is an expression index)

    Returns:
        Dictionary with connection result
    """
    material = require_asset(material_path)

    source_expr = _find_expression_by_index(material, source_index)
    if not source_expr:
        raise ProcessingError(
            f"Source expression at index {source_index} not found",
            operation="material_connect_expressions",
            details={"source_index": source_index},
        )

    mat_prop = _MATERIAL_PROPERTIES.get(target)
    if mat_prop is not None:
        result = unreal.MaterialEditingLibrary.connect_material_property(source_expr, source_output, mat_prop)
        if not result:
            raise ProcessingError(
                f"Failed to connect expression to material property '{target}'",
                operation="material_connect_expressions",
                details={"source_index": source_index, "target": target},
            )
        unreal.MaterialEditingLibrary.recompile_material(material)
        unreal.EditorAssetLibrary.save_asset(material_path)
        log_debug(f"Connected expression {source_index} -> {target} in {material_path}")
        return {
            "success": True,
            "materialPath": material_path,
            "sourceIndex": source_index,
            "sourceOutput": source_output,
            "targetProperty": target,
        }

    target_index = None
    try:
        target_index = int(target)
    except ValueError as exc:
        raise ProcessingError(
            f"Target '{target}' is not a valid material property or expression index",
            operation="material_connect_expressions",
            details={
                "target": target,
                "valid_properties": sorted(_MATERIAL_PROPERTIES.keys()),
            },
        ) from exc

    target_expr = _find_expression_by_index(material, target_index)
    if not target_expr:
        raise ProcessingError(
            f"Target expression at index {target_index} not found",
            operation="material_connect_expressions",
            details={"target_index": target_index},
        )

    input_name = target_input or ""
    result = unreal.MaterialEditingLibrary.connect_material_expressions(
        source_expr, source_output, target_expr, input_name
    )
    if not result:
        raise ProcessingError(
            f"Failed to connect expression {source_index} to expression {target_index}",
            operation="material_connect_expressions",
            details={
                "source_index": source_index,
                "target_index": target_index,
                "source_output": source_output,
                "target_input": input_name,
            },
        )

    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_asset(material_path)
    log_debug(f"Connected expression {source_index}:{source_output} -> {target_index}:{input_name} in {material_path}")
    return {
        "success": True,
        "materialPath": material_path,
        "sourceIndex": source_index,
        "sourceOutput": source_output,
        "targetIndex": target_index,
        "targetInput": input_name,
    }


@validate_inputs(
    {
        "material_path": [RequiredRule(), AssetPathRule()],
        "expression_index": [RequiredRule(), TypeRule(int)],
        "property_name": [RequiredRule(), TypeRule(str)],
        "property_value": [RequiredRule()],
    }
)
@handle_unreal_errors("material_set_expression_property")
@safe_operation("material")
def set_expression_property(
    material_path: str,
    expression_index: int,
    property_name: str,
    property_value: Any,
) -> dict[str, Any]:
    """Configure a property on a material expression node.

    Args:
        material_path: Path to the material asset
        expression_index: Index of the expression to modify
        property_name: Name of the property to set (e.g., 'default_value',
            'parameter_name', 'texture', 'code', 'r', 'g', 'b', 'const_a')
        property_value: Value to set. Type depends on property:
            - Scalars: float/int (e.g., 0.5)
            - Colors: dict with r,g,b,a keys (e.g., {'r':1,'g':0,'b':0,'a':1})
            - Textures: asset path string (e.g., '/Game/Textures/T_Wood')
            - Strings: str (e.g., parameter names, HLSL code)

    Returns:
        Dictionary with property update result
    """
    material = require_asset(material_path)

    expression = _find_expression_by_index(material, expression_index)
    if not expression:
        raise ProcessingError(
            f"Expression at index {expression_index} not found",
            operation="material_set_expression_property",
            details={"expression_index": expression_index},
        )

    if isinstance(property_value, dict) and "r" in property_value:
        color = unreal.LinearColor(
            property_value.get("r", 0.0),
            property_value.get("g", 0.0),
            property_value.get("b", 0.0),
            property_value.get("a", 1.0),
        )
        expression.set_editor_property(property_name, color)
    elif isinstance(property_value, str) and property_name == "texture":
        texture = require_asset(property_value)
        expression.set_editor_property(property_name, texture)
    else:
        expression.set_editor_property(property_name, property_value)

    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_asset(material_path)
    log_debug(f"Set {property_name}={property_value} on expression {expression_index} in {material_path}")

    return {
        "success": True,
        "materialPath": material_path,
        "expressionIndex": expression_index,
        "propertyName": property_name,
    }


@validate_inputs(
    {
        "function_name": [RequiredRule(), TypeRule(str)],
        "target_folder": [RequiredRule(), AssetPathRule(min_parts=3)],
        "description": [TypeRule(str, allow_none=True)],
        "expose_to_library": [TypeRule(bool, allow_none=True)],
    }
)
@handle_unreal_errors("material_create_function")
@safe_operation("material")
def create_function(
    function_name: str,
    target_folder: str = "/Game/Materials/Functions",
    description: Optional[str] = None,
    expose_to_library: Optional[bool] = None,
) -> dict[str, Any]:
    """Create a reusable material function asset.

    Args:
        function_name: Name for the new material function
        target_folder: Destination folder in content browser
        description: Optional description for the function
        expose_to_library: Whether to expose in the material function library

    Returns:
        Dictionary with the created material function path
    """
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

    material_function = asset_tools.create_asset(
        asset_name=function_name,
        package_path=target_folder,
        asset_class=unreal.MaterialFunction,
        factory=unreal.MaterialFunctionFactoryNew(),
    )

    if not material_function:
        raise ProcessingError(
            f"Failed to create material function '{function_name}'",
            operation="material_create_function",
            details={"function_name": function_name, "target_folder": target_folder},
        )

    if description:
        material_function.set_editor_property("description", description)

    if expose_to_library is not None:
        material_function.set_editor_property("expose_to_library", expose_to_library)

    function_path = f"{target_folder}/{function_name}"
    unreal.EditorAssetLibrary.save_asset(function_path)

    log_debug(f"Created material function '{function_name}' at {function_path}")

    return {
        "success": True,
        "functionPath": function_path,
        "functionName": function_name,
        "description": description,
        "exposedToLibrary": expose_to_library,
    }


@validate_inputs(
    {
        "material_path": [RequiredRule(), AssetPathRule()],
    }
)
@handle_unreal_errors("material_get_graph")
@safe_operation("material")
def get_graph(
    material_path: str,
) -> dict[str, Any]:
    """Inspect a material's expression graph structure and connections.

    Args:
        material_path: Path to the material asset

    Returns:
        Dictionary with expression nodes and their connections
    """
    material = require_asset(material_path)

    expressions = unreal.MaterialEditingLibrary.get_material_expressions(material)
    nodes = []

    for i, expr in enumerate(expressions):
        node_info: dict[str, Any] = {
            "index": i,
            "class": expr.get_class().get_name(),
        }

        if hasattr(expr, "get_editor_property"):
            for prop in ("parameter_name", "desc"):
                try:
                    val = str(expr.get_editor_property(prop))
                    if val:
                        node_info["name"] = val
                        break
                except Exception:
                    continue

            try:
                node_info["positionX"] = int(expr.get_editor_property("material_expression_editor_x"))
                node_info["positionY"] = int(expr.get_editor_property("material_expression_editor_y"))
            except Exception:
                pass

        nodes.append(node_info)

    material_info: dict[str, Any] = {
        "domain": str(material.get_editor_property("material_domain")),
        "blendMode": str(material.get_editor_property("blend_mode")),
        "shadingModel": str(material.get_editor_property("shading_model")),
        "twoSided": bool(material.get_editor_property("two_sided")),
    }

    used_properties = []
    for prop_name, prop_enum in _MATERIAL_PROPERTIES.items():
        try:
            if unreal.MaterialEditingLibrary.get_material_property_input_node(material, prop_enum):
                used_properties.append(prop_name)
        except Exception:
            continue

    log_debug(f"Retrieved graph for {material_path}: {len(nodes)} expressions")

    return {
        "success": True,
        "materialPath": material_path,
        "materialProperties": material_info,
        "connectedProperties": used_properties,
        "expressions": nodes,
        "totalExpressions": len(nodes),
    }

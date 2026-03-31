"""
UEMCP Operations Package - Contains all operation modules
"""

# Import all operation classes for easy access
# Import blueprint operations as modules since they use standalone functions
from . import (
    animation,
    audio,
    blueprint,
    blueprint_graph,
    blueprint_nodes,
    datatable,
    input_system,
    material_graph,
    mesh,
    performance,
    statetree,
    struct_enum,
    widget,
)
from .actor import ActorOperations
from .asset import AssetOperations
from .level import LevelOperations
from .material import MaterialOperations
from .system import SystemOperations
from .viewport import ViewportOperations

# Niagara and PCG are optional -- only available when the respective plugins are enabled.
# Imports are guarded so the package loads even without these plugins; callers that
# need them should import the module directly and catch ImportError.
try:
    from . import niagara  # noqa: F401
except ImportError:
    pass  # Niagara plugin not available; ops.niagara will raise on direct import

try:
    from . import pcg  # noqa: F401
except ImportError:
    pass  # PCG plugin not available; ops.pcg will raise on direct import

__all__ = [
    "ActorOperations",
    "AssetOperations",
    "LevelOperations",
    "ViewportOperations",
    "SystemOperations",
    "MaterialOperations",
    "animation",
    "audio",
    "blueprint",
    "blueprint_graph",
    "blueprint_nodes",
    "datatable",
    "input_system",
    "material_graph",
    "mesh",
    "performance",
    "statetree",
    "struct_enum",
    "widget",
]

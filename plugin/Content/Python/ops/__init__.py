"""
UEMCP Operations Package - Contains all operation modules
"""

# Import all operation classes for easy access
# Import blueprint operations as modules since they use standalone functions
from . import blueprint, blueprint_graph, blueprint_nodes, widget
from .actor import ActorOperations
from .asset import AssetOperations
from .level import LevelOperations
from .material import MaterialOperations
from .system import SystemOperations
from .viewport import ViewportOperations

# Niagara is optional -- only available when the Niagara plugin is enabled.
# Import is guarded so the package loads even without Niagara; callers that
# need niagara should import ops.niagara directly and catch ImportError.
try:
    from . import niagara  # noqa: F401
except ImportError:
    pass  # Niagara plugin not available; ops.niagara will raise on direct import

__all__ = [
    "ActorOperations",
    "AssetOperations",
    "LevelOperations",
    "ViewportOperations",
    "SystemOperations",
    "MaterialOperations",
    "blueprint",
    "blueprint_graph",
    "blueprint_nodes",
    "widget",
]

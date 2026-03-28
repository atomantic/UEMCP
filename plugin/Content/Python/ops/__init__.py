"""
UEMCP Operations Package - Contains all operation modules
"""

# Import all operation classes for easy access
# Import blueprint operations as modules since they use standalone functions
from . import blueprint, blueprint_graph, blueprint_nodes
from .actor import ActorOperations
from .asset import AssetOperations
from .level import LevelOperations
from .material import MaterialOperations
from .system import SystemOperations
from .viewport import ViewportOperations

# Niagara is optional -- only available when the Niagara plugin is enabled
try:
    from . import niagara  # noqa: F401
except ImportError:
    niagara = None  # type: ignore[assignment]

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
    "niagara",
]

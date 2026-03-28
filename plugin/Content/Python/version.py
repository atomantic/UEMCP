"""
UEMCP Version Management

Centralized version information for the UEMCP Python plugin.
This is the single source of truth for version numbers in Python code.
"""

# UEMCP Plugin Version
VERSION = "2.1.1"

# Version info for programmatic access
VERSION_INFO = {
    "major": 2,
    "minor": 1,
    "patch": 1,
    "prerelease": None,  # e.g., "beta", "alpha", "rc1"
}


# Full version string with optional prerelease
def get_version_string():
    """Get the full version string including prerelease if applicable."""
    base = VERSION
    if VERSION_INFO.get("prerelease"):
        return f"{base}-{VERSION_INFO['prerelease']}"
    return base


# For backward compatibility
__version__ = VERSION

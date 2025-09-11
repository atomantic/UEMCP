#!/usr/bin/env python3
"""
Test the manifest generation without Unreal Engine
"""

import json
import os
import sys

# Add plugin path
plugin_path = os.path.join(os.path.dirname(__file__), "..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


# Mock unreal module
class MockUnreal:
    class Vector:
        def __init__(self, x=0, y=0, z=0):
            pass

    class Rotator:
        def __init__(self, pitch=0, yaw=0, roll=0):
            pass

    class Actor:
        pass

    class Blueprint:
        pass

    class Material:
        pass

    class StaticMesh:
        pass

    class Object:
        pass

    class DateTime:
        @staticmethod
        def now():
            return "2025-01-01 00:00:00"

    @staticmethod
    def log(msg):
        print(f"[LOG] {msg}")

    @staticmethod
    def log_error(msg):
        print(f"[ERROR] {msg}")

    @staticmethod
    def log_warning(msg):
        print(f"[WARNING] {msg}")

    class EditorLevelLibrary:
        pass

    class EditorAssetLibrary:
        pass

    class SystemLibrary:
        @staticmethod
        def get_engine_version():
            return "5.4.0"


sys.modules["unreal"] = MockUnreal()

# Now import and test
from ops.system import register_system_operations  # noqa: E402
from ops.tool_manifest import get_tool_manifest  # noqa: E402
from uemcp_command_registry import register_all_operations  # noqa: E402

# Register operations
register_all_operations()
register_system_operations()

# Get manifest
manifest = get_tool_manifest()

if manifest["success"]:
    print("✅ Successfully generated manifest")
    print(f"   Version: {manifest['version']}")
    print(f"   Total Tools: {manifest['totalTools']}")
    print(f"   Categories: {len(manifest['categories'])}")

    print("\n📊 Tools by Category:")
    for category, tools in manifest["categories"].items():
        print(f"   {category}: {len(tools)} tools")
        # Show first 3 tools
        preview = tools[:3]
        for tool in preview:
            print(f"      - {tool}")
        if len(tools) > 3:
            print(f"      ... and {len(tools) - 3} more")

    print("\n🔍 Sample Tool Schemas:")
    # Show a few tool schemas
    sample_tools = ["actor_spawn", "viewport_screenshot", "python_proxy"]
    for tool_name in sample_tools:
        tool = next((t for t in manifest["tools"] if t["name"] == tool_name), None)
        if tool:
            print(f"\n   {tool_name}:")
            print(f"      Description: {tool['description']}")
            schema = tool["inputSchema"]
            print(f"      Required: {schema.get('required', [])}")
            print(f"      Properties: {list(schema.get('properties', {}).keys())}")

    # Save manifest to file for inspection
    output_file = "tests/generated-manifest.json"
    with open(output_file, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n💾 Full manifest saved to: {output_file}")

else:
    print(f"❌ Failed to generate manifest: {manifest.get('error')}")
    sys.exit(1)

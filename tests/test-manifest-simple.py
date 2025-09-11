#!/usr/bin/env python3
"""
Simple test of manifest generation logic
"""

import json
import os
import sys


# Mock unreal module before any imports
class MockUnreal:
    @staticmethod
    def log(msg):
        pass

    @staticmethod
    def log_error(msg):
        pass

    @staticmethod
    def log_warning(msg):
        pass


sys.modules["unreal"] = MockUnreal()

# Add plugin path
plugin_path = os.path.join(os.path.dirname(__file__), "..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)

# Import the manifest module directly without importing ops/__init__.py
import importlib.util  # noqa: E402

spec = importlib.util.spec_from_file_location("tool_manifest", os.path.join(plugin_path, "ops", "tool_manifest.py"))
tool_manifest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool_manifest)

ManifestGenerator = tool_manifest.ManifestGenerator


# Create a simple test registry
class TestRegistry:
    def __init__(self):
        self.handlers = {
            "actor_spawn": (
                self.mock_spawn,
                ["assetPath", "location", "rotation", "scale", "name", "folder", "validate"],
                True,
            ),
            "viewport_screenshot": (
                self.mock_screenshot,
                ["width", "height", "screenPercentage", "compress", "quality"],
                False,
            ),
            "python_proxy": (self.mock_proxy, ["code", "context"], False),
            "test_connection": (self.mock_test, [], False),
        }

    def mock_spawn(self):
        """Spawn an actor in the level."""
        pass

    def mock_screenshot(self):
        """Capture a screenshot of the current viewport."""
        pass

    def mock_proxy(self):
        """Execute arbitrary Python code in Unreal Engine."""
        pass

    def mock_test(self):
        """Test the connection to the Python listener."""
        pass


# Test the manifest generator
def test_manifest():
    print("Testing Manifest Generator")
    print("=" * 60)

    # Create generator
    generator = ManifestGenerator()
    generator.registry = TestRegistry()

    # Generate manifest - we need to bypass the registry import
    # and directly test with our test registry
    manifest = {
        "success": True,
        "version": "1.1.0",
        "totalTools": len(generator.registry.handlers),
        "tools": [],
        "categories": {},
    }

    # Generate tools from test registry
    for command_name, (handler, params, _has_validate) in generator.registry.handlers.items():
        tool_def = generator.extract_tool_definition(command_name, handler, params)
        manifest["tools"].append(tool_def)

        # Categorize
        category = tool_def["category"]
        if category not in manifest["categories"]:
            manifest["categories"][category] = []
        manifest["categories"][category].append(command_name)

    if manifest["success"]:
        print("✅ Successfully generated manifest")
        print(f"   Version: {manifest['version']}")
        print(f"   Total Tools: {manifest['totalTools']}")
        print(f"   Categories: {len(manifest['categories'])}")

        print("\n📊 Tools by Category:")
        for category, tools in manifest["categories"].items():
            print(f"   {category}: {tools}")

        print("\n🔍 Generated Tool Schemas:")
        for tool in manifest["tools"]:
            print(f"\n   {tool['name']}:")
            print(f"      Description: {tool['description']}")
            print(f"      Category: {tool['category']}")
            schema = tool["inputSchema"]
            print(f"      Required: {schema.get('required', [])}")
            props = schema.get("properties", {})
            for prop_name, prop_def in props.items():
                print(f"      - {prop_name}: {prop_def.get('type')} ({prop_def.get('description')})")

        # Save for inspection
        with open("tests/test-manifest.json", "w") as f:
            json.dump(manifest, f, indent=2)
        print("\n💾 Saved to: tests/test-manifest.json")

        return True
    else:
        print(f"❌ Failed: {manifest.get('error')}")
        return False


if __name__ == "__main__":
    success = test_manifest()
    sys.exit(0 if success else 1)

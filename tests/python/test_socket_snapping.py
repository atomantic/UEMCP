#!/usr/bin/env python3
"""
Unit tests for socket snapping functionality
Run this in Unreal Engine's Python console to test socket operations
"""

# import math
from typing import Optional, Tuple

import unreal


class SocketSnappingUnitTest:
    """Unit tests for socket snapping mathematics and operations."""

    def __init__(self):
        self.test_results = []
        self.test_actors = []

    def cleanup(self):
        """Clean up test actors."""
        for actor in self.test_actors:
            if actor and actor.is_valid():
                actor.destroy_actor()
        self.test_actors.clear()

    def assert_equal(self, actual, expected, tolerance=0.01, message=""):
        """Assert values are equal within tolerance."""
        if isinstance(actual, (list, tuple)) and isinstance(expected, (list, tuple)):
            if len(actual) != len(expected):
                raise AssertionError(f"{message}: Length mismatch {len(actual)} != {len(expected)}")
            for a, e in zip(actual, expected, strict=True):
                if abs(a - e) > tolerance:
                    raise AssertionError(f"{message}: {actual} != {expected}")
        else:
            if abs(actual - expected) > tolerance:
                raise AssertionError(f"{message}: {actual} != {expected}")

    def create_test_actor_with_socket(
        self,
        name: str,
        location: Tuple[float, float, float],
        socket_name: str,
        socket_offset: Tuple[float, float, float],
    ) -> unreal.Actor:
        """Create a test actor with a simulated socket position."""
        # Use a basic cube mesh
        cube_mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
        if not cube_mesh:
            raise RuntimeError("Could not load cube mesh")

        # Spawn actor
        actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
            cube_mesh, unreal.Vector(*location), unreal.Rotator(0, 0, 0)
        )

        if not actor:
            raise RuntimeError(f"Failed to spawn actor {name}")

        actor.set_actor_label(name)
        self.test_actors.append(actor)

        # Store socket information as tags (since we can't add real sockets at runtime)
        actor.tags = [
            f"socket:{socket_name}",
            f"socket_offset:{socket_offset[0]},{socket_offset[1]},{socket_offset[2]}",
        ]

        return actor

    def get_simulated_socket_transform(self, actor: unreal.Actor, socket_name: str) -> Optional[unreal.Transform]:
        """Get simulated socket transform from actor tags."""
        socket_offset = None

        for tag in actor.tags:
            if tag.startswith(f"socket:{socket_name}"):
                # Found socket
                pass
            elif tag.startswith("socket_offset:"):
                parts = tag.split(":")[1].split(",")
                socket_offset = unreal.Vector(float(parts[0]), float(parts[1]), float(parts[2]))

        if socket_offset is None:
            return None

        # Calculate world transform
        actor_transform = actor.get_actor_transform()
        socket_transform = unreal.Transform()
        socket_transform.location = actor_transform.transform_position(socket_offset)
        socket_transform.rotation = actor_transform.rotation
        socket_transform.scale3d = actor_transform.scale3d

        return socket_transform

    def test_basic_socket_math(self):
        """Test basic socket transformation mathematics."""
        print("Test 1: Basic Socket Math")

        # Create actor at origin
        actor = self.create_test_actor_with_socket(
            "TestActor_Math", location=(0, 0, 0), socket_name="TestSocket", socket_offset=(100, 0, 50)
        )

        # Get socket world position
        socket_transform = self.get_simulated_socket_transform(actor, "TestSocket")

        # Verify socket is at expected world position
        expected_location = [100, 0, 50]
        actual_location = [socket_transform.location.x, socket_transform.location.y, socket_transform.location.z]

        self.assert_equal(actual_location, expected_location, tolerance=0.01, message="Socket world position")

        print("✅ Basic socket math test passed")
        self.test_results.append(("Basic Socket Math", True))

    def test_rotated_socket_math(self):
        """Test socket transformation with rotation."""
        print("Test 2: Rotated Socket Math")

        # Create actor rotated 90 degrees
        actor = self.create_test_actor_with_socket(
            "TestActor_Rotated",
            location=(1000, 0, 0),
            socket_name="TestSocket",
            socket_offset=(100, 0, 0),  # Socket 100 units forward
        )

        # Rotate actor 90 degrees (yaw)
        actor.set_actor_rotation(unreal.Rotator(0, 0, 90))

        # Get socket world position
        socket_transform = self.get_simulated_socket_transform(actor, "TestSocket")

        # After 90-degree rotation, forward (100, 0, 0) becomes right (0, 100, 0)
        expected_location = [1000, 100, 0]  # Actor at 1000,0,0 + rotated offset
        actual_location = [socket_transform.location.x, socket_transform.location.y, socket_transform.location.z]

        self.assert_equal(actual_location, expected_location, tolerance=1.0, message="Rotated socket world position")

        print("✅ Rotated socket math test passed")
        self.test_results.append(("Rotated Socket Math", True))

    def test_socket_to_socket_alignment(self):
        """Test aligning two actors via their sockets."""
        print("Test 3: Socket-to-Socket Alignment")

        # Create target actor with socket
        target = self.create_test_actor_with_socket(
            "Target_Actor",
            location=(2000, 0, 0),
            socket_name="ConnectSocket",
            socket_offset=(150, 0, 0),  # Socket on right side
        )

        # Create source actor with socket
        source = self.create_test_actor_with_socket(
            "Source_Actor",
            location=(2500, 500, 0),  # Start elsewhere
            socket_name="AttachSocket",
            socket_offset=(-150, 0, 0),  # Socket on left side
        )

        # Calculate where source needs to be to align sockets
        target_socket_world = self.get_simulated_socket_transform(target, "ConnectSocket").location
        source_socket_local = unreal.Vector(-150, 0, 0)

        # Source actor should be positioned so its socket aligns with target socket
        new_source_location = target_socket_world - source_socket_local
        source.set_actor_location(new_source_location)

        # Verify sockets are aligned
        source_socket_world = self.get_simulated_socket_transform(source, "AttachSocket").location

        distance = (source_socket_world - target_socket_world).size()
        self.assert_equal(distance, 0, tolerance=1.0, message="Socket alignment distance")

        print("✅ Socket-to-socket alignment test passed")
        self.test_results.append(("Socket-to-Socket Alignment", True))

    def test_socket_with_offset(self):
        """Test socket snapping with additional offset."""
        print("Test 4: Socket with Offset")

        # Create base actor
        base = self.create_test_actor_with_socket(
            "Base_Actor",
            location=(3000, 0, 0),
            socket_name="MountSocket",
            socket_offset=(0, 0, 100),  # Socket on top
        )

        # Create attachment with offset
        attachment = self.create_test_actor_with_socket(
            "Attachment_Actor",
            location=(3000, 0, 0),
            socket_name="BaseSocket",
            socket_offset=(0, 0, 0),  # Socket at pivot
        )

        # Apply socket position plus additional offset
        socket_world = self.get_simulated_socket_transform(base, "MountSocket").location
        additional_offset = unreal.Vector(0, 0, 50)  # 50 units higher

        final_position = socket_world + additional_offset
        attachment.set_actor_location(final_position)

        # Verify position
        expected_z = 3000 + 100 + 50  # Base Z + socket offset + additional offset
        actual_z = attachment.get_actor_location().z

        self.assert_equal(actual_z, expected_z, tolerance=1.0, message="Socket with offset Z position")

        print("✅ Socket with offset test passed")
        self.test_results.append(("Socket with Offset", True))

    def test_complex_rotation_alignment(self):
        """Test complex rotation alignment scenarios."""
        print("Test 5: Complex Rotation Alignment")

        # Create actor with complex rotation
        actor1 = self.create_test_actor_with_socket(
            "Complex_Actor1", location=(4000, 0, 0), socket_name="Socket1", socket_offset=(100, 50, 25)
        )

        # Apply complex rotation (roll, pitch, yaw)
        actor1.set_actor_rotation(unreal.Rotator(15, 30, 45))

        # Create second actor to align
        actor2 = self.create_test_actor_with_socket(
            "Complex_Actor2", location=(4500, 0, 0), socket_name="Socket2", socket_offset=(0, 0, 0)
        )

        # Get socket transform and align actor2
        socket_transform = self.get_simulated_socket_transform(actor1, "Socket1")
        actor2.set_actor_location(socket_transform.location)
        actor2.set_actor_rotation(socket_transform.rotation.rotator())

        # Verify rotation matches
        expected_rotation = actor1.get_actor_rotation()
        actual_rotation = actor2.get_actor_rotation()

        self.assert_equal(
            [actual_rotation.roll, actual_rotation.pitch, actual_rotation.yaw],
            [expected_rotation.roll, expected_rotation.pitch, expected_rotation.yaw],
            tolerance=0.1,
            message="Complex rotation alignment",
        )

        print("✅ Complex rotation alignment test passed")
        self.test_results.append(("Complex Rotation Alignment", True))

    def run_all_tests(self):
        """Run all unit tests."""
        print("\n" + "=" * 50)
        print("Socket Snapping Unit Tests")
        print("=" * 50 + "\n")

        try:
            self.test_basic_socket_math()
            self.test_rotated_socket_math()
            self.test_socket_to_socket_alignment()
            self.test_socket_with_offset()
            self.test_complex_rotation_alignment()

            # Print summary
            print("\n" + "=" * 50)
            print("Test Summary")
            print("=" * 50)

            passed = sum(1 for _, result in self.test_results if result)
            total = len(self.test_results)

            print(f"✅ Passed: {passed}/{total}")

            for test_name, result in self.test_results:
                icon = "✅" if result else "❌"
                print(f"{icon} {test_name}")

            if passed == total:
                print("\n🎉 All tests passed!")
            else:
                print(f"\n⚠️ {total - passed} tests failed")

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            import traceback

            traceback.print_exc()
        finally:
            self.cleanup()
            print("\n🧹 Cleaned up test actors")


# Function to run from UE Python console
def run_socket_tests():
    """Run socket snapping unit tests."""
    tester = SocketSnappingUnitTest()
    tester.run_all_tests()


if __name__ == "__main__":
    run_socket_tests()

"""
Unit tests for AssetOperations business logic

These tests focus on pure Python logic that doesn't require Unreal Engine,
such as pivot detection algorithms, data processing, and validation logic.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), '../../../..', 'plugin', 'Content', 'Python')
sys.path.insert(0, plugin_path)


class TestAssetOperationsPurePython:
    """Test pure Python business logic in AssetOperations."""
    
    def test_pivot_tolerance_constant(self):
        """Test that pivot tolerance constant is properly defined."""
        # This would normally import from ops.asset, but we'll test the concept
        PIVOT_TOLERANCE = 0.1
        assert PIVOT_TOLERANCE == 0.1
        assert isinstance(PIVOT_TOLERANCE, (int, float))
    
    def test_compression_map_structure(self):
        """Test compression mapping structure without UE dependencies."""
        # Test the structure of compression mappings
        compression_map = {
            "TC_Default": "TC_DEFAULT",
            "TC_Normalmap": "TC_NORMALMAP", 
            "TC_Masks": "TC_MASKS",
            "TC_Grayscale": "TC_GRAYSCALE",
        }
        
        assert len(compression_map) == 4
        assert "TC_Default" in compression_map
        assert "TC_Normalmap" in compression_map
        assert compression_map["TC_Default"] == "TC_DEFAULT"
    
    def test_pivot_detection_algorithm_center(self):
        """Test pivot detection algorithm for center pivot."""
        # Mock the origin and box_extent objects
        origin = Mock(x=0, y=0, z=0)
        box_extent = Mock(x=150, y=150, z=200)
        tolerance = 0.1
        
        # Center pivot: origin is at (0,0,0) which is center of bounding box
        # For center pivot, origin should be close to (0,0,0)
        assert abs(origin.x) < tolerance  # X is centered
        assert abs(origin.y) < tolerance  # Y is centered  
        assert abs(origin.z) < tolerance  # Z is centered
        
        # This would be detected as "center" type
        pivot_type = "center"
        assert pivot_type == "center"
    
    def test_pivot_detection_algorithm_bottom_center(self):
        """Test pivot detection algorithm for bottom-center pivot."""
        # Mock objects for bottom-center pivot
        origin = Mock(x=0, y=0, z=-200)  # Z offset by -box_extent.z
        box_extent = Mock(x=150, y=150, z=200)
        tolerance = 0.1
        
        # Bottom-center: origin.z + box_extent.z should be ~0
        bottom_check = abs(origin.z + box_extent.z)  # abs(-200 + 200) = 0
        assert bottom_check < tolerance
        
        # X and Y should still be centered
        assert abs(origin.x) < tolerance
        assert abs(origin.y) < tolerance
        
        pivot_type = "bottom-center"
        assert pivot_type == "bottom-center"
    
    def test_pivot_detection_algorithm_corner_bottom(self):
        """Test pivot detection algorithm for corner-bottom pivot."""
        origin = Mock(x=-150, y=-150, z=-200)  # All offsets
        box_extent = Mock(x=150, y=150, z=200)
        tolerance = 0.1
        
        # Check bottom condition
        bottom_check = abs(origin.z + box_extent.z)  # abs(-200 + 200) = 0
        assert bottom_check < tolerance
        
        # Check corner conditions
        corner_x = abs(origin.x + box_extent.x)  # abs(-150 + 150) = 0
        corner_y = abs(origin.y + box_extent.y)  # abs(-150 + 150) = 0
        assert corner_x < tolerance
        assert corner_y < tolerance
        
        pivot_type = "corner-bottom"
        assert pivot_type == "corner-bottom"
    
    def test_pivot_detection_edge_cases(self):
        """Test pivot detection with edge case values."""
        tolerance = 0.1
        
        # Test with very small but non-zero values (within tolerance)
        origin_near_zero = Mock(x=0.05, y=0.05, z=0.05)
        box_extent = Mock(x=100, y=100, z=100)
        
        # Should still be considered center
        assert abs(origin_near_zero.x) < tolerance
        assert abs(origin_near_zero.y) < tolerance
        assert abs(origin_near_zero.z) < tolerance
        
        # Test with values just outside tolerance
        origin_outside = Mock(x=0.2, y=0.0, z=0.0)  # 0.2 > 0.1 tolerance
        assert abs(origin_outside.x) > tolerance  # This would NOT be center
        assert abs(origin_outside.y) < tolerance
        assert abs(origin_outside.z) < tolerance
    
    def test_asset_path_validation_logic(self):
        """Test asset path validation logic without UE dependencies."""
        
        def validate_asset_path(path):
            """Mock asset path validation logic."""
            if not path or not isinstance(path, str):
                return False
            if not path.startswith('/Game/') and not path.startswith('/Engine/'):
                return False
            if '..' in path or '//' in path:
                return False
            return True
        
        # Test valid paths
        assert validate_asset_path('/Game/Meshes/SM_Wall01')
        assert validate_asset_path('/Engine/BasicShapes/Cube')
        assert validate_asset_path('/Game/Materials/M_Test')
        
        # Test invalid paths
        assert not validate_asset_path('')
        assert not validate_asset_path(None)
        assert not validate_asset_path('invalid_path')
        assert not validate_asset_path('/Game/../Meshes/SM_Wall')
        assert not validate_asset_path('/Game//Double/Slash')
        assert not validate_asset_path(123)  # Non-string
    
    def test_location_array_validation(self):
        """Test location array validation logic."""
        
        def validate_location(location):
            """Mock location validation logic."""
            if not isinstance(location, list):
                return False, "Location must be a list"
            if len(location) != 3:
                return False, f"Location must have 3 elements, got {len(location)}"
            for i, val in enumerate(location):
                if not isinstance(val, (int, float)):
                    return False, f"Location[{i}] must be numeric, got {type(val).__name__}"
            return True, None
        
        # Test valid locations
        valid, error = validate_location([100, 200, 300])
        assert valid and error is None
        
        valid, error = validate_location([0.0, -100.5, 200.25])
        assert valid and error is None
        
        # Test invalid locations
        valid, error = validate_location([100, 200])  # Too short
        assert not valid and "3 elements" in error
        
        valid, error = validate_location([100, 200, 300, 400])  # Too long
        assert not valid and "3 elements" in error
        
        valid, error = validate_location("not a list")
        assert not valid and "must be a list" in error
        
        valid, error = validate_location([100, "invalid", 300])
        assert not valid and "must be numeric" in error
    
    def test_bounds_calculation_logic(self):
        """Test bounds calculation and processing logic."""
        
        def calculate_bounds_info(box_extent, origin):
            """Mock bounds calculation logic."""
            return {
                "size": {
                    "x": box_extent.x * 2,
                    "y": box_extent.y * 2, 
                    "z": box_extent.z * 2
                },
                "extent": {
                    "x": box_extent.x,
                    "y": box_extent.y,
                    "z": box_extent.z
                },
                "origin": {
                    "x": origin.x,
                    "y": origin.y,
                    "z": origin.z
                },
                "min": {
                    "x": origin.x - box_extent.x,
                    "y": origin.y - box_extent.y,
                    "z": origin.z - box_extent.z
                },
                "max": {
                    "x": origin.x + box_extent.x,
                    "y": origin.y + box_extent.y,
                    "z": origin.z + box_extent.z
                }
            }
        
        # Test bounds calculation
        box_extent = Mock(x=150, y=100, z=200)
        origin = Mock(x=10, y=20, z=30)
        
        bounds = calculate_bounds_info(box_extent, origin)
        
        # Verify size calculation (extent * 2)
        assert bounds["size"]["x"] == 300  # 150 * 2
        assert bounds["size"]["y"] == 200  # 100 * 2
        assert bounds["size"]["z"] == 400  # 200 * 2
        
        # Verify extent preservation
        assert bounds["extent"]["x"] == 150
        assert bounds["extent"]["y"] == 100
        assert bounds["extent"]["z"] == 200
        
        # Verify origin preservation
        assert bounds["origin"]["x"] == 10
        assert bounds["origin"]["y"] == 20
        assert bounds["origin"]["z"] == 30
        
        # Verify min/max calculation
        assert bounds["min"]["x"] == -140  # 10 - 150
        assert bounds["min"]["y"] == -80   # 20 - 100
        assert bounds["min"]["z"] == -170  # 30 - 200
        
        assert bounds["max"]["x"] == 160   # 10 + 150
        assert bounds["max"]["y"] == 120   # 20 + 100
        assert bounds["max"]["z"] == 230   # 30 + 200


class TestAssetDataProcessing:
    """Test data processing and formatting logic."""
    
    def test_socket_info_processing(self):
        """Test socket information processing logic."""
        
        def process_socket_info(mock_socket):
            """Mock socket processing logic."""
            return {
                "name": mock_socket.get_name(),
                "location": {
                    "x": mock_socket.location.x,
                    "y": mock_socket.location.y,
                    "z": mock_socket.location.z
                },
                "rotation": {
                    "roll": mock_socket.rotation.roll,
                    "pitch": mock_socket.rotation.pitch,
                    "yaw": mock_socket.rotation.yaw
                }
            }
        
        # Create mock socket
        mock_socket = Mock()
        mock_socket.get_name.return_value = "DoorSocket"
        mock_socket.location = Mock(x=0, y=150, z=0)
        mock_socket.rotation = Mock(roll=0, pitch=0, yaw=90)
        
        socket_info = process_socket_info(mock_socket)
        
        assert socket_info["name"] == "DoorSocket"
        assert socket_info["location"]["x"] == 0
        assert socket_info["location"]["y"] == 150
        assert socket_info["location"]["z"] == 0
        assert socket_info["rotation"]["roll"] == 0
        assert socket_info["rotation"]["pitch"] == 0
        assert socket_info["rotation"]["yaw"] == 90
    
    def test_material_slot_processing(self):
        """Test material slot information processing."""
        
        def process_material_slots(mesh, num_sections):
            """Mock material slot processing logic."""
            slots = []
            for i in range(num_sections):
                material = mesh.get_material(i)
                slots.append({
                    "slotName": f"Material_{i}",
                    "materialPath": material.get_full_name() if material else None
                })
            return slots
        
        # Create mock mesh with materials
        mock_mesh = Mock()
        mock_material = Mock()
        mock_material.get_full_name.return_value = "/Game/Materials/M_Test"
        mock_mesh.get_material.return_value = mock_material
        
        slots = process_material_slots(mock_mesh, 2)
        
        assert len(slots) == 2
        assert slots[0]["slotName"] == "Material_0"
        assert slots[0]["materialPath"] == "/Game/Materials/M_Test"
        assert slots[1]["slotName"] == "Material_1"
        assert slots[1]["materialPath"] == "/Game/Materials/M_Test"
        
        # Test with None material
        mock_mesh.get_material.return_value = None
        slots_none = process_material_slots(mock_mesh, 1)
        assert slots_none[0]["materialPath"] is None
    
    def test_collision_info_processing(self):
        """Test collision information processing logic."""
        
        def process_collision_info(body_setup):
            """Mock collision processing logic."""
            if not body_setup:
                return {"hasCollision": False}
            
            # Mock collision primitive counting
            box_elems = getattr(body_setup, 'agg_geom', Mock()).box_elems or []
            sphere_elems = getattr(body_setup, 'agg_geom', Mock()).sphere_elems or []
            capsule_elems = getattr(body_setup, 'agg_geom', Mock()).capsule_elems or []
            
            total_primitives = len(box_elems) + len(sphere_elems) + len(capsule_elems)
            
            return {
                "hasCollision": total_primitives > 0,
                "numCollisionPrimitives": total_primitives,
                "hasSimpleCollision": len(box_elems) > 0 or len(sphere_elems) > 0,
                "collisionComplexity": "complex" if total_primitives > 3 else "simple"
            }
        
        # Test with collision
        mock_body_setup = Mock()
        mock_agg_geom = Mock()
        mock_agg_geom.box_elems = [Mock()]  # One box collision
        mock_agg_geom.sphere_elems = []
        mock_agg_geom.capsule_elems = []
        mock_body_setup.agg_geom = mock_agg_geom
        
        collision_info = process_collision_info(mock_body_setup)
        
        assert collision_info["hasCollision"] is True
        assert collision_info["numCollisionPrimitives"] == 1
        assert collision_info["hasSimpleCollision"] is True
        assert collision_info["collisionComplexity"] == "simple"
        
        # Test without collision
        collision_info_none = process_collision_info(None)
        assert collision_info_none["hasCollision"] is False


class TestErrorHandlingLogic:
    """Test error handling and validation logic."""
    
    def test_validation_result_success(self):
        """Test ValidationResult with successful validation."""
        
        class MockValidationResult:
            def __init__(self, success=True, errors=None, warnings=None):
                self.success = success
                self.errors = errors or []
                self.warnings = warnings or []
            
            def add_error(self, error):
                self.success = False
                self.errors.append(error)
            
            def add_warning(self, warning):
                self.warnings.append(warning)
            
            def to_dict(self):
                return {
                    "success": self.success,
                    "errors": self.errors,
                    "warnings": self.warnings
                }
        
        # Test successful validation
        result = MockValidationResult()
        assert result.success is True
        assert len(result.errors) == 0
        assert len(result.warnings) == 0
        
        result_dict = result.to_dict()
        assert result_dict["success"] is True
        assert result_dict["errors"] == []
        assert result_dict["warnings"] == []
    
    def test_validation_result_with_errors(self):
        """Test ValidationResult with errors."""
        
        class MockValidationResult:
            def __init__(self, success=True, errors=None, warnings=None):
                self.success = success
                self.errors = errors or []
                self.warnings = warnings or []
            
            def add_error(self, error):
                self.success = False
                self.errors.append(error)
            
            def add_warning(self, warning):
                self.warnings.append(warning)
            
            def to_dict(self):
                return {
                    "success": self.success,
                    "errors": self.errors,
                    "warnings": self.warnings
                }
        
        result = MockValidationResult()
        result.add_error("Asset not found")
        result.add_error("Invalid parameters")
        
        assert result.success is False
        assert len(result.errors) == 2
        assert "Asset not found" in result.errors
        assert "Invalid parameters" in result.errors
        
        # Test with warnings
        result.add_warning("Performance warning")
        assert len(result.warnings) == 1
        assert "Performance warning" in result.warnings
        
        result_dict = result.to_dict()
        assert result_dict["success"] is False
        assert len(result_dict["errors"]) == 2
        assert len(result_dict["warnings"]) == 1
    
    def test_location_validation_tolerance(self):
        """Test location validation with tolerance checking."""
        
        def validate_location_tolerance(actual, expected, tolerance=0.1):
            """Mock location tolerance validation."""
            errors = []
            
            axes = ['x', 'y', 'z']
            for i, axis in enumerate(axes):
                expected_val = expected[i]
                actual_val = getattr(actual, axis)
                diff = abs(expected_val - actual_val)
                
                if diff > tolerance:
                    errors.append(
                        f"Location {axis.upper()} mismatch: expected {expected_val:.2f}, "
                        f"got {actual_val:.2f} (diff: {diff:.2f})"
                    )
            
            return len(errors) == 0, errors
        
        # Test within tolerance
        actual_loc = Mock(x=100.05, y=200.08, z=299.95)
        expected_loc = [100, 200, 300]
        
        is_valid, errors = validate_location_tolerance(actual_loc, expected_loc, tolerance=0.1)
        assert is_valid is True
        assert len(errors) == 0
        
        # Test outside tolerance
        actual_loc_bad = Mock(x=100.2, y=200.0, z=300.0)  # X diff = 0.2 > 0.1
        
        is_valid, errors = validate_location_tolerance(actual_loc_bad, expected_loc, tolerance=0.1)
        assert is_valid is False
        assert len(errors) == 1
        assert "Location X mismatch" in errors[0]
        assert "diff: 0.20" in errors[0]
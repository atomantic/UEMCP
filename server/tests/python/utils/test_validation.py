"""
Unit tests for validation utilities

These tests focus on the pure Python validation logic that can be tested
without Unreal Engine dependencies.
"""

from unittest.mock import Mock


class TestValidationResult:
    """Test ValidationResult business logic."""

    def setup_method(self):
        """Set up ValidationResult mock class for testing."""

        class ValidationResult:
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
                return {"success": self.success, "errors": self.errors, "warnings": self.warnings}

        self.ValidationResult = ValidationResult

    def test_successful_validation_result(self):
        """Test creating successful validation result."""
        result = self.ValidationResult()

        assert result.success is True
        assert result.errors == []
        assert result.warnings == []

        result_dict = result.to_dict()
        assert result_dict == {"success": True, "errors": [], "warnings": []}

    def test_validation_result_with_initial_errors(self):
        """Test creating validation result with initial errors."""
        initial_errors = ["Error 1", "Error 2"]
        result = self.ValidationResult(success=False, errors=initial_errors)

        assert result.success is False
        assert result.errors == initial_errors
        assert result.warnings == []

    def test_validation_result_with_initial_warnings(self):
        """Test creating validation result with initial warnings."""
        initial_warnings = ["Warning 1", "Warning 2"]
        result = self.ValidationResult(warnings=initial_warnings)

        assert result.success is True  # Warnings don't affect success
        assert result.errors == []
        assert result.warnings == initial_warnings

    def test_add_error_changes_success(self):
        """Test that adding error changes success to False."""
        result = self.ValidationResult()
        assert result.success is True

        result.add_error("Something went wrong")

        assert result.success is False
        assert len(result.errors) == 1
        assert result.errors[0] == "Something went wrong"

    def test_add_multiple_errors(self):
        """Test adding multiple errors."""
        result = self.ValidationResult()

        result.add_error("Error 1")
        result.add_error("Error 2")
        result.add_error("Error 3")

        assert result.success is False
        assert len(result.errors) == 3
        assert "Error 1" in result.errors
        assert "Error 2" in result.errors
        assert "Error 3" in result.errors

    def test_add_warning_preserves_success(self):
        """Test that adding warning preserves success state."""
        result = self.ValidationResult()
        assert result.success is True

        result.add_warning("Minor issue")

        assert result.success is True  # Success unchanged
        assert len(result.warnings) == 1
        assert result.warnings[0] == "Minor issue"

    def test_add_multiple_warnings(self):
        """Test adding multiple warnings."""
        result = self.ValidationResult()

        result.add_warning("Warning 1")
        result.add_warning("Warning 2")

        assert result.success is True
        assert len(result.warnings) == 2
        assert "Warning 1" in result.warnings
        assert "Warning 2" in result.warnings

    def test_mixed_errors_and_warnings(self):
        """Test result with both errors and warnings."""
        result = self.ValidationResult()

        result.add_warning("Warning first")
        result.add_error("Error comes after")
        result.add_warning("Another warning")

        assert result.success is False  # Error makes it fail
        assert len(result.errors) == 1
        assert len(result.warnings) == 2

        result_dict = result.to_dict()
        assert result_dict["success"] is False
        assert "Error comes after" in result_dict["errors"]
        assert "Warning first" in result_dict["warnings"]
        assert "Another warning" in result_dict["warnings"]


class TestLocationValidation:
    """Test location validation business logic."""

    def test_validate_actor_location_success(self):
        """Test successful location validation."""

        def validate_actor_location(actor, expected_location, tolerance=0.1):
            """Mock location validation logic."""
            result = {"success": True, "errors": [], "warnings": []}

            try:
                actual_location = actor.get_actor_location()

                for axis, expected, actual in [
                    ("X", expected_location[0], actual_location.x),
                    ("Y", expected_location[1], actual_location.y),
                    ("Z", expected_location[2], actual_location.z),
                ]:
                    diff = abs(expected - actual)
                    if diff > tolerance:
                        result["success"] = False
                        result["errors"].append(
                            f"Location {axis} mismatch: expected {expected:.2f}, "
                            f"got {actual:.2f} (diff: {diff:.2f})"
                        )
            except Exception as e:
                result["success"] = False
                result["errors"].append(f"Failed to validate location: {str(e)}")

            return result

        # Test successful validation
        mock_actor = Mock()
        mock_actor.get_actor_location.return_value = Mock(x=100.05, y=200.02, z=299.98)
        expected = [100, 200, 300]

        result = validate_actor_location(mock_actor, expected, tolerance=0.1)

        assert result["success"] is True
        assert len(result["errors"]) == 0

    def test_validate_actor_location_failure(self):
        """Test failed location validation."""

        def validate_actor_location(actor, expected_location, tolerance=0.1):
            """Mock location validation logic."""
            result = {"success": True, "errors": [], "warnings": []}

            try:
                actual_location = actor.get_actor_location()

                for axis, expected, actual in [
                    ("X", expected_location[0], actual_location.x),
                    ("Y", expected_location[1], actual_location.y),
                    ("Z", expected_location[2], actual_location.z),
                ]:
                    diff = abs(expected - actual)
                    if diff > tolerance:
                        result["success"] = False
                        result["errors"].append(
                            f"Location {axis} mismatch: expected {expected:.2f}, "
                            f"got {actual:.2f} (diff: {diff:.2f})"
                        )
            except Exception as e:
                result["success"] = False
                result["errors"].append(f"Failed to validate location: {str(e)}")

            return result

        # Test failed validation - X and Z are out of tolerance
        mock_actor = Mock()
        mock_actor.get_actor_location.return_value = Mock(x=100.5, y=200.0, z=300.8)  # X diff=0.5, Z diff=0.8
        expected = [100, 200, 300]

        result = validate_actor_location(mock_actor, expected, tolerance=0.1)

        assert result["success"] is False
        assert len(result["errors"]) == 2
        assert any("Location X mismatch" in error for error in result["errors"])
        assert any("Location Z mismatch" in error for error in result["errors"])
        assert any("diff: 0.50" in error for error in result["errors"])
        assert any("diff: 0.80" in error for error in result["errors"])

    def test_validate_actor_location_exception(self):
        """Test location validation with exception."""

        def validate_actor_location(actor, expected_location, tolerance=0.1):
            """Mock location validation logic."""
            result = {"success": True, "errors": [], "warnings": []}

            try:
                actual_location = actor.get_actor_location()

                for axis, expected, actual in [
                    ("X", expected_location[0], actual_location.x),
                    ("Y", expected_location[1], actual_location.y),
                    ("Z", expected_location[2], actual_location.z),
                ]:
                    diff = abs(expected - actual)
                    if diff > tolerance:
                        result["success"] = False
                        result["errors"].append(
                            f"Location {axis} mismatch: expected {expected:.2f}, "
                            f"got {actual:.2f} (diff: {diff:.2f})"
                        )
            except Exception as e:
                result["success"] = False
                result["errors"].append(f"Failed to validate location: {str(e)}")

            return result

        # Test with actor that raises exception
        mock_actor = Mock()
        mock_actor.get_actor_location.side_effect = RuntimeError("Actor is None")
        expected = [100, 200, 300]

        result = validate_actor_location(mock_actor, expected)

        assert result["success"] is False
        assert len(result["errors"]) == 1
        assert "Failed to validate location: Actor is None" in result["errors"][0]

    def test_validate_location_with_different_tolerances(self):
        """Test location validation with different tolerance values."""

        def validate_with_tolerance(actual_loc, expected_loc, tolerance):
            """Helper to test tolerance validation."""
            errors = []
            for axis, expected, actual in [
                ("X", expected_loc[0], actual_loc.x),
                ("Y", expected_loc[1], actual_loc.y),
                ("Z", expected_loc[2], actual_loc.z),
            ]:
                diff = abs(expected - actual)
                if diff > tolerance:
                    errors.append(f"Location {axis} diff: {diff:.3f}")
            return len(errors) == 0, errors

        # Test same location with different tolerances
        actual = Mock(x=100.15, y=200.0, z=300.25)
        expected = [100, 200, 300]

        # Strict tolerance - should fail
        is_valid, errors = validate_with_tolerance(actual, expected, tolerance=0.1)
        assert is_valid is False
        assert len(errors) == 2  # X and Z fail

        # Loose tolerance - should pass
        is_valid, errors = validate_with_tolerance(actual, expected, tolerance=0.3)
        assert is_valid is True
        assert len(errors) == 0

        # Medium tolerance - only Z should fail
        is_valid, errors = validate_with_tolerance(actual, expected, tolerance=0.2)
        assert is_valid is False
        assert len(errors) == 1  # Only Z fails (0.25 > 0.2)


class TestRotationValidation:
    """Test rotation validation business logic."""

    def test_validate_actor_rotation(self):
        """Test actor rotation validation logic."""

        def validate_actor_rotation(actor, expected_rotation, tolerance=1.0):
            """Mock rotation validation logic."""
            result = {"success": True, "errors": [], "warnings": []}

            try:
                actual_rotation = actor.get_actor_rotation()

                for axis, expected, actual in [
                    ("Roll", expected_rotation[0], actual_rotation.roll),
                    ("Pitch", expected_rotation[1], actual_rotation.pitch),
                    ("Yaw", expected_rotation[2], actual_rotation.yaw),
                ]:
                    # Normalize angles to -180 to 180 range
                    def normalize_angle(angle):
                        while angle > 180:
                            angle -= 360
                        while angle < -180:
                            angle += 360
                        return angle

                    expected_norm = normalize_angle(expected)
                    actual_norm = normalize_angle(actual)

                    # Calculate shortest angular difference (accounting for wrap-around)
                    diff = abs(expected_norm - actual_norm)
                    if diff > 180:
                        diff = 360 - diff

                    if diff > tolerance:
                        result["success"] = False
                        result["errors"].append(
                            f"Rotation {axis} mismatch: expected {expected_norm:.2f}°, "
                            f"got {actual_norm:.2f}° (diff: {diff:.2f}°)"
                        )
            except Exception as e:
                result["success"] = False
                result["errors"].append(f"Failed to validate rotation: {str(e)}")

            return result

        # Test successful rotation validation
        mock_actor = Mock()
        mock_actor.get_actor_rotation.return_value = Mock(roll=0.5, pitch=89.8, yaw=180.2)
        expected = [0, 90, 180]  # [roll, pitch, yaw]

        result = validate_actor_rotation(mock_actor, expected, tolerance=1.0)

        # Debug: Let's check what the actual differences are
        if not result["success"]:
            print(f"Rotation validation failed: {result['errors']}")

        assert result["success"] is True
        assert len(result["errors"]) == 0

    def test_validate_rotation_angle_normalization(self):
        """Test angle normalization in rotation validation."""

        def normalize_angle(angle):
            """Normalize angle to -180 to 180 range."""
            while angle > 180:
                angle -= 360
            while angle < -180:
                angle += 360
            return angle

        # Test various angle normalizations
        assert normalize_angle(0) == 0
        assert normalize_angle(180) == 180
        assert normalize_angle(-180) == -180
        assert normalize_angle(270) == -90  # 270 - 360 = -90
        assert normalize_angle(-270) == 90  # -270 + 360 = 90
        assert normalize_angle(450) == 90  # 450 - 360 = 90
        assert normalize_angle(-450) == -90  # -450 + 360 = -90

        # Test edge cases
        assert normalize_angle(181) == -179  # 181 - 360 = -179
        assert normalize_angle(-181) == 179  # -181 + 360 = 179


class TestValidationUtilities:
    """Test general validation utility functions."""

    def test_tolerance_comparison(self):
        """Test tolerance-based comparison utility."""

        def within_tolerance(value1, value2, tolerance):
            """Check if two values are within tolerance."""
            return abs(value1 - value2) <= tolerance

        # Test exact match
        assert within_tolerance(100.0, 100.0, 0.1) is True

        # Test within tolerance
        assert within_tolerance(100.0, 100.05, 0.1) is True
        assert within_tolerance(100.0, 99.95, 0.1) is True

        # Test outside tolerance
        assert within_tolerance(100.0, 100.15, 0.1) is False
        assert within_tolerance(100.0, 99.85, 0.1) is False

        # Test with zero tolerance (exact match only)
        assert within_tolerance(100.0, 100.0, 0.0) is True
        assert within_tolerance(100.0, 100.001, 0.0) is False

        # Test with negative values
        assert within_tolerance(-50.0, -50.05, 0.1) is True
        assert within_tolerance(-50.0, -50.15, 0.1) is False

    def test_array_validation_logic(self):
        """Test array validation utility logic."""

        def validate_3d_array(arr, name="array"):
            """Validate 3D coordinate array."""
            errors = []

            if not isinstance(arr, list):
                errors.append(f"{name} must be a list")
                return errors

            if len(arr) != 3:
                errors.append(f"{name} must have exactly 3 elements, got {len(arr)}")
                return errors

            for i, val in enumerate(arr):
                if not isinstance(val, (int, float)):
                    errors.append(f"{name}[{i}] must be numeric, got {type(val).__name__}")

            return errors

        # Test valid arrays
        assert validate_3d_array([1, 2, 3]) == []
        assert validate_3d_array([1.0, 2.5, -3.8]) == []
        assert validate_3d_array([0, 0, 0]) == []

        # Test invalid arrays
        errors = validate_3d_array([1, 2])
        assert len(errors) == 1
        assert "exactly 3 elements" in errors[0]

        errors = validate_3d_array([1, 2, 3, 4])
        assert len(errors) == 1
        assert "exactly 3 elements" in errors[0]

        errors = validate_3d_array([1, "invalid", 3])
        assert len(errors) == 1
        assert "must be numeric" in errors[0]
        assert "array[1]" in errors[0]

        errors = validate_3d_array("not a list", "location")
        assert len(errors) == 1
        assert "location must be a list" in errors[0]

        # Test multiple errors
        errors = validate_3d_array([1, "bad", None, "extra"])
        assert len(errors) == 1  # Length error comes first, stops validation
        assert "exactly 3 elements" in errors[0]

    def test_validation_error_formatting(self):
        """Test validation error message formatting."""

        def format_validation_errors(errors, warnings=None):
            """Format validation results for display."""
            if not errors and not warnings:
                return "✓ Validation passed"

            result = []
            if errors:
                result.append(f"✗ Validation failed ({len(errors)} errors):")
                for error in errors:
                    result.append(f"  - {error}")

            if warnings:
                result.append(f"⚠ Warnings ({len(warnings)}):")
                for warning in warnings:
                    result.append(f"  - {warning}")

            return "\n".join(result)

        # Test no issues
        assert format_validation_errors([]) == "✓ Validation passed"

        # Test single error
        formatted = format_validation_errors(["Asset not found"])
        expected = "✗ Validation failed (1 errors):\n  - Asset not found"
        assert formatted == expected

        # Test multiple errors
        errors = ["Asset not found", "Invalid location"]
        formatted = format_validation_errors(errors)
        assert "✗ Validation failed (2 errors):" in formatted
        assert "  - Asset not found" in formatted
        assert "  - Invalid location" in formatted

        # Test warnings only
        warnings = ["Performance warning"]
        formatted = format_validation_errors([], warnings)
        expected = "⚠ Warnings (1):\n  - Performance warning"
        assert formatted == expected

        # Test errors and warnings
        errors = ["Critical error"]
        warnings = ["Minor warning"]
        formatted = format_validation_errors(errors, warnings)
        assert "✗ Validation failed (1 errors):" in formatted
        assert "⚠ Warnings (1):" in formatted
        assert "  - Critical error" in formatted
        assert "  - Minor warning" in formatted

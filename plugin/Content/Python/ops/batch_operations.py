"""
UEMCP Batch Operations - Execute multiple operations in single HTTP request
"""

import time
from typing import Any, Dict, List, Optional

from utils import log_debug, track_operation


class BatchOperationManager:
    """Manages batch execution of multiple operations."""

    def __init__(self):
        self.operations = []
        self.start_time = None
        # Cache operation instances for efficiency
        self._actor_ops = None
        self._viewport_ops = None

    def _get_actor_operations(self):
        """Get cached ActorOperations instance."""
        if self._actor_ops is None:
            from ops.actor import ActorOperations

            self._actor_ops = ActorOperations()
        return self._actor_ops

    def _get_viewport_operations(self):
        """Get cached ViewportOperations instance."""
        if self._viewport_ops is None:
            from ops.viewport import ViewportOperations

            self._viewport_ops = ViewportOperations()
        return self._viewport_ops

    def execute_batch(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute multiple operations in a single batch.

        Args:
            operations: List of operation dictionaries with:
                - operation: Operation name (e.g., 'actor_spawn', 'actor_modify')
                - params: Operation parameters
                - id: Optional operation ID for result tracking

        Returns:
            Dict with results for each operation
        """
        log_debug(f"Executing batch of {len(operations)} operations")
        self.start_time = time.time()

        results = {
            "success": True,
            "operations": [],
            "successCount": 0,
            "failureCount": 0,
            "executionTime": 0,
        }

        for i, op in enumerate(operations):
            op_id = op.get("id", f"op_{i}")
            operation_name = op.get("operation")
            params = op.get("params", {})

            # Validate operation parameters upfront
            if not operation_name:
                operation_result = {
                    "id": op_id,
                    "operation": "unknown",
                    "success": False,
                    "error": "Missing operation name",
                }
                results["operations"].append(operation_result)
                results["failureCount"] += 1
                results["success"] = False
                continue

            if not isinstance(params, dict):
                operation_result = {
                    "id": op_id,
                    "operation": operation_name,
                    "success": False,
                    "error": "Invalid params - must be dictionary",
                }
                results["operations"].append(operation_result)
                results["failureCount"] += 1
                results["success"] = False
                continue

            log_debug(f"Executing operation {op_id}: {operation_name}")

            # Execute the operation - let the operation handle its own errors
            op_result = self._execute_single_operation(operation_name, params)

            # Track result with proper error extraction
            operation_result = {
                "id": op_id,
                "operation": operation_name,
                "success": op_result.get("success", False),
                "result": op_result,
            }

            # Extract error message for failed operations
            if not operation_result["success"] and "error" in op_result:
                operation_result["error"] = op_result["error"]

            if operation_result["success"]:
                results["successCount"] += 1
            else:
                results["failureCount"] += 1
                results["success"] = False  # Mark batch as failed if any operation fails

            results["operations"].append(operation_result)

        results["executionTime"] = time.time() - self.start_time
        log_debug(f"Batch execution completed in {results['executionTime']:.2f}s")

        # Track the entire batch as a single operation for memory management
        track_operation()

        return results

    def _supported_operations(self) -> Dict[str, str]:
        return {
            "actor_spawn": "spawn_actor",
            "actor_modify": "modify_actor",
            "actor_delete": "delete_actor",
            "actor_duplicate": "duplicate_actor",
            "viewport_camera": "set_camera",
            "viewport_screenshot": "take_screenshot",
        }

    def _expected_params_map(self) -> Dict[str, set]:
        return {
            "actor_spawn": {"assetPath", "location", "rotation", "scale", "name", "folder", "validate"},
            "actor_modify": {"actorName", "location", "rotation", "scale", "mesh", "folder", "validate"},
            "actor_delete": {"actorName", "validate"},
            "actor_duplicate": {"sourceName", "name", "offset", "validate"},
            "viewport_camera": {"location", "rotation", "distance", "focusActor"},
            "viewport_screenshot": {"width", "height", "compress", "quality", "screenPercentage"},
        }

    def _get_method(self, operation: str):
        op_to_method = self._supported_operations()
        if operation not in op_to_method:
            return None
        method_name = op_to_method[operation]
        if operation.startswith("actor_"):
            return getattr(self._get_actor_operations(), method_name, None)
        if operation.startswith("viewport_"):
            return getattr(self._get_viewport_operations(), method_name, None)
        return None

    def _validate_param_names(self, operation: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        expected = self._expected_params_map()
        if operation not in expected:
            return {"success": False, "error": f"Unknown operation '{operation}' - parameter validation not defined"}
        allowed = expected[operation]
        provided = set(params.keys())
        invalid = provided - allowed
        if invalid:
            invalid_list = ", ".join(sorted(invalid))
            allowed_list = ", ".join(sorted(allowed))
            return {
                "success": False,
                "error": f"Invalid parameters for {operation}: {invalid_list}. Allowed: {allowed_list}",
            }
        return None

    def _validate_common_types(self, params: Dict[str, Any]) -> Optional[str]:
        errors = []
        if "actorName" in params and params["actorName"] is not None:
            if not isinstance(params["actorName"], str) or not params["actorName"].strip():
                errors.append("'actorName' must be a non-empty string")
        if "assetPath" in params and params["assetPath"] is not None:
            if not isinstance(params["assetPath"], str) or not params["assetPath"].strip():
                errors.append("'assetPath' must be a non-empty string")
        if "location" in params and params["location"] is not None:
            if not isinstance(params["location"], list) or len(params["location"]) != 3:
                errors.append("'location' must be a list of 3 numbers [X, Y, Z]")
            elif not all(isinstance(x, (int, float)) for x in params["location"]):
                errors.append("'location' values must be numbers")
        if "rotation" in params and params["rotation"] is not None:
            if not isinstance(params["rotation"], list) or len(params["rotation"]) != 3:
                errors.append("'rotation' must be a list of 3 numbers [Roll, Pitch, Yaw]")
            elif not all(isinstance(x, (int, float)) for x in params["rotation"]):
                errors.append("'rotation' values must be numbers")
        if "validate" in params and params["validate"] is not None:
            if not isinstance(params["validate"], bool):
                errors.append("'validate' must be a boolean")
        return "; ".join(errors) if errors else None

    def _execute_single_operation(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single operation within the batch."""
        method = self._get_method(operation)
        if method is None:
            return {"success": False, "error": f"Unsupported or unknown operation: {operation}"}
        if not isinstance(params, dict):
            return {
                "success": False,
                "error": f"Invalid params type for {operation}: expected dict, got {type(params).__name__}",
            }
        name_check = self._validate_param_names(operation, params)
        if name_check:
            return name_check
        type_error = self._validate_common_types(params)
        if type_error:
            return {"success": False, "error": f"Parameter validation failed for {operation}: {type_error}"}
        return method(**params)


# Global batch manager instance
_batch_manager = BatchOperationManager()


def execute_batch_operations(operations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Execute multiple operations in a batch.

    Args:
        operations: List of operations to execute

    Returns:
        Batch execution results
    """
    return _batch_manager.execute_batch(operations)

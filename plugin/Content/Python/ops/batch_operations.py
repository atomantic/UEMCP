"""
UEMCP Batch Operations - Execute multiple operations in single HTTP request
"""

import time
from typing import Any, Dict, List

from uemcp_command_registry import dispatch_command
from utils import log_debug, track_operation


class BatchOperationManager:
    """Manages batch execution of multiple operations."""

    def __init__(self):
        self.operations = []
        self.start_time = None

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

    def _execute_single_operation(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single operation within the batch via the command registry."""
        return dispatch_command(operation, params)


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

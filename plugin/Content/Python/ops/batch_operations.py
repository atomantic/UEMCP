"""
UEMCP Batch Operations - Execute multiple operations in single HTTP request
"""

import time
from typing import List, Dict, Any, Optional
from utils import log_debug, log_error, track_operation


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
            'success': True,
            'operations': [],
            'successCount': 0,
            'failureCount': 0,
            'executionTime': 0,
        }
        
        for i, op in enumerate(operations):
            op_id = op.get('id', f'op_{i}')
            operation_name = op.get('operation')
            params = op.get('params', {})
            
            # Validate operation parameters upfront
            if not operation_name:
                operation_result = {
                    'id': op_id,
                    'operation': 'unknown',
                    'success': False,
                    'error': 'Missing operation name'
                }
                results['operations'].append(operation_result)
                results['failureCount'] += 1
                results['success'] = False
                continue
            
            if not isinstance(params, dict):
                operation_result = {
                    'id': op_id,
                    'operation': operation_name,
                    'success': False,
                    'error': 'Invalid params - must be dictionary'
                }
                results['operations'].append(operation_result)
                results['failureCount'] += 1
                results['success'] = False
                continue
            
            log_debug(f"Executing operation {op_id}: {operation_name}")
            
            # Execute the operation - let the operation handle its own errors
            op_result = self._execute_single_operation(operation_name, params)
            
            # Track result with proper error extraction
            operation_result = {
                'id': op_id,
                'operation': operation_name,
                'success': op_result.get('success', False),
                'result': op_result
            }
            
            # Extract error message for failed operations
            if not operation_result['success'] and 'error' in op_result:
                operation_result['error'] = op_result['error']
            
            if operation_result['success']:
                results['successCount'] += 1
            else:
                results['failureCount'] += 1
                results['success'] = False  # Mark batch as failed if any operation fails
            
            results['operations'].append(operation_result)
        
        results['executionTime'] = time.time() - self.start_time
        log_debug(f"Batch execution completed in {results['executionTime']:.2f}s")
        
        # Track the entire batch as a single operation for memory management
        track_operation()
        
        return results
    
    def _execute_single_operation(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single operation within the batch.
        
        Args:
            operation: Operation name
            params: Operation parameters
        
        Returns:
            Operation result dictionary with success/error status
        """
        # Validate operation is supported and define expected parameters
        supported_operations = {
            'actor_spawn': ('ops.actor', 'ActorOperations', 'spawn_actor'),
            'actor_modify': ('ops.actor', 'ActorOperations', 'modify_actor'),
            'actor_delete': ('ops.actor', 'ActorOperations', 'delete_actor'),
            'actor_duplicate': ('ops.actor', 'ActorOperations', 'duplicate_actor'),
            'viewport_camera': ('ops.viewport', 'ViewportOperations', 'set_camera'),
            'viewport_screenshot': ('ops.viewport', 'ViewportOperations', 'take_screenshot'),
        }
        
        # Expected parameter names for each operation (for security validation)
        expected_params = {
            'actor_spawn': {'assetPath', 'location', 'rotation', 'scale', 'name', 'folder', 'validate'},
            'actor_modify': {'actorName', 'location', 'rotation', 'scale', 'mesh', 'folder', 'validate'},
            'actor_delete': {'actorName', 'validate'},
            'actor_duplicate': {'sourceName', 'name', 'offset', 'validate'},
            'viewport_camera': {'location', 'rotation', 'distance', 'focusActor'},
            'viewport_screenshot': {'width', 'height', 'compress', 'quality', 'screenPercentage'},
        }
        
        if operation not in supported_operations:
            return {
                'success': False,
                'error': f"Unsupported batch operation: {operation}"
            }
        
        module_name, class_name, method_name = supported_operations[operation]
        
        # Import and execute operation using the existing error handling framework
        if operation.startswith('actor_'):
            from ops.actor import ActorOperations
            actor_ops = ActorOperations()
            method = getattr(actor_ops, method_name, None)
        elif operation.startswith('viewport_'):
            from ops.viewport import ViewportOperations
            viewport_ops = ViewportOperations()
            method = getattr(viewport_ops, method_name, None)
        else:
            return {
                'success': False,
                'error': f"Unknown operation category for: {operation}"
            }
        
        if not method:
            return {
                'success': False,
                'error': f"Method {method_name} not found for operation {operation}"
            }
        
        # Execute the method with upfront parameter validation
        # The framework ensures we always get back a dict with success/error status
        
        # Validate params is a dictionary and safe to unpack
        if not isinstance(params, dict):
            return {
                'success': False,
                'error': f"Invalid params type for {operation}: expected dict, got {type(params).__name__}"
            }
        
        # Validate parameter names to prevent parameter injection
        # Use explicit allowlist approach - reject ANY unexpected parameters
        if operation not in expected_params:
            return {
                'success': False,
                'error': f"Unknown operation '{operation}' - parameter validation not defined"
            }
        
        # Strict parameter validation - only allow explicitly expected parameters
        allowed_params = expected_params[operation]
        provided_params = set(params.keys())
        invalid_params = provided_params - allowed_params
        
        if invalid_params:
            return {
                'success': False,
                'error': f"Invalid parameters for {operation}: {', '.join(sorted(invalid_params))}. Allowed: {', '.join(sorted(allowed_params))}"
            }
        
        # Basic type validation for common parameters
        validation_errors = []
        
        # Validate common parameter types across operations
        if 'actorName' in params and params['actorName'] is not None:
            if not isinstance(params['actorName'], str) or not params['actorName'].strip():
                validation_errors.append("'actorName' must be a non-empty string")
        
        if 'assetPath' in params and params['assetPath'] is not None:
            if not isinstance(params['assetPath'], str) or not params['assetPath'].strip():
                validation_errors.append("'assetPath' must be a non-empty string")
        
        if 'location' in params and params['location'] is not None:
            if not isinstance(params['location'], list) or len(params['location']) != 3:
                validation_errors.append("'location' must be a list of 3 numbers [X, Y, Z]")
            elif not all(isinstance(x, (int, float)) for x in params['location']):
                validation_errors.append("'location' values must be numbers")
        
        if 'rotation' in params and params['rotation'] is not None:
            if not isinstance(params['rotation'], list) or len(params['rotation']) != 3:
                validation_errors.append("'rotation' must be a list of 3 numbers [Roll, Pitch, Yaw]")
            elif not all(isinstance(x, (int, float)) for x in params['rotation']):
                validation_errors.append("'rotation' values must be numbers")
        
        if 'validate' in params and params['validate'] is not None:
            if not isinstance(params['validate'], bool):
                validation_errors.append("'validate' must be a boolean")
        
        if validation_errors:
            return {
                'success': False,
                'error': f"Parameter validation failed for {operation}: {'; '.join(validation_errors)}"
            }
        
        # Execute the method - let the method's own validation handle parameter specifics
        # The underlying method will handle its own parameter validation and return proper error dict
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
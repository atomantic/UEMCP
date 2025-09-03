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
            try:
                op_id = op.get('id', f'op_{i}')
                operation_name = op.get('operation')
                params = op.get('params', {})
                
                log_debug(f"Executing operation {op_id}: {operation_name}")
                
                # Execute the operation
                op_result = self._execute_single_operation(operation_name, params)
                
                # Track operation for memory management
                track_operation()
                
                # Track result
                operation_result = {
                    'id': op_id,
                    'operation': operation_name,
                    'success': op_result.get('success', False),
                    'result': op_result
                }
                
                if operation_result['success']:
                    results['successCount'] += 1
                else:
                    results['failureCount'] += 1
                    results['success'] = False  # Mark batch as failed if any operation fails
                
                results['operations'].append(operation_result)
                
            except Exception as e:
                log_error(f"Error executing operation {i}: {e}")
                results['operations'].append({
                    'id': op.get('id', f'op_{i}'),
                    'operation': op.get('operation', 'unknown'),
                    'success': False,
                    'error': str(e)
                })
                results['failureCount'] += 1
                results['success'] = False
        
        results['executionTime'] = time.time() - self.start_time
        log_debug(f"Batch execution completed in {results['executionTime']:.2f}s")
        
        return results
    
    def _execute_single_operation(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single operation within the batch.
        
        Args:
            operation: Operation name
            params: Operation parameters
        
        Returns:
            Operation result dictionary
        """
        # Import operation modules dynamically to avoid circular imports
        if operation == 'actor_spawn':
            from ops.actor import ActorOperations
            actor_ops = ActorOperations()
            return actor_ops.spawn_actor(**params)
        
        elif operation == 'actor_modify':
            from ops.actor import ActorOperations
            actor_ops = ActorOperations()
            return actor_ops.modify_actor(**params)
        
        elif operation == 'actor_delete':
            from ops.actor import ActorOperations
            actor_ops = ActorOperations()
            return actor_ops.delete_actor(**params)
        
        elif operation == 'actor_duplicate':
            from ops.actor import ActorOperations
            actor_ops = ActorOperations()
            return actor_ops.duplicate_actor(**params)
        
        elif operation == 'viewport_camera':
            from ops.viewport import ViewportOperations
            viewport_ops = ViewportOperations()
            return viewport_ops.set_camera(**params)
        
        elif operation == 'viewport_screenshot':
            from ops.viewport import ViewportOperations
            viewport_ops = ViewportOperations()
            return viewport_ops.take_screenshot(**params)
        
        else:
            raise ValueError(f"Unsupported batch operation: {operation}")


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
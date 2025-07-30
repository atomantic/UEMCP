"""
UEMCP Migration Script - Helps transition from monolithic to modular listener
"""

import os
import shutil
import unreal
from datetime import datetime


def backup_old_listener():
    """Create a backup of the old listener before migration."""
    try:
        old_path = os.path.join(os.path.dirname(__file__), 'uemcp_listener.py')
        if os.path.exists(old_path):
            backup_path = old_path.replace('.py', f'_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.py')
            shutil.copy2(old_path, backup_path)
            unreal.log(f"UEMCP: Created backup at {backup_path}")
            return True
    except Exception as e:
        unreal.log_error(f"UEMCP: Failed to backup old listener: {str(e)}")
        return False


def switch_to_modular():
    """Switch from old listener to modular listener."""
    try:
        # First create backup
        if not backup_old_listener():
            unreal.log_warning("UEMCP: Proceeding without backup")
        
        # Copy modular listener to main listener file
        modular_path = os.path.join(os.path.dirname(__file__), 'uemcp_listener_modular.py')
        main_path = os.path.join(os.path.dirname(__file__), 'uemcp_listener.py')
        
        if os.path.exists(modular_path):
            shutil.copy2(modular_path, main_path)
            unreal.log("UEMCP: Successfully switched to modular listener")
            
            # Update helpers to use new listener
            update_helpers()
            
            return True
        else:
            unreal.log_error("UEMCP: Modular listener not found")
            return False
            
    except Exception as e:
        unreal.log_error(f"UEMCP: Failed to switch to modular: {str(e)}")
        return False


def update_helpers():
    """Update helper functions to work with modular system."""
    try:
        helpers_path = os.path.join(os.path.dirname(__file__), 'uemcp_helpers.py')
        if os.path.exists(helpers_path):
            # Read current helpers
            with open(helpers_path, 'r') as f:
                content = f.read()
            
            # Check if already updated
            if 'Modular listener' in content:
                unreal.log("UEMCP: Helpers already updated for modular system")
                return
            
            # Update the import statement
            content = content.replace(
                'import uemcp_listener',
                '# Using modular listener system\nimport uemcp_listener'
            )
            
            # Write back
            with open(helpers_path, 'w') as f:
                f.write(content)
            
            unreal.log("UEMCP: Updated helpers for modular system")
            
    except Exception as e:
        unreal.log_error(f"UEMCP: Failed to update helpers: {str(e)}")


def test_modular_system():
    """Test that the modular system is working correctly."""
    try:
        # Test importing all modules
        unreal.log("UEMCP: Testing module imports...")
        
        modules_to_test = [
            'uemcp_utils',
            'uemcp_validation', 
            'uemcp_actor_ops',
            'uemcp_viewport_ops',
            'uemcp_asset_ops',
            'uemcp_level_ops',
            'uemcp_command_registry',
            'uemcp_system_ops'
        ]
        
        failed_imports = []
        for module in modules_to_test:
            try:
                __import__(module)
                unreal.log(f"  ✓ {module}")
            except ImportError as e:
                failed_imports.append((module, str(e)))
                unreal.log_error(f"  ✗ {module}: {str(e)}")
        
        if failed_imports:
            unreal.log_error(f"UEMCP: {len(failed_imports)} modules failed to import")
            return False
        
        # Test command registry
        unreal.log("UEMCP: Testing command registry...")
        from uemcp_command_registry import get_registry, register_all_operations
        
        registry = get_registry()
        register_all_operations()
        
        commands = registry.list_commands()
        unreal.log(f"UEMCP: Successfully registered {len(commands)} commands")
        
        # Show categories
        categories = registry.get_commands_by_category()
        for category, cmds in categories.items():
            unreal.log(f"  {category}: {len(cmds)} commands")
        
        return True
        
    except Exception as e:
        unreal.log_error(f"UEMCP: Modular system test failed: {str(e)}")
        return False


def migrate():
    """Main migration function."""
    unreal.log("=" * 60)
    unreal.log("UEMCP: Starting migration to modular architecture")
    unreal.log("=" * 60)
    
    # Test modular system first
    if not test_modular_system():
        unreal.log_error("UEMCP: Modular system test failed. Migration aborted.")
        return False
    
    # Switch to modular listener
    if switch_to_modular():
        unreal.log("UEMCP: Migration completed successfully!")
        unreal.log("UEMCP: Please restart the listener to use the new modular system")
        unreal.log("  Run: restart_listener()")
        return True
    else:
        unreal.log_error("UEMCP: Migration failed")
        return False


def rollback():
    """Rollback to the previous listener version."""
    try:
        # Find most recent backup
        import glob
        backups = glob.glob(os.path.join(os.path.dirname(__file__), 'uemcp_listener_backup_*.py'))
        
        if not backups:
            unreal.log_error("UEMCP: No backups found to rollback to")
            return False
        
        # Sort by timestamp (newest first)
        backups.sort(reverse=True)
        latest_backup = backups[0]
        
        # Restore from backup
        main_path = os.path.join(os.path.dirname(__file__), 'uemcp_listener.py')
        shutil.copy2(latest_backup, main_path)
        
        unreal.log(f"UEMCP: Rolled back to {os.path.basename(latest_backup)}")
        unreal.log("UEMCP: Please restart the listener")
        return True
        
    except Exception as e:
        unreal.log_error(f"UEMCP: Rollback failed: {str(e)}")
        return False


# Module-level functions for easy access
def migrate_to_modular():
    """User-friendly function to migrate to modular system."""
    return migrate()


def rollback_migration():
    """User-friendly function to rollback migration."""
    return rollback()


def test_modular():
    """User-friendly function to test modular system."""
    return test_modular_system()


if __name__ == "__main__":
    # If run directly, perform migration
    migrate()
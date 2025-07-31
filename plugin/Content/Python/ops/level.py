"""
UEMCP Level Operations - All level and project-related operations
"""

import unreal
from utils import get_project_info, get_all_actors, log_debug, log_error


class LevelOperations:
    """Handles all level and project-related operations."""
    
    def save_level(self):
        """Save the current level.
        
        Returns:
            dict: Result with success status
        """
        try:
            success = unreal.EditorLevelLibrary.save_current_level()
            
            return {
                'success': success,
                'message': 'Level saved successfully' if success else 'Failed to save level'
            }
            
        except Exception as e:
            log_error(f"Failed to save level: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_project_info(self):
        """Get information about the current project.
        
        Returns:
            dict: Project information
        """
        try:
            info = get_project_info()
            return {'success': True, **info}
            
        except Exception as e:
            log_error(f"Failed to get project info: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_level_actors(self, filter=None, limit=30):
        """Get all actors in the current level.
        
        Args:
            filter: Optional text to filter actors
            limit: Maximum number of actors to return
            
        Returns:
            dict: List of actors with properties
        """
        try:
            actors = get_all_actors(filter_text=filter, limit=limit)
            
            # Count total actors
            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            all_actors = editor_actor_subsystem.get_all_level_actors()
            
            if filter:
                # Count filtered actors
                filter_lower = filter.lower()
                total_count = sum(1 for actor in all_actors 
                                if actor and hasattr(actor, 'get_actor_label') and
                                (filter_lower in actor.get_actor_label().lower() or 
                                 filter_lower in actor.get_class().get_name().lower()))
            else:
                total_count = len([a for a in all_actors if a and hasattr(a, 'get_actor_label')])
            
            return {
                'success': True,
                'actors': actors,
                'totalCount': total_count,
                'currentLevel': unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_name()
            }
            
        except Exception as e:
            log_error(f"Failed to get level actors: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_outliner_structure(self, showEmpty=False, maxDepth=10):
        """Get the World Outliner folder structure.
        
        Args:
            showEmpty: Whether to show empty folders
            maxDepth: Maximum folder depth to display
            
        Returns:
            dict: Outliner structure
        """
        try:
            # Get all actors
            editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            all_actors = editor_actor_subsystem.get_all_level_actors()
            
            # Build folder structure
            folder_structure = {}
            unorganized_actors = []
            organized_count = 0
            
            for actor in all_actors:
                if actor is None or not hasattr(actor, 'get_actor_label'):
                    continue
                    
                actor_label = actor.get_actor_label()
                folder_path = actor.get_folder_path()
                
                if folder_path:
                    organized_count += 1
                    # Convert to string if it's a Name object
                    folder_path_str = str(folder_path)
                    # Split folder path and build nested structure
                    parts = folder_path_str.split('/')
                    current = folder_structure
                    
                    for i, part in enumerate(parts):
                        if i >= maxDepth:
                            break
                            
                        if part not in current:
                            current[part] = {
                                'actors': [],
                                'subfolders': {}
                            }
                        
                        # If this is the last part, add the actor
                        if i == len(parts) - 1:
                            current[part]['actors'].append(actor_label)
                        
                        # Move to subfolder for next iteration
                        current = current[part]['subfolders']
                else:
                    unorganized_actors.append(actor_label)
            
            # Sort actors in each folder
            def sort_folder_actors(folder_dict):
                for folder_name, folder_data in folder_dict.items():
                    if 'actors' in folder_data:
                        folder_data['actors'].sort()
                    if 'subfolders' in folder_data:
                        sort_folder_actors(folder_data['subfolders'])
            
            sort_folder_actors(folder_structure)
            unorganized_actors.sort()
            
            # Remove empty folders if requested
            if not showEmpty:
                def remove_empty_folders(folder_dict):
                    to_remove = []
                    for folder_name, folder_data in folder_dict.items():
                        # Recursively clean subfolders
                        if 'subfolders' in folder_data:
                            remove_empty_folders(folder_data['subfolders'])
                        
                        # Check if this folder is empty
                        has_actors = 'actors' in folder_data and len(folder_data['actors']) > 0
                        has_subfolders = 'subfolders' in folder_data and len(folder_data['subfolders']) > 0
                        
                        if not has_actors and not has_subfolders:
                            to_remove.append(folder_name)
                    
                    # Remove empty folders
                    for folder_name in to_remove:
                        del folder_dict[folder_name]
                
                remove_empty_folders(folder_structure)
            
            # Count total folders
            def count_folders(folder_dict):
                count = len(folder_dict)
                for folder_data in folder_dict.values():
                    if 'subfolders' in folder_data:
                        count += count_folders(folder_data['subfolders'])
                return count
            
            total_folders = count_folders(folder_structure)
            
            return {
                'success': True,
                'outliner': {
                    'folders': folder_structure,
                    'unorganized': unorganized_actors,
                    'stats': {
                        'totalActors': len(all_actors),
                        'organizedActors': organized_count,
                        'unorganizedActors': len(unorganized_actors),
                        'totalFolders': total_folders
                    }
                }
            }
            
        except Exception as e:
            log_error(f"Failed to get outliner structure: {str(e)}")
            return {'success': False, 'error': str(e)}
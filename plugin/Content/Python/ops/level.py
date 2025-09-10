"""
UEMCP Level Operations - All level and project-related operations
"""

import unreal

from utils import get_all_actors, get_project_info

# Enhanced error handling framework
from utils.error_handling import ProcessingError, TypeRule, handle_unreal_errors, safe_operation, validate_inputs


class LevelOperations:
    """Handles all level and project-related operations."""

    @handle_unreal_errors("save_level")
    @safe_operation("level")
    def save_level(self):
        """Save the current level.

        Returns:
            dict: Result with success status

        Raises:
            ProcessingError: If level save operation fails
        """
        success = unreal.EditorLevelLibrary.save_current_level()
        if not success:
            raise ProcessingError("Failed to save level")
        return {"message": "Level saved successfully"}

    @handle_unreal_errors("get_project_info")
    @safe_operation("level")
    def get_project_info(self):
        """Get information about the current project.

        Returns:
            dict: Project information
        """
        info = get_project_info()
        return info

    @validate_inputs({"filter": [TypeRule(str, allow_none=True)], "limit": [TypeRule(int)]})
    @handle_unreal_errors("get_level_actors")
    @safe_operation("level")
    def get_level_actors(self, filter=None, limit=30):
        """Get all actors in the current level.

        Args:
            filter: Optional text to filter actors
            limit: Maximum number of actors to return

        Returns:
            dict: List of actors with properties
        """
        actors = get_all_actors(filter_text=filter, limit=limit)

        # Count total actors
        editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        all_actors = editor_actor_subsystem.get_all_level_actors()

        if filter:
            # Count filtered actors
            filter_lower = filter.lower()
            total_count = sum(
                1
                for actor in all_actors
                if actor
                and hasattr(actor, "get_actor_label")
                and (
                    filter_lower in actor.get_actor_label().lower()
                    or filter_lower in actor.get_class().get_name().lower()
                )
            )
        else:
            total_count = len([a for a in all_actors if a and hasattr(a, "get_actor_label")])

        return {
            "actors": actors,
            "totalCount": total_count,
            "currentLevel": unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_name(),
        }

    @validate_inputs({"showEmpty": [TypeRule(bool)], "maxDepth": [TypeRule(int)]})
    @handle_unreal_errors("get_outliner_structure")
    @safe_operation("level")
    def get_outliner_structure(self, showEmpty=False, maxDepth=10):
        """Get the World Outliner folder structure.

        Args:
            showEmpty: Whether to show empty folders
            maxDepth: Maximum folder depth to display

        Returns:
            dict: Outliner structure
        """
        # Get all actors
        editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        all_actors = editor_actor_subsystem.get_all_level_actors()

        # Build folder structure
        folder_structure, unorganized_actors, organized_count = self._build_folder_structure(all_actors, maxDepth)

        # Sort all actors
        self._sort_folder_actors(folder_structure)
        unorganized_actors.sort()

        # Remove empty folders if requested
        if not showEmpty:
            self._remove_empty_folders(folder_structure)

        # Count total folders
        total_folders = self._count_folders(folder_structure)

        return {
            "outliner": {
                "folders": folder_structure,
                "unorganized": unorganized_actors,
                "stats": {
                    "totalActors": len(all_actors),
                    "organizedActors": organized_count,
                    "unorganizedActors": len(unorganized_actors),
                    "totalFolders": total_folders,
                },
            },
        }

    def _build_folder_structure(self, all_actors, maxDepth):
        """Build the folder structure from actors.

        Args:
            all_actors: List of all actors
            maxDepth: Maximum folder depth

        Returns:
            tuple: (folder_structure, unorganized_actors, organized_count)
        """
        folder_structure = {}
        unorganized_actors = []
        organized_count = 0

        for actor in all_actors:
            if not self._is_valid_actor(actor):
                continue

            actor_label = actor.get_actor_label()
            folder_path = actor.get_folder_path()

            if folder_path:
                organized_count += 1
                self._add_actor_to_folder_structure(folder_structure, actor_label, str(folder_path), maxDepth)
            else:
                unorganized_actors.append(actor_label)

        return folder_structure, unorganized_actors, organized_count

    def _is_valid_actor(self, actor):
        """Check if actor is valid for processing.

        Args:
            actor: Actor to check

        Returns:
            bool: True if valid
        """
        return actor is not None and hasattr(actor, "get_actor_label")

    def _add_actor_to_folder_structure(self, folder_structure, actor_label, folder_path_str, maxDepth):
        """Add an actor to the folder structure.

        Args:
            folder_structure: The folder structure dictionary
            actor_label: Label of the actor
            folder_path_str: Folder path as string
            maxDepth: Maximum folder depth
        """
        parts = folder_path_str.split("/")
        current = folder_structure

        for i, part in enumerate(parts):
            if i >= maxDepth:
                break

            if part not in current:
                current[part] = {"actors": [], "subfolders": {}}

            # If this is the last part, add the actor
            if i == len(parts) - 1:
                current[part]["actors"].append(actor_label)

            # Move to subfolder for next iteration
            current = current[part]["subfolders"]

    def _sort_folder_actors(self, folder_dict):
        """Recursively sort actors in all folders.

        Args:
            folder_dict: Folder dictionary to sort
        """
        for _folder_name, folder_data in folder_dict.items():
            if "actors" in folder_data:
                folder_data["actors"].sort()
            if "subfolders" in folder_data:
                self._sort_folder_actors(folder_data["subfolders"])

    def _remove_empty_folders(self, folder_dict):
        """Recursively remove empty folders.

        Args:
            folder_dict: Folder dictionary to clean
        """
        to_remove = []

        for folder_name, folder_data in folder_dict.items():
            # Recursively clean subfolders
            if "subfolders" in folder_data:
                self._remove_empty_folders(folder_data["subfolders"])

            # Check if this folder is empty
            if self._is_folder_empty(folder_data):
                to_remove.append(folder_name)

        # Remove empty folders
        for folder_name in to_remove:
            del folder_dict[folder_name]

    def _is_folder_empty(self, folder_data):
        """Check if a folder is empty.

        Args:
            folder_data: Folder data dictionary

        Returns:
            bool: True if folder is empty
        """
        has_actors = "actors" in folder_data and len(folder_data["actors"]) > 0
        has_subfolders = "subfolders" in folder_data and len(folder_data["subfolders"]) > 0
        return not has_actors and not has_subfolders

    def _count_folders(self, folder_dict):
        """Recursively count total folders.

        Args:
            folder_dict: Folder dictionary to count

        Returns:
            int: Total folder count
        """
        count = len(folder_dict)
        for folder_data in folder_dict.values():
            if "subfolders" in folder_data:
                count += self._count_folders(folder_data["subfolders"])
        return count

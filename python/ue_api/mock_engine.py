"""Mock implementation of Unreal Engine Python API for testing."""
import os
import re
from dataclasses import dataclass
from typing import List, Optional, Dict, Any


@dataclass
class Project:
    """Represents an Unreal Engine project."""
    name: str
    path: str
    template: str
    engine_version: str
    project_file: str


class MockUnrealEngine:
    """Mock implementation of Unreal Engine for testing without actual UE installation."""
    
    def __init__(self) -> None:
        self._projects: Dict[str, Project] = {}
        self.current_project: Optional[Project] = None
        self._mock_delay = 0.1  # Simulate operation delays
    
    def create_project(
        self,
        name: str,
        path: str,
        template: str = "Blank",
        engine_version: str = "5.3"
    ) -> Project:
        """Create a new Unreal Engine project.
        
        Args:
            name: Project name
            path: Directory path for the project
            template: Project template (Blank, FirstPerson, ThirdPerson, VR, TopDown)
            engine_version: Unreal Engine version
            
        Returns:
            Created project instance
            
        Raises:
            ValueError: If project name is invalid
        """
        # Validate project name
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', name):
            raise ValueError(
                "Project name must start with a letter and contain only "
                "letters, numbers, and underscores"
            )
        
        # Create project structure
        project_path = os.path.join(path, name)
        project_file = os.path.join(project_path, f"{name}.uproject")
        
        project = Project(
            name=name,
            path=project_path,
            template=template,
            engine_version=engine_version,
            project_file=project_file
        )
        
        # Store project
        self._projects[project_file] = project
        
        return project
    
    def open_project(self, project_file: str) -> Project:
        """Open an existing project.
        
        Args:
            project_file: Path to .uproject file
            
        Returns:
            Opened project instance
            
        Raises:
            FileNotFoundError: If project file doesn't exist
        """
        if project_file not in self._projects:
            raise FileNotFoundError(f"Project not found: {project_file}")
        
        project = self._projects[project_file]
        self.current_project = project
        return project
    
    def list_projects(self) -> List[Project]:
        """List all known projects.
        
        Returns:
            List of project instances
        """
        return list(self._projects.values())
    
    def get_current_project(self) -> Optional[Project]:
        """Get the currently open project.
        
        Returns:
            Current project or None if no project is open
        """
        return self.current_project
    
    def reset(self) -> None:
        """Reset the mock engine state."""
        self._projects.clear()
        self.current_project = None
"""Tests for the mock Unreal Engine interface."""
import pytest
from unittest.mock import MagicMock, patch
from python.ue_api.mock_engine import MockUnrealEngine, Project


class TestMockUnrealEngine:
    """Test suite for MockUnrealEngine."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = MockUnrealEngine()

    def teardown_method(self):
        """Clean up after tests."""
        self.engine.reset()

    def test_create_project_success(self):
        """Test successful project creation."""
        project = self.engine.create_project(
            name="TestProject",
            path="/tmp/projects",
            template="Blank",
            engine_version="5.3"
        )
        
        assert project.name == "TestProject"
        assert project.path == "/tmp/projects/TestProject"
        assert project.template == "Blank"
        assert project.engine_version == "5.3"
        assert project.project_file == "/tmp/projects/TestProject/TestProject.uproject"

    def test_create_project_invalid_name(self):
        """Test project creation with invalid name."""
        with pytest.raises(ValueError, match="Project name must start with a letter"):
            self.engine.create_project(
                name="123Invalid",
                path="/tmp/projects"
            )

    def test_create_project_special_chars(self):
        """Test project creation with special characters."""
        with pytest.raises(ValueError, match="Project name must start with a letter"):
            self.engine.create_project(
                name="Project-Name",
                path="/tmp/projects"
            )

    def test_open_project_success(self):
        """Test opening an existing project."""
        # First create a project
        project = self.engine.create_project(
            name="OpenTest",
            path="/tmp/projects"
        )
        
        # Then open it
        opened = self.engine.open_project(project.project_file)
        assert opened.name == "OpenTest"
        assert self.engine.current_project == opened

    def test_open_project_not_found(self):
        """Test opening a non-existent project."""
        with pytest.raises(FileNotFoundError):
            self.engine.open_project("/nonexistent/project.uproject")

    def test_list_projects(self):
        """Test listing all projects."""
        # Create multiple projects
        proj1 = self.engine.create_project(name="Project1", path="/tmp")
        proj2 = self.engine.create_project(name="Project2", path="/tmp")
        
        projects = self.engine.list_projects()
        assert len(projects) == 2
        assert proj1 in projects
        assert proj2 in projects

    def test_get_current_project(self):
        """Test getting current project."""
        assert self.engine.get_current_project() is None
        
        project = self.engine.create_project(name="Current", path="/tmp")
        self.engine.open_project(project.project_file)
        
        assert self.engine.get_current_project() == project

    def test_reset(self):
        """Test resetting the engine state."""
        # Create and open a project
        project = self.engine.create_project(name="ResetTest", path="/tmp")
        self.engine.open_project(project.project_file)
        
        # Reset
        self.engine.reset()
        
        # Verify state is cleared
        assert len(self.engine.list_projects()) == 0
        assert self.engine.get_current_project() is None
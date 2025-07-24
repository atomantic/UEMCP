# UEMCP - Unreal Engine Model Context Protocol Server

![Unreal Engine](https://img.shields.io/badge/Unreal%20Engine-5.x-blue?logo=unrealengine)
![MCP](https://img.shields.io/badge/MCP-Compatible-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python)
![C++](https://img.shields.io/badge/C++-17+-blue?logo=cplusplus)

A Model Context Protocol (MCP) server that provides AI models with deep integration capabilities for Unreal Engine projects. UEMCP bridges the gap between AI-powered development tools and Unreal Engine's complex ecosystem, enabling intelligent assistance for game development workflows.

## Features

### 🎮 Core Engine Integration
- **Project Management**: Create, load, and configure UE projects
- **Asset Pipeline**: Import, export, and manipulate game assets
- **Blueprint System**: Read and modify Blueprint graphs programmatically
- **Level Editing**: Automated level construction and actor placement
- **Build System**: Trigger builds, packaging, and deployment

### 🛠️ Development Tools
- **Code Generation**: Generate C++ classes, Blueprint nodes, and interfaces
- **Refactoring**: Intelligent code restructuring with UE conventions
- **Testing**: Automated test creation and execution
- **Documentation**: Generate and maintain project documentation

### 🔌 AI Model Support
- **Claude**: Full integration with Anthropic's Claude models
- **Gemini**: Google's Gemini model support
- **Cursor**: Enhanced IDE integration
- **Extensible**: Plugin architecture for additional AI models

## Architecture

```
UEMCP/
├── server/           # MCP server implementation
│   ├── tools/        # UE-specific MCP tools
│   ├── resources/    # Project resources and templates
│   └── handlers/     # Request handlers
├── plugin/           # Unreal Engine plugin (C++)
│   ├── Source/       # C++ source code
│   ├── Content/      # Plugin assets
│   └── Config/       # Plugin configuration
├── python/           # Python utilities and bindings
│   ├── ue_api/       # Unreal Python API wrappers
│   ├── tools/        # Development tools
│   └── examples/     # Usage examples
└── docs/            # Documentation
```

## Installation

### Prerequisites
- Unreal Engine 5.1+
- Python 3.8+
- Node.js 18+ (for MCP server)
- Git

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/atomantic/UEMCP.git
   cd UEMCP
   ```

2. **Install dependencies**:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. **Configure your UE project**:
   ```bash
   python scripts/setup.py --project-path /path/to/your/ue/project
   ```

4. **Start the MCP server**:
   ```bash
   npm start
   ```

5. **Configure your AI client** (Claude, Cursor, etc.) to connect to the MCP server.

## Configuration

### MCP Server Configuration
```json
{
  "server": {
    "name": "uemcp",
    "version": "1.0.0"
  },
  "unreal": {
    "engine_path": "/path/to/UnrealEngine",
    "project_path": "/path/to/your/project.uproject",
    "python_enabled": true,
    "auto_build": false
  },
  "tools": {
    "blueprint_editing": true,
    "asset_management": true,
    "level_editing": true,
    "code_generation": true
  }
}
```

### AI Client Setup

#### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "uemcp": {
      "command": "node",
      "args": ["/path/to/UEMCP/server/index.js"],
      "env": {
        "UE_PROJECT_PATH": "/path/to/your/project.uproject"
      }
    }
  }
}
```

#### Cursor
Configure in your workspace settings:
```json
{
  "mcp.servers": [
    {
      "name": "uemcp",
      "command": ["node", "/path/to/UEMCP/server/index.js"]
    }
  ]
}
```

## Available Tools

### Asset Management
- `ue_import_asset` - Import external assets into the project
- `ue_export_asset` - Export assets from the project
- `ue_create_material` - Generate new materials
- `ue_modify_texture` - Edit texture properties

### Blueprint System
- `ue_create_blueprint` - Generate new Blueprint classes
- `ue_modify_blueprint` - Edit existing Blueprint graphs
- `ue_blueprint_compile` - Compile and validate Blueprints
- `ue_blueprint_analyze` - Analyze Blueprint complexity and dependencies

### Level Editing
- `ue_create_level` - Generate new levels
- `ue_place_actor` - Add actors to levels
- `ue_modify_landscape` - Edit terrain and landscapes
- `ue_lighting_build` - Build lighting for levels

### Code Generation
- `ue_create_cpp_class` - Generate C++ classes with UE boilerplate
- `ue_create_interface` - Create UE interfaces
- `ue_generate_bindings` - Create Python/Blueprint bindings
- `ue_refactor_code` - Intelligent code refactoring

### Project Management
- `ue_project_info` - Get comprehensive project information
- `ue_build_project` - Build the project
- `ue_package_project` - Package for distribution
- `ue_run_tests` - Execute automated tests

## Usage Examples

### Creating a New Actor Class
```python
# AI can use this tool through MCP
{
  "tool": "ue_create_cpp_class",
  "arguments": {
    "class_name": "MyCustomActor",
    "parent_class": "AActor",
    "components": ["UStaticMeshComponent", "UBoxComponent"],
    "functions": ["BeginPlay", "Tick"],
    "properties": ["Health:float", "MaxHealth:float"]
  }
}
```

### Blueprint Generation
```python
{
  "tool": "ue_create_blueprint",
  "arguments": {
    "blueprint_name": "BP_PlayerCharacter",
    "parent_class": "ACharacter",
    "components": ["Camera", "SpringArm"],
    "events": ["BeginPlay", "InputAction_Jump"]
  }
}
```

### Asset Import Pipeline
```python
{
  "tool": "ue_import_asset",
  "arguments": {
    "file_path": "/path/to/model.fbx",
    "destination": "/Game/Characters/",
    "import_options": {
      "import_materials": true,
      "import_textures": true,
      "skeletal_mesh": true
    }
  }
}
```

## Development

### Building from Source
```bash
# Install development dependencies
npm install --dev
pip install -r requirements-dev.txt

# Build the UE plugin
python scripts/build_plugin.py

# Run tests
npm test
python -m pytest tests/
```

### Plugin Development
The C++ plugin provides the core UE integration. Key components:

- **UEMCPSubsystem**: Main subsystem for MCP communication
- **UEMCPBlueprintLibrary**: Blueprint-accessible functions
- **UEMCPCommandlet**: Command-line tools for automation
- **UEMCPSettings**: Configuration management

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Supported Unreal Engine Versions

| UE Version | Status | Notes |
|------------|---------|-------|
| 5.4+ | ✅ Full Support | Recommended |
| 5.3 | ✅ Full Support | Stable |
| 5.2 | ⚠️ Limited Support | Some features unavailable |
| 5.1 | ⚠️ Limited Support | Basic functionality only |
| 5.0 | ❌ Not Supported | - |

## Roadmap

### Phase 1 - Core Foundation ✅
- [x] Basic MCP server implementation
- [x] UE Python API integration
- [x] Essential tools (project, asset, blueprint)
- [x] AI model compatibility

### Phase 2 - Advanced Features 🚧
- [ ] Visual scripting assistance
- [ ] Performance profiling integration
- [ ] Automated testing framework
- [ ] Asset optimization tools

### Phase 3 - Ecosystem Integration 📋
- [ ] Version control integration
- [ ] CI/CD pipeline support
- [ ] Marketplace integration
- [ ] Team collaboration features

## Troubleshooting

### Common Issues

**MCP Server Won't Start**
- Verify Node.js version (18+)
- Check that UE project path is correct
- Ensure Python is available in PATH

**Python API Not Working**
- Enable Python plugins in UE Editor
- Verify Python paths in project settings
- Check UE Python console for errors

**Tool Execution Fails**
- Ensure UE Editor is running
- Check MCP server logs
- Verify tool permissions

### Debug Mode
Enable verbose logging:
```bash
DEBUG=uemcp:* npm start
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Unreal Engine](https://www.unrealengine.com/) by Epic Games
- The open-source game development community

## Support

- 📖 [Documentation](https://github.com/atomantic/UEMCP/wiki)
- 🐛 [Issues](https://github.com/atomantic/UEMCP/issues)
- 💬 [Discussions](https://github.com/atomantic/UEMCP/discussions)
- 📧 Contact: [Your Email]

---

*Built with ❤️ for the Unreal Engine and AI development communities*
# Project Directory

This directory is for **project-specific scripts and assets** that are not part of the core UEMCP plugin.

## Purpose

While UEMCP provides the MCP tools and infrastructure for controlling Unreal Engine, actual game/project development scripts should be kept separate. This directory serves as a workspace for:

- Building scripts (houses, mazes, environments)
- Asset analysis and exploration scripts
- Project-specific automation
- Custom workflows for your UE project

## What Goes Here

✅ **Project-specific scripts:**
- House building scripts
- Maze generation scripts
- Level design automation
- Asset placement workflows
- Custom analysis tools

❌ **What DOESN'T go here:**
- Core UEMCP plugin code
- MCP tool implementations
- Generic utilities that could benefit all UEMCP users

## Git Strategy

This directory is intentionally **excluded from version control** (except this README). This allows you to:

1. Keep project-specific code private
2. Avoid cluttering the UEMCP repository with project files
3. Maintain your own version control for project scripts if desired

## Organization Suggestions

```
project/
├── README.md          (this file - tracked in git)
├── .gitignore         (tracks only README.md)
├── house_building/    (your house construction scripts)
├── maze_generation/   (maze loading and generation)
├── level_design/      (other level design automation)
├── analysis/          (asset analysis, exploration scripts)
└── workflows/         (complex multi-step automations)
```

## Example Scripts

Some scripts that have been moved here from the main scripts directory:

### House Building
- `build_second_floor.py` - Automated second floor construction
- `place_second_floor.py` - Second floor placement logic
- `house_building_plan.md` - Documentation for house building

### Maze Generation
- `load_maze_from_tsv.py` - Load maze layouts from TSV files
- `load_maze_ue_python.py` - Direct UE Python version
- `example_maze_layout.tsv` - Example maze data

### Asset Analysis
- `analyze_building_structure.js` - Analyze building patterns
- `explore_old_town_buildings.js` - Explore modular assets
- `query_modular_assets.js` - Query available building pieces

## Working with Project Scripts

Since these scripts are not tracked in git, you should:

1. **Back up important scripts** to your own repository or storage
2. **Document your workflows** so they can be recreated
3. **Consider creating templates** for common operations
4. **Share useful patterns** by contributing them back to UEMCP as proper MCP tools

## Contributing Back

If you create a particularly useful script or workflow, consider:

1. Converting it to a proper MCP tool
2. Adding it to the UEMCP documentation
3. Submitting a pull request to share with the community

Remember: The best project-specific scripts often reveal opportunities for new MCP tools!
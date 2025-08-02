# Release Notes - v0.6.0

## 🚀 Major Improvements

### 🔄 Fixed Server Restart Issues
- Resolved critical deadlock issue that was freezing Unreal Engine during `restart_listener()` calls
- Implemented safer restart mechanism using UE tick callbacks instead of direct threading
- Fixed double-start issue on plugin initialization
- Improved thread management and cleanup

### 🪵 Enhanced Logging System
- Standardized all Python logging with "UEMCP:" prefix for better visibility
- Added comprehensive MCP tool request/completion logging
- Improved error logging with proper exception details
- Better debug output for troubleshooting

### 🛠️ Asset Info Tool Fixes
- Fixed `asset_info` tool crash when `get_static_materials()` doesn't exist (UE 5.6 compatibility)
- Implemented proper API detection with multiple fallback methods
- Enhanced material slot information retrieval

## 🔧 Code Quality Improvements

### Exception Handling
- Replaced all bare `except:` clauses with `except Exception:` to avoid catching system-exiting exceptions
- Fixed both Python and TypeScript exception handling based on code review feedback
- Improved error reporting and recovery

## 📝 Documentation Updates
- Updated PLAN.md to reflect completed fixes
- Removed outdated error references
- Improved documentation of restart procedures

## 🐛 Bug Fixes
- Fixed server restart crashes
- Fixed asset_info AttributeError
- Fixed port cleanup issues
- Fixed module reload problems

## 🔍 Technical Details

### Changed Files
- `uemcp_listener.py`: Fixed deadlock in stop_server(), implemented scheduled restart
- `uemcp_helpers.py`: Updated restart_listener to use safer scheduled restart
- `ops/asset.py`: Fixed material retrieval for UE 5.6 compatibility
- Multiple files: Replaced bare except clauses for better exception handling

## 📦 Compatibility
- Unreal Engine: 5.4+
- Python: 3.11 (matches UE built-in)
- Node.js: 18+

## 🙏 Acknowledgments
Thanks to GitHub Copilot for the code review feedback that led to improved exception handling.
# Asset Import Tool Documentation

## Overview

The `asset_import` tool provides comprehensive asset importing capabilities for the UEMCP project, enabling users to import assets from FAB (Epic's asset marketplace), local files, or other asset sources into their Unreal Engine projects.

## Features

- **Multi-format Support**: Import FBX, OBJ, textures, materials, and blueprints
- **FAB Integration**: Seamless integration with Epic's FAB marketplace assets
- **Batch Import**: Import entire folders of assets at once
- **Configurable Settings**: Control collision generation, LODs, materials, and textures
- **Smart Organization**: Preserve folder hierarchy and organize assets appropriately
- **Comprehensive Reporting**: Detailed import statistics and results
- **Error Handling**: Graceful handling of failed imports with detailed error messages

## Usage

### Basic Import

```typescript
asset_import({
  sourcePath: "/path/to/asset.fbx",
  targetFolder: "/Game/ImportedAssets"
})
```

### Batch Import

```typescript
asset_import({
  sourcePath: "/path/to/asset/folder",
  targetFolder: "/Game/ImportedAssets",
  batchImport: true
})
```

### Advanced Import with Custom Settings

```typescript
asset_import({
  sourcePath: "/path/to/fab/asset",
  targetFolder: "/Game/FAB/Environment",
  assetType: "staticMesh",
  importSettings: {
    generateCollision: true,
    generateLODs: false,
    importMaterials: true,
    importTextures: true,
    overwriteExisting: false,
    preserveHierarchy: true,
    sRGB: true,
    compressionSettings: "TC_Default"
  }
})
```

## Parameters

### Required Parameters

- **sourcePath** (string): Path to source asset file or folder
  - Single file: `/path/to/model.fbx`
  - FAB asset folder: `/Users/username/FAB Library/Asset Name`
  - Local asset folder: `/path/to/assets/folder`

### Optional Parameters

- **targetFolder** (string, default: `/Game/ImportedAssets`): Destination folder in UE project
- **assetType** (string, default: `auto`): Asset type filter
  - `auto`: Auto-detect from file extension
  - `staticMesh`: Import only static meshes
  - `material`: Import only materials
  - `texture`: Import only textures
  - `blueprint`: Import only blueprints
- **batchImport** (boolean, default: `false`): Import entire folder recursively
- **importSettings** (object): Detailed import configuration (see below)

### Import Settings

#### Static Mesh Settings
- **generateCollision** (boolean, default: `true`): Generate collision for static meshes
- **generateLODs** (boolean, default: `false`): Auto-generate LODs for static meshes
- **combineMeshes** (boolean, default: `false`): Combine multiple meshes into single asset
- **autoGenerateLODs** (boolean, default: `false`): Auto-generate LOD levels
- **lodLevels** (number, default: `3`): Number of LOD levels to generate (1-8)

#### Material & Texture Settings
- **importMaterials** (boolean, default: `true`): Import materials with meshes
- **importTextures** (boolean, default: `true`): Import textures with materials
- **createMaterialInstances** (boolean, default: `false`): Create material instances instead of materials
- **sRGB** (boolean, default: `true`): Use sRGB for texture imports
- **compressionSettings** (string, default: `TC_Default`): Texture compression settings
  - `TC_Default`: Default compression
  - `TC_Normalmap`: Normal map compression
  - `TC_Masks`: Mask texture compression
  - `TC_Grayscale`: Grayscale compression

#### General Settings
- **overwriteExisting** (boolean, default: `false`): Overwrite existing assets with same name
- **preserveHierarchy** (boolean, default: `true`): Preserve source folder hierarchy in target

## Return Value

The tool returns a comprehensive `AssetImportResult` object:

```typescript
{
  success: boolean,
  importedAssets: ImportedAssetInfo[],
  failedAssets: ImportedAssetInfo[],
  skippedAssets: ImportedAssetInfo[],
  statistics: {
    totalProcessed: number,
    successCount: number,
    failedCount: number,
    skippedCount: number,
    totalSize?: number
  },
  targetFolder: string,
  processingTime?: number,
  error?: string
}
```

### ImportedAssetInfo Structure

```typescript
{
  originalPath: string,
  targetPath: string,
  assetType: string,
  status: 'success' | 'failed' | 'skipped',
  error?: string,
  size?: number,
  vertexCount?: number,
  materialCount?: number
}
```

## Supported File Formats

### Static Meshes
- `.fbx` - Autodesk FBX (recommended)
- `.obj` - Wavefront OBJ
- `.dae` - COLLADA
- `.3ds` - 3DS Max
- `.ase` - ASCII Scene Export
- `.ply` - Stanford PLY

### Textures
- `.png` - Portable Network Graphics
- `.jpg`, `.jpeg` - JPEG
- `.tga` - Targa
- `.bmp` - Windows Bitmap
- `.tiff` - Tagged Image File Format
- `.exr` - OpenEXR (HDR)
- `.hdr` - Radiance HDR

### Other Assets
- `.uasset` - Unreal Engine assets (blueprints, materials)
- `.mat` - Material files

## Examples

### FAB Asset Import

```typescript
// Import a single FAB asset
asset_import({
  sourcePath: "/Users/username/FAB Library/Medieval Building Pack/house_01.fbx",
  targetFolder: "/Game/FAB/Medieval",
  importSettings: {
    generateCollision: true,
    importMaterials: true,
    importTextures: true,
    preserveHierarchy: true
  }
})
```

### Batch Import from FAB

```typescript
// Import entire FAB asset pack
asset_import({
  sourcePath: "/Users/username/FAB Library/Medieval Building Pack",
  targetFolder: "/Game/FAB/Medieval",
  batchImport: true,
  importSettings: {
    generateCollision: true,
    generateLODs: true,
    lodLevels: 4,
    overwriteExisting: false
  }
})
```

### Texture-Only Import

```typescript
// Import only textures from a folder
asset_import({
  sourcePath: "/path/to/texture/pack",
  targetFolder: "/Game/Textures/Environment",
  assetType: "texture",
  batchImport: true,
  importSettings: {
    sRGB: true,
    compressionSettings: "TC_Default"
  }
})
```

## Best Practices

### Organization
1. **Use descriptive target folders**: `/Game/FAB/Environment`, `/Game/Art/Characters`
2. **Preserve hierarchy**: Enable `preserveHierarchy` for organized imports
3. **Group by source**: Separate FAB assets from custom assets

### Performance
1. **Enable collision generation**: Set `generateCollision: true` for interactive objects
2. **Use LODs wisely**: Enable `generateLODs` for detailed models that need optimization
3. **Batch import large sets**: Use `batchImport: true` for efficiency

### Quality Control
1. **Review before overwriting**: Keep `overwriteExisting: false` initially
2. **Check import results**: Review the returned statistics and failed imports
3. **Validate assets**: Use `asset_info` tool to verify imported asset properties

## Troubleshooting

### Common Issues

1. **"Source path does not exist"**
   - Verify the file/folder path is correct
   - Check file permissions
   - Ensure network drives are accessible

2. **"No compatible files found"**
   - Check supported file formats
   - Verify files aren't corrupted
   - Use `assetType: "auto"` for mixed content

3. **"Asset already exists"**
   - Set `overwriteExisting: true` to replace existing assets
   - Use different target folder names
   - Rename source files before import

4. **Import failures**
   - Check UE logs for detailed error messages
   - Verify asset file integrity
   - Ensure sufficient disk space
   - Check UE project is not read-only

### Performance Tips

1. **Large batch imports**: Import in smaller batches for better control
2. **Network assets**: Copy to local drive first for faster imports
3. **LOD generation**: Disable for simple/small meshes to save time
4. **Material complexity**: Complex materials may take longer to import

## Integration with Other Tools

### Workflow Integration

1. **After Import**: Use `asset_list` to verify imported assets
2. **Asset Inspection**: Use `asset_info` for detailed asset properties
3. **Level Placement**: Use `actor_spawn` to place imported assets
4. **Organization**: Use `actor_organize` to manage placed assets

### Example Workflow

```typescript
// 1. Import assets
const importResult = await asset_import({
  sourcePath: "/path/to/fab/assets",
  targetFolder: "/Game/Environment",
  batchImport: true
});

// 2. List imported assets
const assets = await asset_list({
  path: "/Game/Environment"
});

// 3. Get details for specific asset
const assetInfo = await asset_info({
  assetPath: "/Game/Environment/building_01"
});

// 4. Spawn in level
const actor = await actor_spawn({
  assetPath: "/Game/Environment/building_01",
  location: [1000, 0, 0]
});
```

## Technical Details

### Implementation

The asset import tool consists of:

1. **TypeScript Interface** (`server/src/tools/assets/import.ts`)
   - Parameter validation
   - Result formatting
   - Error handling

2. **Python Backend** (`plugin/Content/Python/ops/asset.py`)
   - File system operations
   - Unreal Engine import API integration
   - Asset processing and validation

### Python API Usage

The tool leverages several Unreal Engine Python APIs:

- `unreal.AssetImportTask`: Core import functionality
- `unreal.FbxImportUI`: FBX-specific import settings
- `unreal.TextureImportSettings`: Texture import configuration
- `unreal.AssetToolsHelpers`: Asset creation and management
- `unreal.AssetRegistryHelpers`: Asset registry operations

### Error Handling

The tool provides comprehensive error handling:

- **Validation errors**: Invalid paths, missing parameters
- **File system errors**: Permission issues, disk space
- **Import errors**: Corrupted files, unsupported formats
- **UE integration errors**: Asset creation failures

## Version History

- **v1.0.0**: Initial implementation with core import functionality
  - Support for static meshes, textures, materials
  - Batch import capabilities
  - Configurable import settings
  - Comprehensive error handling and reporting
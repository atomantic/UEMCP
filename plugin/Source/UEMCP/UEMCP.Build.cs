using UnrealBuildTool;

public class UEMCP : ModuleRules
{
    public UEMCP(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicIncludePaths.AddRange(
            new string[] {
            }
        );

        PrivateIncludePaths.AddRange(
            new string[] {
            }
        );

        PublicDependencyModuleNames.AddRange(
            new string[]
            {
                "Core",
                "PythonScriptPlugin",
                "Python3"
            }
        );

        PrivateDependencyModuleNames.AddRange(
            new string[]
            {
                "CoreUObject",
                "Engine",
                "Slate",
                "SlateCore",
                "EditorSubsystem",
                "UnrealEd",
                "ToolMenus",
                "EditorScriptingUtilities",
                "Json",
                "JsonUtilities",
                "HTTP",
                "Sockets",
                "Networking"
            }
        );

        DynamicallyLoadedModuleNames.AddRange(
            new string[]
            {
            }
        );
    }
}
// Copyright Epic Games, Inc. All Rights Reserved.

using UnrealBuildTool;

public class UEMCPEditor : ModuleRules
{
	public UEMCPEditor(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PrivateDependencyModuleNames.AddRange(
			new string[]
			{
				"Core",
				"CoreUObject",
				"Engine",
				"Slate",
				"SlateCore",
				"UnrealEd",
				"UEMCP" // Dependency on our runtime module
			}
		);
	}
}

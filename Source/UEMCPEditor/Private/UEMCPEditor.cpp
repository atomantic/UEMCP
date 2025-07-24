// Copyright Epic Games, Inc. All Rights Reserved.

#include "UEMCPEditor.h"

#define LOCTEXT_NAMESPACE "FUEMCPEditorModule"

void FUEMCPEditorModule::StartupModule()
{
	// This code will execute after your module is loaded into memory; the exact timing is specified in the .uplugin file
	UE_LOG(LogTemp, Warning, TEXT("UEMCPEditor module has started"));
}

void FUEMCPEditorModule::ShutdownModule()
{
	// This function may be called during shutdown to clean up your module.  For modules that support dynamic reloading,
	// we call this function before unloading the module.
	UE_LOG(LogTemp, Warning, TEXT("UEMCPEditor module has shut down"));
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FUEMCPEditorModule, UEMCPEditor)

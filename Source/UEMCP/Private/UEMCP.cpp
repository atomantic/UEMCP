// Copyright Epic Games, Inc. All Rights Reserved.

#include "UEMCP.h"
#include "UEMCPTCPServer.h"
#include "Core/Public/Delegates/Delegate.h"
#include "Engine/Engine.h"

#define LOCTEXT_NAMESPACE "FUEMCPModule"

void FUEMCPModule::StartupModule()
{
	UE_LOG(LogTemp, Warning, TEXT("UEMCP module has started"));

	// Start the TCP server
	UEMCPTCPServer::Start(7000); // Default port, can be made configurable later

	// Register the tick function
	if (GEngine)
	{
		TickDelegateHandle = GEngine->OnWorldTick().AddRaw(this, &FUEMCPModule::Tick);
	}
}

void FUEMCPModule::ShutdownModule()
{
	UE_LOG(LogTemp, Warning, TEXT("UEMCP module has shut down"));

	// Stop the TCP server
	UEMCPTCPServer::Shutdown();

	// Unregister the tick function
	if (GEngine)
	{
		GEngine->OnWorldTick().Remove(TickDelegateHandle);
	}
}

void FUEMCPModule::Tick(float DeltaTime)
{
	// Tick the TCP server
	UEMCPTCPServer::Tick();
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FUEMCPModule, UEMCP)

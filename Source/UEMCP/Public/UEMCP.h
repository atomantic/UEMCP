// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

#include "UEMCPTCPServer.h"

class FUEMCPModule : public IModuleInterface
{
public:

	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

	/** Tick function for the module */
	void Tick(float DeltaTime);

private:
	// Handle for the tick delegate
	FDelegateHandle TickDelegateHandle;
};

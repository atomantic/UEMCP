#include "UEMCP.h"

#define LOCTEXT_NAMESPACE "FUEMCPModule"

void FUEMCPModule::StartupModule()
{
    // This code will execute after your module is loaded into memory
    UE_LOG(LogTemp, Warning, TEXT("UEMCP Module has started!"));
}

void FUEMCPModule::ShutdownModule()
{
    // This function may be called during shutdown to clean up your module
    UE_LOG(LogTemp, Warning, TEXT("UEMCP Module has shut down"));
}

#undef LOCTEXT_NAMESPACE
    
IMPLEMENT_MODULE(FUEMCPModule, UEMCP)
#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

class FToolBarBuilder;
class FMenuBuilder;

class FUEMCPModule : public IModuleInterface
{
public:
    /** IModuleInterface implementation */
    virtual void StartupModule() override;
    virtual void ShutdownModule() override;
    
    /** Get the singleton instance of the UEMCP module */
    static FUEMCPModule& Get()
    {
        return FModuleManager::LoadModuleChecked<FUEMCPModule>("UEMCP");
    }
    
    /** Check if the module is loaded */
    static bool IsAvailable()
    {
        return FModuleManager::Get().IsModuleLoaded("UEMCP");
    }

private:
    void RegisterMenus();
    void RegisterPythonBindings();
    void SetupPythonPaths();
    
    /** Handle for registered Python initialization */
    FDelegateHandle PythonInitializedHandle;
};
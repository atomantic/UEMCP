#include "UEMCP.h"
#include "Modules/ModuleManager.h"
#include "Engine/Engine.h"
#include "Editor.h"
#include "ToolMenus.h"
#include "IPythonScriptPlugin.h"
#include "Misc/Paths.h"

#define LOCTEXT_NAMESPACE "FUEMCPModule"

void FUEMCPModule::StartupModule()
{
    // This code will execute after your module is loaded into memory
    UE_LOG(LogTemp, Log, TEXT("UEMCP Module Starting Up"));
    
    // Register menus after the engine is fully initialized
    UToolMenus::RegisterStartupCallback(FSimpleMulticastDelegate::FDelegate::CreateRaw(this, &FUEMCPModule::RegisterMenus));
    
    // Setup Python paths and bindings when Python is ready
    if (IPythonScriptPlugin::IsAvailable())
    {
        IPythonScriptPlugin& PythonPlugin = IPythonScriptPlugin::Get();
        if (PythonPlugin.IsPythonAvailable())
        {
            SetupPythonPaths();
            RegisterPythonBindings();
        }
        else
        {
            // Register for Python initialization callback
            PythonInitializedHandle = PythonPlugin.OnPythonInitialized().AddRaw(this, &FUEMCPModule::SetupPythonPaths);
            PythonPlugin.OnPythonInitialized().AddRaw(this, &FUEMCPModule::RegisterPythonBindings);
        }
    }
}

void FUEMCPModule::ShutdownModule()
{
    // This function may be called during shutdown to clean up your module
    UE_LOG(LogTemp, Log, TEXT("UEMCP Module Shutting Down"));
    
    UToolMenus::UnRegisterStartupCallback(this);
    UToolMenus::UnregisterAll();
    
    // Unregister Python initialization callback
    if (IPythonScriptPlugin::IsAvailable() && PythonInitializedHandle.IsValid())
    {
        IPythonScriptPlugin::Get().OnPythonInitialized().Remove(PythonInitializedHandle);
    }
}

void FUEMCPModule::RegisterMenus()
{
    // Owner will be used for cleanup in call to UToolMenus::UnregisterOwner
    FToolMenuOwnerScoped OwnerScoped(this);
    
    // Add a menu entry to Tools menu
    {
        UToolMenu* Menu = UToolMenus::Get()->ExtendMenu("LevelEditor.MainMenu.Tools");
        FToolMenuSection& Section = Menu->FindOrAddSection("UEMCP");
        Section.Label = LOCTEXT("UEMCPSection", "UEMCP");
        
        Section.AddMenuEntry(
            "UEMCPStatus",
            LOCTEXT("UEMCPStatus", "UEMCP Status"),
            LOCTEXT("UEMCPStatusTooltip", "Check UEMCP connection status"),
            FSlateIcon(),
            FUIAction(
                FExecuteAction::CreateLambda([]()
                {
                    UE_LOG(LogTemp, Log, TEXT("UEMCP Status Check"));
                    // TODO: Implement status check
                })
            )
        );
    }
}

void FUEMCPModule::SetupPythonPaths()
{
    if (!IPythonScriptPlugin::IsAvailable())
    {
        return;
    }
    
    // Add our Python scripts directory to the Python path
    FString PluginDir = IPluginManager::Get().FindPlugin(TEXT("UEMCP"))->GetBaseDir();
    FString PythonScriptsDir = FPaths::Combine(PluginDir, TEXT("Content"), TEXT("Python"));
    
    IPythonScriptPlugin& PythonPlugin = IPythonScriptPlugin::Get();
    PythonPlugin.ExecPythonCommand(*FString::Printf(TEXT("import sys; sys.path.append(r'%s')"), *PythonScriptsDir));
    
    UE_LOG(LogTemp, Log, TEXT("Added UEMCP Python path: %s"), *PythonScriptsDir);
}

void FUEMCPModule::RegisterPythonBindings()
{
    if (!IPythonScriptPlugin::IsAvailable())
    {
        return;
    }
    
    // Initialize UEMCP Python module
    IPythonScriptPlugin& PythonPlugin = IPythonScriptPlugin::Get();
    
    // Create UEMCP Python module
    FString InitScript = TEXT(R"(
# UEMCP Python Module Initialization
import unreal

class UEMCP:
    @staticmethod
    def get_project_info():
        """Get current project information"""
        return {
            'project_name': unreal.SystemLibrary.get_project_name(),
            'project_directory': unreal.SystemLibrary.get_project_directory(),
            'engine_version': unreal.SystemLibrary.get_engine_version()
        }
    
    @staticmethod
    def log(message):
        """Log a message to Unreal's log system"""
        unreal.log(f"[UEMCP] {message}")
    
    @staticmethod
    def is_connected():
        """Check if UEMCP server is connected"""
        # TODO: Implement actual connection check
        return False

# Register global UEMCP instance
unreal.uemcp = UEMCP()
unreal.log("[UEMCP] Python module initialized")
)");
    
    PythonPlugin.ExecPythonCommand(*InitScript);
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FUEMCPModule, UEMCP)
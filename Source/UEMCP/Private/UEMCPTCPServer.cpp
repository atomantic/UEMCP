// Copyright Epic Games, Inc. All Rights Reserved.

#include "UEMCPTCPServer.h"
#include "UEMCP.h"
#include "Common/TcpSocketBuilder.h"
#include "Interfaces/IPv4/IPv4Address.h"
#include "SocketSubsystem.h"
#include "Sockets.h"
#include "Json.h"
#include "JsonUtilities.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "Engine/Engine.h"

// Forward declaration for our new command handler function
void HandleCommand(const FString& JsonString);

// Initialize the singleton instance
TUniquePtr<UEMCPTCPServer> UEMCPTCPServer::Instance = nullptr;

// --- Singleton Management ---

UEMCPTCPServer& UEMCPTCPServer::Get()
{
    if (!Instance)
    {
        Instance = TUniquePtr<UEMCPTCPServer>(new UEMCPTCPServer());
    }
    return *Instance;
}

void UEMCPTCPServer::Shutdown()
{
    if (Instance)
    {
        Instance->Stop_Internal();
        Instance.Reset();
    }
}

// --- Public Static API ---

bool UEMCPTCPServer::Start(int32 Port)
{
    return Get().Start_Internal(Port);
}

void UEMCPTCPServer::Stop()
{
    Get().Stop_Internal();
}

void UEMCPTCPServer::Tick()
{
    Get().Tick_Internal();
}

// --- Implementation ---

UEMCPTCPServer::UEMCPTCPServer()
    : ListenSocket(nullptr)
    , bIsServerRunning(false)
{
}

UEMCPTCPServer::~UEMCPTCPServer()
{
    // Stop should have been called by the module, but as a fallback.
    Stop_Internal();
}

bool UEMCPTCPServer::Start_Internal(int32 Port)
{
    if (bIsServerRunning)
    {
        UE_LOG(LogTemp, Warning, TEXT("UEMCP Server already running."));
        return true;
    }

    ISocketSubsystem* SocketSubsystem = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM);
    if (!SocketSubsystem)
    {
        UE_LOG(LogTemp, Error, TEXT("Failed to get Socket Subsystem"));
        return false;
    }

    FIPv4Address Address;
    FIPv4Address::Parse(TEXT("0.0.0.0"), Address);
    FIPv4Endpoint Endpoint(Address, Port);

    ListenSocket = FTcpSocketBuilder(TEXT("UEMCPListenSocket"))
        .AsReusable()
        .BoundToEndpoint(Endpoint)
        .Listening(8);

    if (!ListenSocket)
    {
        UE_LOG(LogTemp, Error, TEXT("Failed to create listen socket on port %d"), Port);
        return false;
    }

    bIsServerRunning = true;
    UE_LOG(LogTemp, Log, TEXT("UEMCP Server started, listening on port %d"), Port);
    return true;
}

void UEMCPTCPServer::Stop_Internal()
{
    if (!bIsServerRunning)
    {
        return;
    }

    for (FSocket* Socket : ConnectedSockets)
    {
        Socket->Close();
        ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(Socket);
    }
    ConnectedSockets.Empty();

    if (ListenSocket)
    {
        ListenSocket->Close();
        ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(ListenSocket);
        ListenSocket = nullptr;
    }

    bIsServerRunning = false;
    UE_LOG(LogTemp, Log, TEXT("UEMCP Server stopped."));
}

void UEMCPTCPServer::Tick_Internal()
{
    if (!bIsServerRunning)
    {
        return;
    }

    HandleNewConnection();

    // Handle data on existing connections
    for (int32 i = ConnectedSockets.Num() - 1; i >= 0; --i)
    {
        HandleData(ConnectedSockets[i]);
    }
}

void UEMCPTCPServer::HandleNewConnection()
{
    bool bHasPendingConnection;
    if (ListenSocket->HasPendingConnection(bHasPendingConnection) && bHasPendingConnection)
    {
        FSocket* ClientSocket = ListenSocket->Accept(TEXT("UEMCPClientSocket"));
        if (ClientSocket)
        {
            ConnectedSockets.Add(ClientSocket);
            UE_LOG(LogTemp, Log, TEXT("Accepted new client connection."));
        }
    }
}

void UEMCPTCPServer::HandleData(FSocket* ClientSocket)
{
    uint32 Size;
    while (ClientSocket->HasPendingData(Size))
    {
        TArray<uint8> ReceivedData;
        ReceivedData.SetNumUninitialized(FMath::Min(Size, 65507u));

        int32 Read = 0;
        ClientSocket->Recv(ReceivedData.GetData(), ReceivedData.Num(), Read);

        if (Read > 0)
        {
            const FString ReceivedString = FString(Read, (const char*)ReceivedData.GetData());
            UE_LOG(LogTemp, Log, TEXT("Received: %s"), *ReceivedString);
            
            // Handle the command in a separate function
            HandleCommand(ReceivedString);
        }
    }

    // Check for disconnection
    if (ClientSocket->GetConnectionState() != ESocketConnectionState::SCS_Connected)
    {
        UE_LOG(LogTemp, Log, TEXT("Client disconnected."));
        ConnectedSockets.Remove(ClientSocket);
        ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(ClientSocket);
    }
}

void HandleCommand(const FString& JsonString)
{
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);

    if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
    {
        UE_LOG(LogTemp, Error, TEXT("Failed to parse JSON command: %s"), *JsonString);
        return;
    }

    FString Intent;
    if (!JsonObject->TryGetStringField(TEXT("intent"), Intent))
    {
        UE_LOG(LogTemp, Error, TEXT("Missing 'intent' field in command."));
        return;
    }

    if (Intent == TEXT("spawn_actor"))
    {
        const TSharedPtr<FJsonObject>* ParametersObject;
        if (!JsonObject->TryGetObjectField(TEXT("parameters"), ParametersObject))
        {
            UE_LOG(LogTemp, Error, TEXT("Missing 'parameters' for spawn_actor."));
            return;
        }

        FString ClassName;
        if (!(*ParametersObject)->TryGetStringField(TEXT("class"), ClassName))
        {
            UE_LOG(LogTemp, Error, TEXT("Missing 'class' parameter for spawn_actor."));
            return;
        }

        const TArray<TSharedPtr<FJsonValue>>* LocationArray;
        if (!(*ParametersObject)->TryGetArrayField(TEXT("location"), LocationArray) || LocationArray->Num() != 3)
        {
            UE_LOG(LogTemp, Error, TEXT("Invalid 'location' parameter for spawn_actor. Must be an array of 3 numbers."));
            return;
        }

        FVector Location(
            (*LocationArray)[0]->AsNumber(),
            (*LocationArray)[1]->AsNumber(),
            (*LocationArray)[2]->AsNumber()
        );

        // Find the class
        UClass* ActorClass = FindObject<UClass>(ANY_PACKAGE, *ClassName);
        if (!ActorClass)
        {
            UE_LOG(LogTemp, Error, TEXT("Could not find class: %s"), *ClassName);
            return;
        }

        // Get the world
        UWorld* World = GEngine->GetWorldContexts()[0].World();
        if (!World)
        {
            UE_LOG(LogTemp, Error, TEXT("Could not get world context."));
            return;
        }

        // Spawn the actor
        AActor* NewActor = World->SpawnActor<AActor>(ActorClass, Location, FRotator::ZeroRotator);
        if (NewActor)
        {
            UE_LOG(LogTemp, Log, TEXT("Successfully spawned actor: %s"), *NewActor->GetName());
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("Failed to spawn actor of class: %s"), *ClassName);
        }
    }
    else
    {
        UE_LOG(LogTemp, Warning, TEXT("Unknown intent: %s"), *Intent);
    }
}

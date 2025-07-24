// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

class FSocket;

/**
 * Manages the TCP server for receiving MCP commands.
 * Follows a singleton pattern and is ticked from the main module.
 */
class UEMCP_API UEMCPTCPServer
{
public:
    /**
     * Starts the TCP server on the specified port.
     * @param Port The port number to listen on.
     * @return True if the server started successfully, false otherwise.
     */
    static bool Start(int32 Port);

    /**
     * Stops the TCP server and disconnects all clients.
     */
    static void Stop();

    /**
     * Ticks the server to handle new connections and receive data.
     * Should be called every frame from the main game loop.
     */
    static void Tick();

private:
    // Singleton instance management
    static UEMCPTCPServer& Get();
    friend class FUEMCPModule; // Allow module to call shutdown
    static void Shutdown();

    // Private constructor and destructor
    UEMCPTCPServer();
    ~UEMCPTCPServer();

    // Non-copyable
    UEMCPTCPServer(const UEMCPTCPServer&) = delete;
    UEMCPTCPServer& operator=(const UEMCPTCPServer&) = delete;

    // Internal implementation
    bool Start_Internal(int32 Port);
    void Stop_Internal();
    void Tick_Internal();

    void HandleNewConnection();
    void HandleData(FSocket* ClientSocket);

    // Server state
    FSocket* ListenSocket;
    TArray<FSocket*> ConnectedSockets;
    bool bIsServerRunning;

    // Singleton instance
    static TUniquePtr<UEMCPTCPServer> Instance;
};

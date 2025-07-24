# UEMCP Project Plan (MVP-First Approach)

This plan outlines the development of the UEMCP plugin with a focus on delivering a Minimum Viable Product (MVP) as quickly as possible for iterative testing and validation.

## MVP: End-to-End Command Execution

- **Objective:** Implement the simplest possible end-to-end workflow: send a command from a Python client, have it be received and executed by the Unreal Engine plugin, and see a result in the engine.
- **Success Criteria:** Be able to run `python test_client.py spawn_actor BP_Crate 0 0 200` and see a Crate actor appear in the Unreal viewport.

### MVP Key Tasks

1.  **Project Scaffolding & Plugin Descriptor:**
    - Create the basic directory structure required by an Unreal Engine plugin.
    - Create the `UEMCP.uplugin` descriptor file.

2.  **Core C++ Implementation:**
    - **TCP Server (`UEMCPTCPServer.cpp/.h`):** Implement a basic TCP server that can accept a connection and receive data. No multi-threading needed for MVP.
    - **Command Parsing & Dispatch:** A simple function to parse the incoming JSON string and identify the command. No complex registry needed for MVP.
    - **`spawn_actor` Command:** Hardcode the implementation for a single `spawn_actor` command that takes class and location.

3.  **Editor Integration (Minimal):**
    - Implement a simple way to start the server, such as a console command (e.g., `UEMCP.StartServer`) within the Unreal Editor.

4.  **Python Test Client (`test_client.py`):**
    - Create a script that connects to the server and sends a hardcoded `spawn_actor` JSON command.

## Post-MVP Development Plan

Once the MVP is validated, development will proceed in phases, drawing from the original plan.

### Phase 1: Refine Core Infrastructure

- **Objective:** Harden the C++ foundation.
- **Key Tasks:**
    - Refactor the TCP Server to be multi-threaded.
    - Implement the `MCPCommandRegistry` for modular command handling.
    - Add more core commands (e.g., `get_actor_location`, `set_actor_property`).

### Phase 2: Enhance Editor Integration & Tooling

- **Objective:** Improve the user experience for developers.
- **Key Tasks:**
    - Create an Editor UI panel to manage the server.
    - Implement configuration loading from `UEMCP.ini`.
    - Define and use a `schema.json` for command validation.

### Phase 3: Security and Documentation

- **Objective:** Prepare the plugin for wider use.
- **Key Tasks:**
    - Create `CONTRIBUTING.md`.
    - Implement security features like command whitelisting.
    - Add comprehensive code and user documentation.

### Phase 4: Advanced Features (Roadmap)

- **Objective:** Expand the plugin's capabilities.
- **Key Tasks:**
    - WebSocket support
    - Stateful sessions
    - Live Blueprint editing
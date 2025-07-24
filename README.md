# UEMCP

> NOTE: this is a WIP.

**UEMCP** is a lightweight, extensible Unreal Engine plugin that exposes core engine functionality over the [Model Context Protocol (MCP)](https://mcp.openai.com/), enabling AI agents to introspect and manipulate Unreal projects in real-time.

Supports both runtime and editor workflows, with a focus on performance, safety, and extensibility.

---

## 🔧 Features

* 🚀 TCP server integration with Unreal Engine (via C++)
* 🧠 MCP-style JSON command parsing
* 🎮 Blueprint, Actor, and Asset manipulation endpoints
* 📂 Modular command registry for custom extensions
* ⚙️ Optional Python scripting interface (editor-only)
* 🛡️ Command whitelisting and sandbox mode
* 🧪 Includes test client for simulated agent interaction

---

## 📁 Project Structure

```
/UEMCP
├── Source/
│   ├── UEMCP/
│   │   ├── Public/
│   │   ├── Private/
│   │   ├── MCPCommandRegistry.cpp
│   │   ├── UEMCPTCPServer.cpp
│   └── UEMCPEditor/
├── Scripts/
│   └── test_client.py
├── Config/
│   └── UEMCP.ini
├── Resources/
│   └── schema.json
└── README.md
```

---

## 🛠️ Installation

1. Clone this repo into your UE project’s `Plugins/` folder:

   ```bash
   git clone https://github.com/atomantic/UEMCP.git Plugins/UEMCP
   ```

2. Open your `.uproject` and regenerate project files (right-click or use `GenerateProjectFiles.bat`).

3. Build the project. See platform-specific instructions below.

### macOS

To build the project on macOS using Xcode, navigate to your project's root directory in the terminal and run:

```bash
xcodebuild -workspace "UEMCP (Mac).xcworkspace" -scheme UEMCP -configuration Development
```

Alternatively, you can open `UEMCP (Mac).xcworkspace` in Xcode and build from there.

### Windows

To build the project on Windows, open the generated Visual Studio solution (`.sln`) file and build from within Visual Studio. Alternatively, you can use `UnrealBuildTool` from the command line.


4. Enable the **UEMCP** plugin in the Unreal Plugin Browser.

---

## 🧠 Example Usage

Start the TCP server inside Unreal:

```cpp
UEMCPTCPServer::StartServer(7000);
```

Send a command from your MCP-compatible AI agent:

```json
{
  "intent": "spawn_actor",
  "parameters": {
    "class": "BP_Crate",
    "location": [0, 0, 200]
  }
}
```

Server response:

```json
{
  "status": "success",
  "actor_id": "Crate_452"
}
```

---

## 💡 Use Cases

* AI Copilots that design levels, spawn actors, or debug code in real time.
* LLM-driven assistants that can modify blueprints and assets via text.
* Programmatic automation of repetitive Unreal workflows.
* Remote control of simulation environments in research or robotics.

---

## 🔒 Security

* Sandbox mode available to restrict allowed commands.
* IP filtering and TCP authentication planned.
* All commands must be explicitly registered and whitelisted.

---

## 🚧 Roadmap

* [ ] WebSocket support
* [ ] Agent stateful session management
* [ ] Command schema auto-documentation
* [ ] Editor utility bindings (e.g. open asset, focus viewport)
* [ ] Live Blueprint graph editing
* [ ] Multiplayer session control

---

## 🧪 Testing

Start the test client:

```bash
python3 Scripts/test_client.py --host localhost --port 7000
```

Use CLI to send commands like:

```bash
> spawn_actor BP_Lamp 100 0 200
```

---

## 📜 License

MIT License. See [`LICENSE`](LICENSE) for details.

---

## 🙋‍♂️ Contributions

PRs welcome! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for coding standards and guidelines.

---

## 📣 Credits

Inspired by [UnrealMCP](https://github.com/kvick-games/UnrealMCP), [Claude MCP Tools](https://github.com/appleweed/UnrealMCPBridge), and the broader [OpenAI MCP](https://platform.openai.com/docs/guides/mcp) ecosystem.

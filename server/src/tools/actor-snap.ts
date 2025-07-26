import { z } from "zod";
import { tool } from "@modelcontextprotocol/sdk";
import { PythonBridge } from "../services/python-bridge.js";

const ACTOR_SNAP_SCHEMA = z.object({
  assetPath: z.string().describe("Asset path (e.g., /Game/Meshes/SM_Wall01)"),
  targetActorName: z.string().describe("Name of existing actor to snap to"),
  snapSide: z.enum(["left", "right", "front", "back"]).describe("Which side of the target actor to snap to"),
  offset: z.array(z.number()).length(3).optional().describe("Additional offset [x, y, z] after snapping (default: [0, 0, 0])"),
  name: z.string().optional().describe("Optional name for the spawned actor"),
  folder: z.string().optional().describe("Optional folder path in World Outliner (e.g., \"Estate/House\")")
});

export const actorSnapTool = tool(
  {
    name: "actor_snap",
    description: "Spawn an actor and automatically snap it to the side of an existing actor using their bounding boxes. Perfect for modular building components.",
    inputSchema: ACTOR_SNAP_SCHEMA,
  },
  async ({ assetPath, targetActorName, snapSide, offset = [0, 0, 0], name, folder }: z.infer<typeof ACTOR_SNAP_SCHEMA>) => {
    const pythonBridge = new PythonBridge();
    
    try {
      const response = await pythonBridge.sendCommand({
        type: 'actor.snap',
        params: {
          assetPath,
          targetActorName,
          snapSide,
          offset,
          name,
          folder
        }
      });
      
      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to snap actor: ${errorMessage}`);
    }
  }
);
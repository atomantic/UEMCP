import { z } from "zod";
import { tool } from "@modelcontextprotocol/sdk";
import fs from "fs/promises";
import path from "path";
import os from "os";

const UE_LOGS_SCHEMA = z.object({
  lines: z.number().optional().describe("Number of lines to read from the end of the log (default: 100)"),
  project: z.string().optional().describe("Project name (default: Home)")
});

export const ueLogsTool = tool(
  {
    name: "ue_logs",
    description: "Fetch recent lines from the Unreal Engine console log file. Useful for debugging issues when MCP commands report failure but may have succeeded.",
    inputSchema: UE_LOGS_SCHEMA,
  },
  async ({ lines = 100, project = "Home" }: z.infer<typeof UE_LOGS_SCHEMA>) => {
    try {
      const homeDir = os.homedir();
      const logPath = path.join(homeDir, "Library", "Logs", "Unreal Engine", `${project}Editor`, `${project}.log`);
      
      // Check if file exists
      try {
        await fs.access(logPath);
      } catch {
        return `Log file not found at: ${logPath}`;
      }
      
      // Read the file
      const content = await fs.readFile(logPath, "utf-8");
      const allLines = content.split("\n");
      
      // Get the last N lines
      const recentLines = allLines.slice(-lines).join("\n");
      
      return `📜 UE Console Log (last ${lines} lines from ${project}.log):\n\n${recentLines}`;
      
    } catch (error) {
      return `Error reading UE log: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
);
import type { CouncilSession } from "./council";

export interface UIChatMessage {
  id: string;
  role: "user" | "council";
  content: string;
  session?: CouncilSession;
  timestamp: number;
}

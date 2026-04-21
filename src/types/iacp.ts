export type IACPMessageType =
  | "INFO_REQUEST"
  | "INFO_RESPONSE"
  | "OPINION_SHARE"
  | "CHALLENGE"
  | "AGREEMENT"
  | "CLARIFICATION"
  | "EVIDENCE"
  | "SYNTHESIS"
  | "ACKNOWLEDGMENT";

export type IACPPriority = "urgent" | "normal" | "low";

export interface IACPMessageMetadata {
  confidence?: number;
  domain?: string;
  expertise?: string[];
  timestamp?: number;
}

export interface IACPRoutingHint {
  targetDomains?: string[];
  targetExpertise?: string[];
  broadcastToDomain?: boolean;
}

export interface IACPMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string | "ALL";
  type: IACPMessageType;
  content: string;
  timestamp: number;
  round: number;
  // Threading
  replyTo?: string;
  threadId?: string;
  // Priority
  priority?: IACPPriority;
  // Acknowledgment
  acknowledged?: boolean;
  // Metadata
  metadata?: IACPMessageMetadata;
  // Routing
  routingHint?: IACPRoutingHint;
}

export interface IACPThreadSummary {
  messageCount: number;
  participants: string[];
  latestMessage: IACPMessage;
}

export interface IACPStats {
  totalMessages: number;
  messagesByType: Record<string, number>;
  messagesByPriority: Record<string, number>;
  activeThreads: number;
}

export interface IACPConfig {
  enabled: boolean;
  maxMessagesPerAgent: number;
  maxRounds: number;
}

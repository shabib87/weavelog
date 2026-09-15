/** Shared types for the TASK-4 TypeScript controller. */

export interface AgentModelIdentity {
  agent: string;
  providerID?: string;
  modelID?: string;
}

export interface AgentError {
  name: string;
  message: string;
}

export interface AgentResult {
  text: string;
  error?: AgentError;
  identity: AgentModelIdentity;
}

/** A fresh-context agent session (one per stage that needs model reasoning). */
export interface AgentSession {
  id: string;
  prompt(opts: { agent: string; text: string }): Promise<AgentResult>;
  abort(): Promise<void>;
  close(): Promise<void>;
}

export interface AgentSessionFactory {
  start(opts: { cwd: string; title: string }): Promise<AgentSession>;
}

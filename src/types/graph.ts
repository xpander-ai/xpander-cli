import { Agent } from './agents';

/**
 * Represents a graph node in the agent operation graph
 */
export interface GraphNode {
  id: string;
  name: string;
  item_id: string;
  type?: string;
  interface_id?: string;
}

/**
 * Represents a connection between graph nodes
 */
export interface GraphConnection {
  source: string;
  target: string;
  condition: string;
}

/**
 * Represents a graph item with connection capabilities
 */
export interface GraphItem {
  id: string;
  name: string;
  item_id: string;
  agent: Agent;
}

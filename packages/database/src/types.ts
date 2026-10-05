export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipRole = 'owner' | 'admin' | 'member';

export interface Membership {
  organizationId: string;
  userId: string;
  role: MembershipRole;
  createdAt: Date;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Document {
  id: string;
  projectId: string;
  uploadedBy: string | null;
  name: string;
  mimeType: string | null;
  storageKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

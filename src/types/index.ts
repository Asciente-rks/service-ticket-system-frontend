export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  organizationId?: string | null;
  role?: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
  inviteCode?: string;
  isOwner?: boolean;
  createdAt?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  jamUrl?: string | null;
  statusId: string;
  priority: "Low" | "Medium" | "High";
  createdAt: string;
  userId: string;
  collectionId?: string | null;
  collectionName?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  ticketCount: number;
  openCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketStatus {
  id: string;
  name: string;
}

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  ticketId?: string;
  createdAt: string;
}

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  parentId?: string | null;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  replies?: TicketComment[];
}

export interface TicketEvent {
  id: string;
  type: "reported" | "assigned" | "reassigned" | "status_changed" | "approved" | "rejected" | string;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string;
  actor?: { id: string; name: string } | null;
}

export interface Conversation {
  id: string;
  other: { id: string; name: string; email: string };
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastMessageMine: boolean;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; name: string; email: string } | null;
}

export interface AiTicketRef {
  id: string;
  title: string;
  status?: string;
  priority?: string;
}

export interface AiConversation {
  id: string;
  title: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiDuplicateGroup {
  reason: string;
  tickets: AiTicketRef[];
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  body: string;
  ticketRefs: AiTicketRef[];
  meta: {
    provider?: string;
    model?: string;
    error?: boolean;
    duplicateGroups?: AiDuplicateGroup[];
  } | null;
  createdAt: string;
}

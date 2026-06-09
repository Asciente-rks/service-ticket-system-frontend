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

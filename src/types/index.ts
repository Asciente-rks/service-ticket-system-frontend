export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  statusId: string;
  priority: "Low" | "Medium" | "High";
  createdAt: string;
  userId: string;
}

export interface TicketStatus {
  id: string;
  name: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    roleId: string; 
  }
  
  // Add this export
  export interface Role {
    id: string;
    name: string;
  }
  
  export interface Ticket {
    id: string;
    title: string;
    description: string;
    statusId: string; 
    priority: 'Low' | 'Medium' | 'High';
    createdAt: string;
    userId: string;
  }
  
  // Add this export - This is the one Dashboard is looking for!
  export interface TicketStatus {
    id: string;
    name: string;
  }
// src/types/social.ts
export interface ChatUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

export interface Conversation {
  _id: string;
  user1Id: ChatUser;
  user2Id: ChatUser;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: ChatUser | string;
  content: string;
  createdAt: string;
}

export type NotificationType = 'NEW_MESSAGE' | 'NEW_REVIEW' | 'ACCOUNT_REPORTED' | 'NEW_REPORT' | string;

export interface AppNotification {
  _id: string;
  Type: NotificationType;
  Message: string;
  createdAt: string;
  isRead: boolean;
}

export interface Review {
  _id: string;
  serviceId?: string;
  reviewerId: ChatUser;
  revieweredId: ChatUser;
  Rating: number;
  Comment: string;
  createdAt: string;
}

export interface Report {
  _id: string;
  reporterId: string;
  reporteredId: ChatUser;
  Reason: string;
  Description: string;
  Status: boolean;
  createdAt: string;
}
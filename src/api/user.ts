import { axiosUser } from './api';

// ================= CONVERSATIONS =================
export const getUserConversations = async (userId: string) =>
  await axiosUser.get(`/conversations/user/${userId}`);

export const createConversation = async (user1Id: string, user2Id: string) =>
  await axiosUser.post('/conversations', { user1Id, user2Id });

// ================= MESSAGES =================
export const getMessagesByConversation = async (conversationId: string) =>
  await axiosUser.get(`/messages/conversation/${conversationId}`);

export const sendMessage = async ({
  conversationId,
  senderId,
  content,
}: {
  conversationId: string;
  senderId: string;
  content: string;
}) => await axiosUser.post('/messages', { conversationId, senderId, content });

// ================= NOTIFICATIONS =================
export const getUserNotifications = async (userId: string) =>
  await axiosUser.get(`/notifications/${userId}`);

export const markNotificationAsRead = async (id: string) =>
  await axiosUser.patch(`/notifications/${id}/read`);

export const markAllNotificationsAsRead = async (userId: string) =>
  await axiosUser.patch(`/notifications/${userId}/read-all`);

// ================= REVIEWS =================
export const createReview = async (data: any) => await axiosUser.post('/reviews', data);

export const getGivenReviews = async (userId: string) =>
  await axiosUser.get(`/reviews/client/${userId}`);

export const getReceivedReviews = async (userId: string) =>
  await axiosUser.get(`/reviews/worker/${userId}`);

// ================= REPORTS =================
export const createReport = async (data: any) => await axiosUser.post('/reports', data);

export const getCreatedReports = async (userId: string) =>
  await axiosUser.get(`/reports/created/${userId}`);
export interface ChatMessage {
  id: string;
  clientId?: string;
  senderId: string;
  content: string;
  timestamp: string;
  pending?: boolean;
  failed?: boolean;
}

export interface Conversation {
  key: string;
  otherId: string;
  otherName: string;
  itemId: string | null;
  itemTitle: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

export type InboxRow = {
  other_id: number;
  other_name?: string;
  message?: string;
  timestamp?: string;
  item_id?: number | null;
  item_title?: string | null;
  unread_count?: number;
};

export const conversationKey = (otherId: string, itemId: string | null) =>
  `${otherId}-${itemId ?? 'general'}`;

export const mapInboxRow = (row: InboxRow): Conversation => ({
  key: conversationKey(String(row.other_id), row.item_id != null ? String(row.item_id) : null),
  otherId: String(row.other_id),
  otherName: row.other_name || 'Customer',
  itemId: row.item_id != null ? String(row.item_id) : null,
  itemTitle: row.item_title || null,
  lastMessage: row.message || '',
  lastMessageTime: row.timestamp || new Date().toISOString(),
  unread: Number(row.unread_count || 0),
});

export const mapApiMessage = (row: {
  id: number;
  clientId?: string;
  sender_id: number;
  message: string;
  timestamp: string;
}): ChatMessage => ({
  id: String(row.id),
  clientId: row.clientId,
  senderId: String(row.sender_id),
  content: row.message,
  timestamp: row.timestamp,
});

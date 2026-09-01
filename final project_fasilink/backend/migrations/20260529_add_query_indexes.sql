CREATE INDEX [idx_items_owner_id] ON [dbo].[Items] ([owner_id]);
CREATE INDEX [idx_items_status] ON [dbo].[Items] ([status]);
CREATE INDEX [idx_items_category_id] ON [dbo].[Items] ([category_id]);

CREATE INDEX [idx_notifications_user_id_is_read] ON [dbo].[Notifications] ([user_id], [is_read]);

CREATE INDEX [idx_messages_item_id] ON [dbo].[Messages] ([item_id]);
CREATE INDEX [idx_messages_sender_receiver_item_id] ON [dbo].[Messages] ([sender_id], [receiver_id], [item_id]);

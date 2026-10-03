// convex/notifications.ts
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Отримує список сповіщень для поточного користувача
 */
export const getNotifications = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .order("desc")
      .collect();

    if (notifications.length === 0) return [];

    const notificationsWithInfo = await Promise.all(
      notifications.map(async (notification) => {
        const sender = await ctx.db.get(notification.senderId);
        if (!sender) return null;

        let post = null;
        if (notification.postId) {
          post = await ctx.db.get(notification.postId);
        }

        let comment = null;
        if (notification.type === "comment" && notification.commentId) {
          comment = await ctx.db.get(notification.commentId);
        }

        return {
          ...notification,
          sender: {
            _id: sender._id,
            username: sender.username ?? sender.name ?? "користувач",
            image:
              sender.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
          post: post
            ? {
                _id: post._id,
                imageUrl: post.imageUrl,
              }
            : null,
          comment: comment?.content,
        };
      }),
    );

    return notificationsWithInfo.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
  },
});

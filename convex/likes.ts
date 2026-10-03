// convex/likes.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Перемикає лайк на пості та створює сповіщення для автора
 */
export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Пост не знайдено");

    // Шукаємо, чи поточний користувач уже поставив лайк
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_and_post", (q) =>
        q.eq("userId", userId).eq("postId", args.postId),
      )
      .first();

    if (existingLike) {
      // Якщо лайк вже є — видаляємо його
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postId, {
        likes: Math.max(0, post.likes - 1),
      });
      return false; // Лайк знято
    } else {
      // Якщо лайка немає — створюємо новий
      await ctx.db.insert("likes", {
        userId,
        postId: args.postId,
      });
      await ctx.db.patch(args.postId, {
        likes: post.likes + 1,
      });

      // Створюємо сповіщення автору посту (якщо лайкнули не власний пост)
      if (userId !== post.userId) {
        await ctx.db.insert("notifications", {
          type: "like",
          receiverId: post.userId,
          senderId: userId,
          postId: args.postId,
        });
      }
      return true; // Лайк успішно поставлено
    }
  },
});

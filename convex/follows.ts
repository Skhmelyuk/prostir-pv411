// convex/follows.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Перевіряє, чи підписаний поточний користувач на іншого користувача
 */
export const isFollowing = query({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId),
      )
      .first();

    return !!follow;
  },
});

/**
 * Перемикає підписку (Follow/Unfollow), оновлює лічильники та створює сповіщення
 */
export const toggleFollow = mutation({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    if (userId === args.followingId) {
      throw new Error("Ви не можете підписатися на самого себе");
    }

    const follower = await ctx.db.get(userId);
    const following = await ctx.db.get(args.followingId);
    if (!following) {
      throw new Error("Користувача не знайдено");
    }

    // Шукаємо, чи вже існує підписка за індексом "by_both"
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId),
      )
      .first();

    if (existingFollow) {
      // 1. Відписка (Unfollow)
      await ctx.db.delete(existingFollow._id);

      await ctx.db.patch(userId, {
        following: Math.max(0, (follower?.following ?? 1) - 1),
      });
      await ctx.db.patch(args.followingId, {
        followers: Math.max(0, (following.followers ?? 1) - 1),
      });

      return false; // Більше не стежить
    } else {
      // 2. Підписка (Follow)
      await ctx.db.insert("follows", {
        followerId: userId,
        followingId: args.followingId,
      });

      await ctx.db.patch(userId, {
        following: (follower?.following ?? 0) + 1,
      });
      await ctx.db.patch(args.followingId, {
        followers: (following.followers ?? 0) + 1,
      });

      // 3. Створюємо сповіщення типу "follow" для автора
      await ctx.db.insert("notifications", {
        receiverId: args.followingId,
        senderId: userId,
        type: "follow",
      });

      return true; // Тепер стежить
    }
  },
});

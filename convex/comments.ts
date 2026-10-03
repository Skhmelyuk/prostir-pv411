// convex/comments.ts
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Додає коментар до поста та створює сповіщення для автора
 */
export const addComment = mutation({
  args: {
    content: v.string(),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Пост не знайдено");

    // 1. Зберігаємо коментар
    const commentId = await ctx.db.insert("comments", {
      userId,
      postId: args.postId,
      content: args.content,
    });

    // 2. Збільшуємо лічильник коментарів у пості
    await ctx.db.patch(args.postId, {
      comments: post.comments + 1,
    });

    // 3. Створюємо сповіщення автору посту (якщо коментує інший користувач)
    if (post.userId !== userId) {
      await ctx.db.insert("notifications", {
        receiverId: post.userId,
        senderId: userId,
        type: "comment",
        postId: args.postId,
        commentId,
      });
    }

    return commentId;
  },
});

/**
 * Отримує всі коментарі до поста разом з даними профілів авторів
 */
export const getComments = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    // Шукаємо всі коментарі за індексом "by_post"
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    if (comments.length === 0) return [];

    // Завантажуємо профілі авторів паралельно
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: {
            fullname: user?.fullname ?? user?.name ?? "Користувач",
            image:
              user?.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
        };
      })
    );

    return commentsWithUsers;
  },
});

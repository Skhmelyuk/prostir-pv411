// convex/posts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Генерує тимчасове посилання для завантаження файлу в Convex Storage
 */
export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized: Неавторизований доступ");
  }
  return await ctx.storage.generateUploadUrl();
});

/**
 * Зберігає пост у БД та оновлює кількість постів у профілі користувача
 */
export const createPost = mutation({
  args: {
    caption: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    // Завантажуємо поточного користувача
    const currentUser = await ctx.db.get(userId);
    if (!currentUser) {
      throw new Error("User not found: Користувача не знайдено");
    }

    // Отримуємо публічне посилання на завантажене зображення
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error(
        "Image URL not found: Не вдалося згенерувати посилання на зображення",
      );
    }

    // Вставляємо пост в таблицю "posts"
    const postId = await ctx.db.insert("posts", {
      userId,
      imageUrl,
      storageId: args.storageId,
      caption: args.caption,
      likes: 0,
      comments: 0,
    });

    // Оновлюємо лічильник постів користувача
    await ctx.db.patch(userId, {
      posts: (currentUser.posts ?? 0) + 1,
    });

    return postId;
  },
});

/**
 * Отримує всі пости для стрічки разом із інформацією про автора, лайки та закладки
 */
export const getPosts = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Отримуємо всі пости, відсортовані за часом створення (спочатку найновіші)
    const posts = await ctx.db.query("posts").order("desc").collect();

    if (posts.length === 0) return [];

    const postsWithInfo = await Promise.all(
      posts.map(async (post) => {
        const postAuthor = await ctx.db.get(post.userId);

        // Перевіряємо, чи поточний користувач лайкнув цей пост
        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", userId).eq("postId", post._id),
          )
          .first();

        // Перевіряємо, чи пост збережено у закладках
        const bookmark = await ctx.db
          .query("bookmarks")
          .withIndex("by_both", (q) =>
            q.eq("userId", userId).eq("postId", post._id),
          )
          .first();

        return {
          ...post,
          author: {
            _id: postAuthor?._id,
            username: postAuthor?.username ?? postAuthor?.name ?? "користувач",
            image:
              postAuthor?.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
          isLiked: !!like,
          isBookmarked: !!bookmark,
        };
      }),
    );

    return postsWithInfo;
  },
});

/**
 * Видаляє пост та всі пов'язані з ним сутності (лайки, коментарі, закладки, файл у сховищі)
 */
export const deletePost = mutation({
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

    // Дозволено видаляти тільки власні пости
    if (post.userId !== userId) {
      throw new Error("Forbidden: Немає прав для видалення цього поста");
    }

    // 1. Видаляємо всі пов'язані лайки
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // 2. Видаляємо всі пов'язані коментарі
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // 3. Видаляємо всі пов'язані закладки
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // 4. Видаляємо зображення з Convex Storage
    await ctx.storage.delete(post.storageId);

    // 5. Видаляємо сам документ посту
    await ctx.db.delete(args.postId);

    // 6. Зменшуємо лічильник постів у профілі користувача
    const currentUser = await ctx.db.get(userId);
    if (currentUser) {
      await ctx.db.patch(userId, {
        posts: Math.max(0, (currentUser.posts ?? 1) - 1),
      });
    }
  },
});

/**
 * Отримує всі пости вказаного або поточного користувача
 */
export const getPostsByUser = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? (await getAuthUserId(ctx));
    if (!userId) return [];

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return posts;
  },
});

/**
 * Отримує один пост за його ID з інформацією про автора, статус лайка та закладки
 */
export const getPostById = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const author = await ctx.db.get(post.userId);
    const userId = await getAuthUserId(ctx);

    let isLiked = false;
    let isBookmarked = false;

    if (userId) {
      // Перевіряємо, чи поставив поточний користувач лайк
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_and_post", (q) =>
          q.eq("userId", userId).eq("postId", post._id),
        )
        .first();
      isLiked = !!like;

      // Перевіряємо, чи збережено пост у закладках
      const bookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_both", (q) =>
          q.eq("userId", userId).eq("postId", post._id),
        )
        .first();
      isBookmarked = !!bookmark;
    }

    return {
      ...post,
      author: {
        _id: author?._id,
        username: author?.username ?? author?.fullname ?? author?.name ?? "Користувач",
        image:
          author?.image ??
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
      },
      isLiked,
      isBookmarked,
    };
  },
});


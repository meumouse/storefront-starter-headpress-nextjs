import "server-only";

import { readOr } from "@/lib/headpress/safe-read";

interface WpPost {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
}

export interface PostSummary {
  id: number;
  slug: string;
  date: string;
  title: string;
  excerpt: string;
}

/** Latest posts. The Headpress `content` module resolves one path, so lists come from `wp/v2`. */
export function latestPosts(perPage = 12): Promise<PostSummary[]> {
  return readOr([], async (hp) => {
    const posts = await hp.request<WpPost[]>("/posts", {
      api: "wp/v2",
      query: { per_page: perPage, _fields: "id,slug,date,title,excerpt" },
    });
    return posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      date: post.date,
      title: post.title.rendered,
      excerpt: post.excerpt.rendered.replace(/<[^>]+>/g, "").trim(),
    }));
  });
}

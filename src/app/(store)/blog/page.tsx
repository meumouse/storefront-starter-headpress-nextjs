import type { Metadata } from "next";
import Link from "next/link";

import { Card, Container, PageHeading } from "@/components/ui/layout";
import { paths } from "@/config/routes";
import { latestPosts } from "@/features/content/lib/posts";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.catalog.journalTitle };

export default async function BlogPage() {
  const posts = await latestPosts();

  return (
    <Container className="flex flex-col gap-8 py-10">
      <PageHeading title={t.catalog.journalTitle} description={t.catalog.journalDescription} />
      {posts.length === 0 ? <p className="text-ink-muted">{t.catalog.noPosts}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        {posts.map((post) => (
          <Card key={post.id} className="relative flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              <Link href={paths.post(post.slug)} className="after:absolute after:inset-0">
                {post.title}
              </Link>
            </h2>
            <p className="text-sm text-ink-muted">{post.excerpt}</p>
          </Card>
        ))}
      </div>
    </Container>
  );
}

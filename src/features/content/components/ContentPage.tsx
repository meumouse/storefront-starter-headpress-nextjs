import { notFound } from "next/navigation";

import { StoreUnavailable } from "@/components/layout/StoreUnavailable";
import { Container, PageHeading } from "@/components/ui/layout";
import { safeRead } from "@/lib/headpress/safe-read";

import { ContentBody } from "./ContentBody";

/** A post or page from WordPress, resolved by its storefront path. */
export async function ContentPage({ path }: { path: string }) {
  const result = await safeRead((hp) => hp.content.get({ path }));

  if (!result.ok) return <StoreUnavailable />;
  const post = result.data?.post;
  if (!post) notFound();

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-10">
      <PageHeading title={post.title} />
      <ContentBody html={post.content} />
    </Container>
  );
}

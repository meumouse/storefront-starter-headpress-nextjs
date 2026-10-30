import { seoMetadata } from "@meumouse.com/headpress/next";
import type { Metadata } from "next";

import { ContentPage } from "@/features/content/components/ContentPage";
import { getServerClient } from "@/lib/headpress/server";

interface CmsPageProps {
  params: Promise<{ path: string[] }>;
}

/** The `page` route of Headpress: `/{path}`, with hierarchical WordPress pages. */
function toPath(segments: string[]): string {
  return `/${segments.join("/")}`;
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  return seoMetadata(getServerClient(), { path: toPath((await params).path) });
}

export default async function CmsPage({ params }: CmsPageProps) {
  return <ContentPage path={toPath((await params).path)} />;
}

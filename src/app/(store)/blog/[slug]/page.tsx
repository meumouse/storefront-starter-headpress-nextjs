import { seoMetadata } from "@meumouse.com/headpress/next";
import type { Metadata } from "next";

import { paths } from "@/config/routes";
import { ContentPage } from "@/features/content/components/ContentPage";
import { getServerClient } from "@/lib/headpress/server";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  return seoMetadata(getServerClient(), { path: paths.post((await params).slug) });
}

export default async function PostPage({ params }: PostPageProps) {
  return <ContentPage path={paths.post((await params).slug)} />;
}

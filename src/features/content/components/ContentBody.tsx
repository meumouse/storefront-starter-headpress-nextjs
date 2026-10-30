import { cn } from "@/lib/utils";

/** HTML published from WordPress. It comes from the store's own editors, not from shoppers. */
export function ContentBody({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn("prose max-w-none text-ink-muted prose-headings:text-ink prose-a:text-brand", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

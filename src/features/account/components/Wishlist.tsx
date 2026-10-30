"use client";

import { useCapability, useHeadpress, useSignedIn } from "@meumouse.com/headpress/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { paths } from "@/config/routes";
import { ProductImage } from "@/features/catalog/components/ProductImage";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

const QUERY_KEY = ["wishlist"];

/** The heart on the product page. Guests go to sign in first. */
export function WishlistButton({ productId }: { productId: number }) {
  const hp = useHeadpress();
  const router = useRouter();
  const queryClient = useQueryClient();
  const enabled = Boolean(useCapability("wishlist"));
  const signedIn = useSignedIn();

  const wishlist = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => hp.customer.wishlist.get(),
    enabled: enabled && signedIn,
  });
  const saved = wishlist.data?.ids.includes(productId) ?? false;

  const toggle = useMutation({
    mutationFn: () => (saved ? hp.customer.wishlist.remove(productId) : hp.customer.wishlist.add(productId)),
    onSuccess: (next) => queryClient.setQueryData(QUERY_KEY, next),
  });

  if (!enabled) return null;

  const label = saved ? t.account.wishlistRemove : t.account.wishlistAdd;

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label={label}
      aria-pressed={saved}
      title={label}
      disabled={toggle.isPending}
      className="size-13"
      onClick={() => (signedIn ? toggle.mutate() : router.push(paths.login))}
    >
      <Heart className={cn(saved && "fill-current text-sale")} />
    </Button>
  );
}

export function WishlistGrid() {
  const hp = useHeadpress();
  const queryClient = useQueryClient();
  const wishlist = useQuery({ queryKey: QUERY_KEY, queryFn: () => hp.customer.wishlist.get() });

  const remove = useMutation({
    mutationFn: (id: number) => hp.customer.wishlist.remove(id),
    onSuccess: (next) => queryClient.setQueryData(QUERY_KEY, next),
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{t.account.wishlistTitle}</h1>
      {wishlist.isPending ? <Skeleton className="h-40" /> : null}
      {wishlist.isError ? <Alert tone="danger">{hp.formatError(wishlist.error)}</Alert> : null}
      {wishlist.data?.products.length === 0 ? (
        <EmptyState icon={<Heart />} title={t.account.wishlistEmpty} className="py-10" />
      ) : null}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {wishlist.data?.products.map((product) => (
          <li key={product.id} className="flex flex-col gap-2">
            <Link href={product.url ?? paths.product(product.slug)} className="flex flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-card bg-sunken">
                {product.image ? (
                  <ProductImage src={product.image} alt="" fill sizes="240px" className="object-cover" />
                ) : null}
              </div>
              <span className="text-sm font-medium">{product.name}</span>
            </Link>
            {product.price ? <span className="text-sm">{formatPrice(product.price)}</span> : null}
            <Button variant="ghost" size="sm" className="self-start" onClick={() => remove.mutate(product.id)}>
              {t.common.remove}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import type { ProductImage as ProductImageData } from "@meumouse.com/headpress";
import { useState } from "react";

import { t } from "@/i18n";
import { cn } from "@/lib/utils";

import { ProductImage } from "./ProductImage";

export function ProductGallery({ images, name }: { images: ProductImageData[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-card bg-sunken">
        {current ? (
          <ProductImage
            src={current.src}
            alt={current.alt || name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={t.catalog.galleryThumbnail(index + 1)}
              aria-current={index === active ? "true" : undefined}
              onClick={() => setActive(index)}
              className={cn(
                "relative size-18 overflow-hidden rounded-control border-2 bg-sunken transition-colors",
                index === active ? "border-brand" : "border-transparent hover:border-line-strong",
              )}
            >
              <ProductImage src={image.thumbnail || image.src} alt="" fill sizes="72px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

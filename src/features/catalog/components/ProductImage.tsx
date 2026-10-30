import Image, { type ImageProps } from "next/image";

/** `next/image` refuses to optimize SVG, which the demo catalog uses. */
export function ProductImage({ src, alt, ...props }: ImageProps & { src: string }) {
  return <Image src={src} alt={alt} unoptimized={new URL(src).pathname.endsWith(".svg")} {...props} />;
}

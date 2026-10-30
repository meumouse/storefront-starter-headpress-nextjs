/** Pages whose URL carries a Sellback token. Keep in step with `STOREFRONT_ROUTES`. */
const TOKEN_PATH = /^\/(cart\/recover|unsubscribe)\/[^/?#]+/;

/** Tokens must not reach page views or order attribution. */
export function isSellbackTokenPath(pathname: string): boolean {
  return TOKEN_PATH.test(pathname);
}

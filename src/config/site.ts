/**
 * Facts about this store that WordPress does not publish. The store name and language come from
 * the Headpress config at runtime; `name` is only the fallback while WordPress is unreachable.
 */
export const siteConfig = {
  name: "Headpress Starter",
  /** Menu location in WordPress for the header; the product categories stand in when it is empty. */
  headerMenu: "primary",
  footerMenu: "footer",
  catalog: {
    perPage: 12,
    /** Attribute taxonomies offered as filters on listings. */
    filterAttributes: ["pa_color", "pa_size"],
  },
} as const;

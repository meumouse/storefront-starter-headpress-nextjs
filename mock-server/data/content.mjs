/** Demo posts, pages and menus, in the shape of `GET /headpress/v1/store/content`. */
const body = (...paragraphs) => paragraphs.map((text) => `<p>${text}</p>`).join("");

const base = {
  type: "page",
  status: "publish",
  protected: false,
  date: "2026-09-01T12:00:00",
  modified: "2026-09-01T12:00:00",
  parent_id: 0,
  template: "",
  author: { id: 1, name: "Kestrel team" },
  featured_image: null,
  terms: {},
  preview: false,
};

export const pages = [
  {
    ...base,
    id: 1,
    slug: "about",
    path: "/about",
    title: "About",
    excerpt: "",
    content: body(
      "Kestrel &amp; Co. is a demo store. Everything here comes from a mock WordPress that speaks the Headpress contract.",
      "Point the storefront at a real WordPress and this page becomes yours, edited in the block editor.",
    ),
  },
  {
    ...base,
    id: 2,
    slug: "privacy",
    path: "/privacy",
    title: "Privacy policy",
    excerpt: "",
    content: body("This page holds the store's privacy policy, published from WordPress."),
  },
  {
    ...base,
    id: 3,
    slug: "terms",
    path: "/terms",
    title: "Terms and conditions",
    excerpt: "",
    content: body("This page holds the store's terms, published from WordPress."),
  },
];

export const posts = [
  {
    ...base,
    id: 11,
    type: "post",
    slug: "caring-for-linen",
    path: "/blog/caring-for-linen",
    title: "Caring for linen",
    excerpt: "Three habits that keep linen soft for years.",
    date: "2026-10-02T12:00:00",
    content: body(
      "Linen rewards a little patience. Wash it cool, skip the softener and let it dry in the shade.",
      "Each wash relaxes the fibers, which is why an old linen throw feels better than a new one.",
    ),
  },
  {
    ...base,
    id: 12,
    type: "post",
    slug: "a-desk-that-works",
    path: "/blog/a-desk-that-works",
    title: "A desk that works",
    excerpt: "Fewer objects, better light, and one good notebook.",
    date: "2026-09-18T12:00:00",
    content: body(
      "A good desk has fewer things on it than you expect. Start with the light, then the chair, then the tools.",
    ),
  },
];

export const menus = {
  primary: {
    id: 1,
    name: "Primary",
    slug: "primary",
    location: "primary",
    items: [
      { id: 1, title: "Shop", url: "/shop", path: "/shop" },
      { id: 2, title: "Home", url: "/category/home", path: "/category/home" },
      { id: 3, title: "Apparel", url: "/category/apparel", path: "/category/apparel" },
      { id: 4, title: "Desk", url: "/category/desk", path: "/category/desk" },
      { id: 5, title: "Journal", url: "/blog", path: "/blog" },
    ],
  },
  footer: {
    id: 2,
    name: "Footer",
    slug: "footer",
    location: "footer",
    items: [
      { id: 6, title: "About", url: "/about", path: "/about" },
      { id: 7, title: "Privacy policy", url: "/privacy", path: "/privacy" },
      { id: 8, title: "Terms and conditions", url: "/terms", path: "/terms" },
    ],
  },
};

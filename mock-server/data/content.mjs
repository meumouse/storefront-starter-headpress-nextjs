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
  author: { id: 1, name: "Volt & Wire team" },
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
      "Volt &amp; Wire is a demo electronics store. Everything here comes from a mock WordPress that speaks the Headpress contract.",
      "The brands and models are made up. Point the storefront at a real WordPress and this page becomes yours, edited in the block editor.",
    ),
  },
  {
    ...base,
    id: 2,
    slug: "shipping-and-returns",
    path: "/shipping-and-returns",
    title: "Shipping and returns",
    excerpt: "",
    content: body(
      "Orders above R$ 299 ship for free. Orders paid by 2 pm on a business day leave the same day.",
      "You have 7 days from delivery to return a product, in its original box. Defects are covered by the manufacturer's warranty.",
    ),
  },
  {
    ...base,
    id: 3,
    slug: "privacy",
    path: "/privacy",
    title: "Privacy policy",
    excerpt: "",
    content: body("This page holds the store's privacy policy, published from WordPress."),
  },
  {
    ...base,
    id: 4,
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
    slug: "choosing-a-laptop",
    path: "/blog/choosing-a-laptop",
    title: "Choosing a laptop for work and play",
    excerpt: "Screen, battery and memory: the three numbers that decide whether you will like it in a year.",
    date: "2026-11-10T12:00:00",
    content: body(
      "Start with the screen you will look at all day: brightness above 400 nits and a resolution that keeps text sharp.",
      "Then the battery. A laptop that lasts a full working day changes where you can work.",
      "Finally, memory. 16 GB is the comfortable minimum today, and it is rarely upgradable later.",
    ),
  },
  {
    ...base,
    id: 12,
    type: "post",
    slug: "robot-vacuum-checklist",
    path: "/blog/robot-vacuum-checklist",
    title: "Five things to check before buying a robot vacuum",
    excerpt: "Mapping, suction, height, noise and the cost of spare parts.",
    date: "2026-10-28T12:00:00",
    content: body(
      "A robot that maps the house cleans in lines instead of bouncing around. Check the height too: it should pass under the sofa.",
      "Look up the price of brushes and filters before buying. You will replace them every few months.",
    ),
  },
  {
    ...base,
    id: 13,
    type: "post",
    slug: "moving-to-a-new-phone",
    path: "/blog/moving-to-a-new-phone",
    title: "Moving to a new phone without losing anything",
    excerpt: "Backups, two-factor apps and the chats people always forget.",
    date: "2026-10-14T12:00:00",
    content: body(
      "Make a full backup the day before, and check it finished. Then move your two-factor app first: it is the one that locks you out.",
      "Chat apps keep their own backups. Run them by hand before you switch.",
    ),
  },
  {
    ...base,
    id: 14,
    type: "post",
    slug: "smartwatch-buying-guide",
    path: "/blog/smartwatch-buying-guide",
    title: "Smartwatch buying guide",
    excerpt: "Battery life, sensors and which phone it works with.",
    date: "2026-09-30T12:00:00",
    content: body(
      "Decide first what you want it for: workouts need GPS and a good heart-rate sensor, notifications need a bright screen.",
      "Battery ranges from one day to two weeks. A watch you must charge every night is a watch you stop wearing.",
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
      { id: 2, title: "Smartphones", url: "/category/smartphones", path: "/category/smartphones" },
      { id: 3, title: "Laptops", url: "/category/laptops-tablets", path: "/category/laptops-tablets" },
      { id: 4, title: "Gaming", url: "/category/gaming", path: "/category/gaming" },
      { id: 5, title: "TV & Audio", url: "/category/tv-audio", path: "/category/tv-audio" },
      { id: 6, title: "Deals", url: "/tag/hot-deal", path: "/tag/hot-deal" },
      { id: 7, title: "Journal", url: "/blog", path: "/blog" },
    ],
  },
  footer: {
    id: 2,
    name: "Footer",
    slug: "footer",
    location: "footer",
    items: [
      { id: 8, title: "About", url: "/about", path: "/about" },
      { id: 9, title: "Shipping and returns", url: "/shipping-and-returns", path: "/shipping-and-returns" },
      { id: 10, title: "Privacy policy", url: "/privacy", path: "/privacy" },
      { id: 11, title: "Terms and conditions", url: "/terms", path: "/terms" },
    ],
  },
};

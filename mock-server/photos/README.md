# Demo product photos

The mock WordPress draws every product unless it finds a photo for it here. Photos stay out of Git:
use only photos you have the right to show, and keep them on the machines that run your demo.

Two ways to add them, by product slug (see `mock-server/data/products.mjs`):

- **Files:** `<slug>-<n>.jpg` (or `.jpeg`, `.png`, `.webp`), for example `nova-x15-1.jpg` and
  `nova-x15-2.jpg`. `n` sets the order in the gallery.
- **Links:** a `photos.json` that maps slugs to URLs. The mock fetches each photo once and serves it
  itself, so the storefront only ever talks to the mock.

  ```json
  {
    "nova-x15": ["https://example.com/photos/phone-front.jpg", "https://example.com/photos/phone-back.jpg"]
  }
  ```

Files win over links. Changes show on the next request, with no restart.

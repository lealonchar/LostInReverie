# Lost In Reverie Website

Lost In Reverie is a band website with a public fan-facing page and a separate admin management panel. The site is organized around shows, news, music releases, merch, and order requests.

## Public Page

The public page opens with the Lost In Reverie logo and a dark red visual theme. Navigation is split into four tabs:

- **Shows** lists upcoming shows by date, time, and location. A show title can be added, but it is not required.
- **News** lists published band posts and announcements.
- **Music** lists released albums, EPs, and singles with cover art, release type, and year. Opening a release shows listening links and an embedded player when supported by the platform link.
- **Merch** shows active merch items in a clean grid. Opening an item shows its gallery, details, available sizes, stock-aware size selection, and an order request button.

## Admin Panel

The admin panel is separate from the regular page and is opened through the admin route. It requires authorization before the management panel is shown.

Admin sections:

- **Shows** adds and removes upcoming shows.
- **Posts** adds and removes news posts.
- **Music** adds and removes music releases, including cover uploads, year, release type, main listening link, optional embed link, and platform links.
- **Merch** adds, edits, and removes merch items. Merch supports local image uploads, multiple images, drag-to-reorder galleries, fixed T-shirt sizes from S to XXL, and stock per size.
- **Orders** shows order requests with item image, item name, selected size, customer information, and order details. Orders start as pending, can be marked completed, and can be deleted if needed.

## Merch Orders

The site does not take payments directly. Merch checkout is an order request flow:

- Visitors choose an item and size.
- Sizes with zero stock are disabled.
- The visitor submits their name and at least one contact method.
- Admin can review the order later.
- Completing an order lowers stock for the ordered size.

## Music Releases

Music releases are designed to link out to existing listening platforms. Spotify and YouTube links can be displayed as embedded players where possible. Other platforms can still be added as buttons, such as Bandcamp, Apple Music, SoundCloud, or any other release link.

## Data Managed By The Site

The site currently manages:

- Shows
- News posts
- Music releases
- Merch items and images
- Merch stock by size
- Order requests

Uploaded images are used for merch galleries and music release covers.

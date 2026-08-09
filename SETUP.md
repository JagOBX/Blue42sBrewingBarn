# Setting up the admin page

This site now has a hidden `/admin` page where the owner can update the
Events section (the featured event and the three event cards) and the
entire Menu page, all without touching any code. It works by editing two
small data files, `data/events.json` and `data/menu.json`, which the
Events and Menu pages load automatically.

Because you're starting on Netlify and moving to a GitHub repo later,
this uses Netlify's own git-based CMS (Decap CMS, formerly "Netlify CMS").
It's free, requires no server of your own, and every save is a real,
reversible commit to your repo.

## One-time setup (about 10 minutes)

1. **Push this folder to a GitHub repository.** Netlify's git-based
   editing (Git Gateway) requires the site to be deployed from a git repo,
   not just dragged in as a static folder. This lines up with your plan
   to move to GitHub anyway, so it's worth doing now.

2. **Connect that repo to Netlify** (Site settings > Build & deploy > Link
   repository, or create a new Netlify site "Import from Git"). No build
   command is needed. Publish directory is the repo root (`.`).

3. **Turn on Netlify Identity**: Site settings > Identity > Enable Identity.

4. **Set registration to "Invite only"**: Identity > Registration
   preferences > Invite only. This keeps random visitors from signing up
   at `/admin`.

5. **Enable Git Gateway**: Identity > Services > Git Gateway > Enable Git
   Gateway. This is what lets a logged-in admin save changes straight to
   the GitHub repo.

6. **Invite the person who'll manage events**: Identity > Invite users >
   enter their email. They'll get an email with a link that sets their
   password and logs them in.

That's it. From then on, they go to `https://yoursite.netlify.app/admin`,
log in, and see:

- An "Events Page" section with plain fields: intro text, the featured
  event, and a list of the other event cards, with buttons to add,
  remove, and reorder them.
- A "Menu Page" section with a list of menu tabs (Coffee & Frappes,
  Smoothies & Whirzles, Beer & Wine, Food & Sweets). Each tab has a name,
  an optional note, and a list of items (name, description, price), with
  buttons to add, remove, and reorder both tabs and items.

Saving publishes a commit, and Netlify rebuilds the live site
automatically, usually within a minute.

## Where things live

The site is now split into separate pages instead of one long scrolling
page:

- `index.html` - home page. Hero + Our Story + a short "what we pour"
  teaser. "Our Story" is intentionally not in the top navigation anymore;
  it only lives here on the home page.
- `menu.html`, `hours.html`, `events.html`, `gallery.html` - one page per
  section, linked from the top nav in that order (Menu, Hours & Location,
  Events, Gallery).
- `images/` - all photos used across the pages, organized by purpose:
  `images/brand/` (logo), `images/hero/` (homepage hero photo),
  `images/about/` (Our Story section photo), `images/gallery/` (the six
  Gallery page photos), and `images/uploads/` (where the admin panel
  drops any new photos uploaded through the CMS going forward). These
  are normal image files rather than embedded in the HTML, which keeps
  each page's file size small since a photo is only downloaded once and
  reused, not duplicated per page.
- `events.html` reads its content from `data/events.json` at load time,
  and `menu.html` reads its content from `data/menu.json` at load time.
  If either file can't be fetched (for example if someone opens the page
  directly from their computer instead of visiting the live site), the
  page falls back to the content that's hardcoded in the HTML, so it
  never shows blank.
- `data/events.json` and `data/menu.json` - the actual event and menu
  content. These are the files the admin page edits.
- `admin/index.html` and `admin/config.yml` - the CMS itself. Not linked
  from anywhere in the site's navigation (that's the "hidden" part), and
  `robots.txt` / a response header both tell search engines to ignore it.
  It's still reachable by anyone who knows the URL and has been invited;
  it is not secret, just unlisted.

## Password gate on /admin

Before the login screen even loads, `/admin` now asks for a shared
password (set in admin/index.html). Enter it once per browser tab and it
won't ask again until that tab is closed.

Important: this is a light deterrent, not real security. It's a plain
JavaScript check in `admin/index.html` - anyone who views the page's
source can read the password out directly, and there's no way to fully
hide a value that has to live in code the browser downloads. Its only
job is to keep casual visitors from stumbling onto the CMS login screen.

The actual access control is still Netlify Identity + Git Gateway,
covered above: only people you've explicitly invited can log in and
save changes, regardless of who knows the front-gate password. Don't
treat the gate password as something that needs to stay truly secret -
treat the Identity invite list as the real boundary.

To change the gate password, open `admin/index.html` and edit the
`GATE_PASSWORD` value near the top of the script.

## Notes

- The admin page can only ever edit `data/events.json` and
  `data/menu.json`. It has no access to the rest of the site, so there's
  no risk of someone accidentally breaking the hours, gallery, or design.
- If you'd like the same kind of self-service editing added for other
  sections later (Hours & Location, for example), the same pattern
  extends cleanly, just more fields in `config.yml` pointing at another
  small JSON file.

## SEO

Every page now carries the basics search engines and social previews look
for:

- A unique, descriptive `<title>` and meta description per page.
- A canonical URL, Open Graph tags, and a Twitter Card, so links shared
  on Facebook/Instagram/iMessage/Slack/etc. show a proper title,
  description, and preview photo instead of a bare link.
- One JSON-LD "structured data" block per page with the business's name,
  address, phone, price range, hours, and social links, so Google can
  show this as a proper local business listing (hours, map pin, etc.)
  rather than just a blue link.
- A single, real `<h1>` on every page (this was previously missing on
  everything but the homepage).
- `sitemap.xml` listing all five pages, referenced from `robots.txt`, so
  search engines can discover and prioritize them.
- A favicon (using your logo) for browser tabs and bookmarks.
- The six Gallery photos are now real `<img>` tags with descriptive alt
  text (they were CSS background images before, which search engines
  mostly don't index), plus `loading="lazy"` so they don't slow down the
  initial page load.

**Important - the domain is a placeholder.** All of this (canonical URLs,
Open Graph links, the structured data, `sitemap.xml`) was built using
`https://www.blue42sbrewingbarn.com` as a stand-in. Once the site is live
on its real domain, search-and-replace that placeholder for the actual
one across every `.html` file, `sitemap.xml`, and `robots.txt`, or ask
whoever's helping you deploy it to do a find-and-replace pass.

**Optional next step - Google Business Profile.** The structured data
covers what your website itself can tell search engines, but the single
biggest lever for a local business showing up in Google Maps and "near
me" searches is claiming and filling out a free Google Business Profile
(business.google.com) - that's a separate step from anything on the
website itself.

**Smaller thing worth knowing about:** the Events page doesn't emit
"Event" structured data (the kind that can show a date/time snippet
directly in Google search results), because `data/events.json` doesn't
currently store real dates - just labels like "Weekly, Saturdays". If
that's worth having later, it would mean adding an actual date field to
the Events admin form so each event has a real start date to publish.

## 404 page

`404.html` is a branded "page not found" screen (same header, footer, and
look as the rest of the site) that links back to the homepage and the
main sections. Netlify automatically serves this file for any URL on the
site that doesn't exist - no configuration needed, it just has to be
named `404.html` and live at the root of the site, which it does. It's
marked `noindex` so search engines don't try to list it as a real page.

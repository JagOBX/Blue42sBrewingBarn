# Blue 42's Brewing Barn — website

Static site for Blue 42's Brewing Barn (Moyock, NC): craft beer, coffee,
wine, and homemade fudge. No build step — plain HTML/CSS/JS, deployed
as-is to Netlify.

## Pages

- `index.html` — home (hero, Our Story, "what we pour" teaser)
- `menu.html` — full menu, editable via `/admin`
- `hours.html` — hours & location
- `events.html` — events, editable via `/admin`
- `gallery.html` — photo gallery
- `404.html` — not-found page

## Content that's editable without touching code

- `data/events.json` — events section content
- `data/menu.json` — menu content

Both are edited through the hidden `/admin` page (Decap CMS), once
Netlify Identity and Git Gateway are set up for this repo. See
`SETUP.md` for the full one-time setup walkthrough.

## Everything else

See `SETUP.md` for deployment setup, the `/admin` password gate, SEO
notes, and what still needs the real production domain swapped in.

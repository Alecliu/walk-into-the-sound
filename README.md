# Walk into the sound

A Traditional Chinese music journal: 20 source-linked stories across film scores, lyrical places, records and objects, and live encounters.

## Website

https://alecliu.github.io/walk-into-the-sound/

## Content

- Four columns with five complete stories each.
- Cascading city, neighborhood and place filters.
- Article sources, timelines, maps, YouTube and Spotify links.
- Existing daily scans and discovery radar in the secondary navigation.

## Updating

The verified static release is stored in `site/`. GitHub Pages publishes that directory through `.github/workflows/pages.yml`.

Authoring code is in `src/content/`; reviewed stories and music data are in `src/data.json`. Follow `AGENTS.md` for content boundaries and the installed Data plugin build command. After a verified build, replace `site/` with the complete contents of `dist/`, retaining `.nojekyll`, then commit.

Image credits and licenses are in `src/content/assets/story-photos/`. Fonts, photos and third-party components retain their respective licenses. Editorial notes and verification evidence are in `editorial/`.

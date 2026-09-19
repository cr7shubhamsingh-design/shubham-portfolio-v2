# Cursor trail images

Drop image files in this folder and they become the cursor trail in the bio
section. Nothing else feeds it — if this folder is empty, the trail does not
run at all.

- **Formats:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`
- **Order:** filename order, so prefix with `01-`, `02-` … to control the cycle
- **Shape:** they render in a 180px square, cropped to fill — square-ish images
  crop most predictably
- **How many:** one is enough; more means fewer repeats before the cycle loops

No config to edit. `npm run dev` picks up new files straight away; a deploy
needs the usual build.

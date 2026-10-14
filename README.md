# Pamoditha's Birthday Journey ✈️

A full-screen world map, a plane, four stops. Open `index.html` in a browser to try it
(works straight from the folder, no server or build step).

## Put it online so she can open it on her phone
Drag this whole folder onto https://app.netlify.com/drop (or use GitHub Pages / Cloudflare Pages).
You get a link to send her. Keep the folder structure as it is.

## Swap in your own media (everything is in `media/`)
Keep the file names and just replace the files (or change the names in `config.js`).

| File | What it is |
|---|---|
| `stop1-forest.mp4` + `stop1-poster.jpg` | Stop 1 background video (misty forest / cosy library) + still image shown while loading |
| `stop1-photo1.jpg` `stop1-photo2.jpg` `stop1-photo3.jpg` | Stop 1 polaroids (open books, reading nooks, YOUR photos of her) |
| `stop2-sea.mp4` + `stop2-poster.jpg` | Stop 2 (ocean waves, ships, fish) |
| `stop2-photo1..3.jpg` | Stop 2 polaroids (coastlines, maps) |
| `stop3-mountains.mp4` + `stop3-poster.jpg` | Stop 3 (mountains and clouds) |
| `stop3-photo1..3.jpg` | Stop 3 polaroids (hot-air balloons) |
| `stop4-island.mp4` + `stop4-poster.jpg` | Stop 4 (tropical island, fireworks, celebration) |
| `stop4-photo1..3.jpg` | Stop 4 polaroids |
| `birthday-music.mp3` | Looping music (button is off by default) |

The files currently in `media/` are generated placeholders (simple illustrations with no text on them).

### Photos
Any shape works (they are cropped to a square in the polaroid). ~800 px wide, JPG, under ~150 KB each is plenty.
To use only 2 photos at a stop, delete the third entry in that stop's `photos` list in `config.js`.

### Videos (muted, looping, silent, small)
Free stock footage: pexels.com/videos, pixabay.com/videos, coverr.co. Search ideas:
`misty forest`, `cozy library`, `ocean waves ship`, `mountains clouds timelapse`, `tropical island fireworks`.
Compress each clip so it loads fast on mobile data (about 6-10 seconds, 720p, no audio, under ~1.5 MB):

    ffmpeg -i input.mp4 -an -t 8 -vf "scale=-2:720,fps=24" -c:v libx264 -crf 29 -preset slow \
           -pix_fmt yuv420p -movflags +faststart stop1-forest.mp4

Make the poster (a frame from the video):

    ffmpeg -i stop1-forest.mp4 -ss 1 -frames:v 1 -vf scale=720:-2 -q:v 4 stop1-poster.jpg

Tip: the video is cropped to fill the screen (on a phone, the middle of the picture is what shows),
so keep the interesting part centred. If a video is missing, the poster image shows instead.

## Change the words, places and colours
Everything is in `config.js`: messages, titles, polaroid captions, emoji bursts, theme colours,
and the real latitude/longitude of each stop (the plane flies between whatever coordinates you put there).
`span` = how many degrees wide the zoomed-in view is at that stop.

Current route: Colombo (departure) -> Oxford -> Amalfi Coast -> Cappadocia -> The Maldives.

## Good to know
- Fonts (Pacifico, Quicksand, Caveat, DM Mono) load from Google Fonts, so they need internet; there are fallbacks.
- Phones don't allow sound until she taps the music button, so it is off by default.
- With "Reduce motion" turned on in the phone/computer settings, the flights become instant fades,
  videos are not played (posters only), and there are no trails or confetti animations.
- If "Data Saver" is on in her browser, videos are skipped and posters are used.

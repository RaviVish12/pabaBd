/* ============================================================
   EDIT ME - all the words, places and file names live here.
   Photos / videos: just replace the files in media/ and keep
   the same names (or change the names below).
   ============================================================ */

/* Where the pictures / videos / music live.
   "media/" = inside a media folder.   ""  = in the same folder as index.html
   (use "" if you can't upload folders, e.g. to GitHub from a phone or browser). */
var MEDIA = "";
window.JOURNEY = {
  name: "Pamoditha",
  age: 22,
  musicFile: MEDIA + "birthday-music.mp3",

  /* Where the plane takes off from (the "Boarding" screen). */
  start: {
    place: "Departure Gate",
    lat: 6.9271, lon: 79.8612,                 // Colombo, Sri Lanka
    title: "Pamoditha's Birthday Journey",
    message: "One plane, four stops and one very special 22nd birthday. Buckle up, tap take off, and let's go see the world!",
    emoji: ["✈️", "🌍", "✨", "💖", "🎒", "🧭"],
    stamps: [
      { emoji: "🎒", caption: "bags packed" },
      { emoji: "🧭", caption: "map ready" },
      { emoji: "💖", caption: "good vibes" }
    ]
  },

  /* The four stops. lat/lon are real places - change them freely. */
  stops: [
    {
      id: "library",
      tag: "Stop 1 · Forest & Land",
      title: "The Library",
      place: "Oxford, England",
      lat: 51.7548, lon: -1.2544,              // Bodleian Library area
      span: 20,                                // how many degrees wide the zoomed-in view is
      message: "Chapter 22 starts today. You find whole worlds between the pages, and you carry that curiosity everywhere. May this year read like your favourite story: big adventures, perfect plot twists and a very happy ending.",
      emoji: ["📚", "🌸", "🍂", "🌲", "💗", "✨"],
      video: MEDIA + "stop1-forest.mp4",
      poster: MEDIA + "stop1-poster.jpg",
      photos: [
        { src: MEDIA + "stop1-photo1.jpg", caption: "chapter one", alt: "An open book" },
        { src: MEDIA + "stop1-photo2.jpg", caption: "cosy corner", alt: "A cosy reading nook" },
        { src: MEDIA + "stop1-photo3.jpg", caption: "to-be-read", alt: "A tall stack of books" }
      ]
    },
    {
      id: "fieldtrip",
      tag: "Stop 2 · The Sea",
      title: "The Field Trip",
      place: "Amalfi Coast, Italy",
      lat: 40.6333, lon: 14.6029,
      span: 16,
      message: "Every great map begins with someone curious enough to go and look. From coastlines to contour lines, you read the world the way other people read a favourite novel. Here's to calm seas and the tide always turning your way.",
      emoji: ["🌊", "🐠", "🚢", "🐚", "🗺️", "💙"],
      video: MEDIA + "stop2-sea.mp4",
      poster: MEDIA + "stop2-poster.jpg",
      photos: [
        { src: MEDIA + "stop2-photo1.jpg", caption: "coastlines", alt: "A sandy coastline" },
        { src: MEDIA + "stop2-photo2.jpg", caption: "x marks it", alt: "An old map with a route" },
        { src: MEDIA + "stop2-photo3.jpg", caption: "ship ahoy!", alt: "A ship and fish at sea" }
      ]
    },
    {
      id: "coordinates",
      tag: "Stop 3 · Mountains & Sky",
      title: "Coordinates, Age 22",
      place: "Cappadocia, Türkiye",
      lat: 38.6431, lon: 34.8289,
      span: 12,
      message: "Today's coordinates: age 22, altitude sky-high. Everything looks different from up here: wide, golden and full of places you haven't been yet. Keep climbing, and never stop looking up.",
      emoji: ["🎈", "⛰️", "☁️", "🌅", "🧡", "✨"],
      video: MEDIA + "stop3-mountains.mp4",
      poster: MEDIA + "stop3-poster.jpg",
      photos: [
        { src: MEDIA + "stop3-photo1.jpg", caption: "up & away", alt: "Colourful hot-air balloons" },
        { src: MEDIA + "stop3-photo2.jpg", caption: "above it all", alt: "A mountain at sunset" },
        { src: MEDIA + "stop3-photo3.jpg", caption: "cloud nine", alt: "Fluffy clouds" }
      ]
    },
    {
      id: "island",
      tag: "Final Stop · Paradise",
      title: "Birthday Island",
      place: "The Maldives",
      lat: 4.1755, lon: 73.5093,                // Malé atoll
      span: 13,
      final: true,
      headline: "Happy 22nd Birthday, Pamoditha!",
      message: "You made it to the island! Sunshine, sparkle and everyone who loves you are waiting. Thank you for being such a bright spot on everybody's map. Make a wish, then pop the confetti!",
      emoji: ["🎉", "🏝️", "🎆", "🥳", "💖", "🌴"],
      video: MEDIA + "stop4-island.mp4",
      poster: MEDIA + "stop4-poster.jpg",
      photos: [
        { src: MEDIA + "stop4-photo1.jpg", caption: "paradise", alt: "A tropical island" },
        { src: MEDIA + "stop4-photo2.jpg", caption: "fireworks!", alt: "Fireworks in the night sky" },
        { src: MEDIA + "stop4-photo3.jpg", caption: "make a wish", alt: "A birthday cake with candles" }
      ]
    }
  ],

  /* Map + UI colours per stop: [accent, accent2, deep tone] */
  themes: [
    { accent: "#ff7eb6", accent2: "#ffd0e6", deep: "#5b1a4a" },   // rose, plum, pink
    { accent: "#2fe3d0", accent2: "#b8fff6", deep: "#04485a" },   // turquoise, aqua
    { accent: "#ffb347", accent2: "#ff7a6b", deep: "#6b2a2a" },   // sunset gold, coral
    { accent: "#ff4fa3", accent2: "#3ff2e0", deep: "#3a0f55" }    // bright pink + aqua
  ],
  introTheme: { accent: "#ff9ad0", accent2: "#8ff3ea", deep: "#2b1450" }
};

/* ============================================================
   Pamoditha's Birthday Journey - map, camera, plane, effects
   Plain JavaScript, no build step, no libraries.
   Texts / places / file names are in config.js
   ============================================================ */
(function () {
  "use strict";

  var J = window.JOURNEY, WORLD = window.WORLD;
  var $ = function (id) { return document.getElementById(id); };
  var TAU = Math.PI * 2;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrapNear(lon, ref) { return lon + 360 * Math.round((ref - lon) / 360); }
  function hexRGB(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mixRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgba(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; }
  function fmtLat(v) { return Math.abs(v).toFixed(4) + "° " + (v >= 0 ? "N" : "S"); }
  function fmtLon(v) { v = ((v + 180) % 360 + 360) % 360 - 180; return Math.abs(v).toFixed(4) + "° " + (v >= 0 ? "E" : "W"); }
  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371, d2r = Math.PI / 180;
    var dLat = (lat2 - lat1) * d2r, dLon = (lon2 - lon1) * d2r;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /* ---------- reduced motion + data saver ---------- */
  var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = rmq.matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  function onRM(e) { reduced = e.matches; if (reduced) pauseAllVideos(); else playVideo(curBg); kick(); }
  if (rmq.addEventListener) rmq.addEventListener("change", onRM); else if (rmq.addListener) rmq.addListener(onRM);

  /* ---------- places: 0 = departure, 1..4 = the stops ---------- */
  var places = [{
    idx: 0, title: J.start.title, place: J.start.place, lat: J.start.lat, lon: J.start.lon, span: 64,
    emoji: J.start.emoji, theme: J.introTheme, isStart: true
  }];
  J.stops.forEach(function (s, i) {
    var o = {}; for (var k in s) o[k] = s[k];
    o.idx = i + 1; o.theme = J.themes[i]; places.push(o);
  });
  places.forEach(function (p, i) {   // unwrap longitudes so each leg takes the short way round
    p.ulon = i === 0 ? p.lon : wrapNear(p.lon, places[i - 1].ulon);
  });
  var LAST = places.length - 1;

  /* ---------- DOM ---------- */
  var body = document.body;
  var bgEl = $("bg"), mapC = $("map"), fxC = $("fx");
  var mctx = mapC.getContext("2d"), fctx = fxC.getContext("2d");
  var elLat = $("lat"), elLon = $("lon"), elTogo = $("togo"), elTogoK = $("togoK");
  var cardEl = $("card"), actionsEl = $("actions"), polEl = $("polaroids");
  var nextBtn = $("nextBtn"), finalActions = $("finalActions");
  var panelEl = $("panel"), progEl = $("progress"), live = $("live");

  /* ---------- state ---------- */
  var W = 0, H = 0, dpr = 1, isLand = false;
  var cur = 0;                         // current place index
  var flying = false, flight = null;
  var cam = { lon: places[0].ulon, lat: places[0].lat, scale: 6 };
  var focal = { x: 0, y: 0 }, focalT = { x: 0, y: 0 };
  var freeW = 0;
  var heading = -0.35;                  // plane heading (radians, screen space)
  var legProg = [0, 0, 0, 0, 0];       // how much of each leg has been flown
  var theme = { accent: hexRGB(J.introTheme.accent), accent2: hexRGB(J.introTheme.accent2) };
  var particles = [];                   // sparkle trail (world space)
  var fxItems = [];                     // emoji + confetti (screen space)
  var lastT = 0, running = false, clock = 0;
  var curBg = -1;

  /* ---------- legs (curved routes) ---------- */
  function makeLeg(a, b) {
    var p0 = { x: a.ulon, y: a.lat };
    var p1 = { x: wrapNear(b.lon, a.ulon), y: b.lat };
    var dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    if (ny < 0) { nx = -nx; ny = -ny; }                   // bulge towards the north
    var bulge = len * 0.27;
    var c = { x: (p0.x + p1.x) / 2 + nx * bulge, y: clamp((p0.y + p1.y) / 2 + ny * bulge, -70, 78) };
    var leg = { p0: p0, p1: p1, c: c, len: len };
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (var i = 0; i <= 24; i++) {
      var q = bez(leg, i / 24);
      minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y);
    }
    leg.box = { minx: minx, maxx: maxx, miny: miny, maxy: maxy };
    leg.mid = { x: (minx + maxx) / 2, y: (miny + maxy) / 2 };
    return leg;
  }
  function bez(l, t) {
    var u = 1 - t;
    return { x: u * u * l.p0.x + 2 * u * t * l.c.x + t * t * l.p1.x, y: u * u * l.p0.y + 2 * u * t * l.c.y + t * t * l.p1.y };
  }
  function bezD(l, t) {
    var u = 1 - t;
    return { x: 2 * u * (l.c.x - l.p0.x) + 2 * t * (l.p1.x - l.c.x), y: 2 * u * (l.c.y - l.p0.y) + 2 * t * (l.p1.y - l.c.y) };
  }
  var legs = [null];
  for (var li = 1; li <= LAST; li++) legs.push(makeLeg(places[li - 1], places[li]));

  /* ---------- world paths ---------- */
  var landPath = new Path2D();
  WORLD.land.concat(WORLD.lakes).forEach(function (ring) {
    ring.forEach(function (pt, i) { if (i === 0) landPath.moveTo(pt[0], pt[1]); else landPath.lineTo(pt[0], pt[1]); });
    landPath.closePath();
  });

  /* ---------- background layers ---------- */
  var layers = [];
  (function buildBg() {
    var intro = document.createElement("div");
    intro.className = "bg__layer bg__layer--intro is-on";
    bgEl.appendChild(intro);
    layers.push({ el: intro, video: null });
    J.stops.forEach(function (s, i) {
      var th = J.themes[i];
      var el = document.createElement("div");
      el.className = "bg__layer";
      el.style.backgroundImage = "linear-gradient(180deg," + th.accent + "," + th.deep + ")";
      var img = new Image(); img.src = s.poster;
      img.onload = function () { el.style.backgroundImage = "url('" + s.poster + "')"; };
      var v = document.createElement("video");
      v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
      v.setAttribute("aria-hidden", "true"); v.setAttribute("disablepictureinpicture", "");
      v.disableRemotePlayback = true;
      v.preload = "none"; v.poster = s.poster; v.tabIndex = -1;
      v.addEventListener("error", function () { v.style.display = "none"; });
      var tint = document.createElement("div");
      tint.className = "bg__tint";
      tint.style.background =
        "radial-gradient(130% 55% at 50% 12%," + th.accent + "38,transparent 65%)," +
        "linear-gradient(180deg," + th.deep + "59 0%," + th.deep + "8c 45%," + th.deep + "e0 100%)";
      el.appendChild(v); el.appendChild(tint); bgEl.appendChild(el);
      layers.push({ el: el, video: v, src: s.video, loaded: false });
    });
  })();
  function loadVideo(i) {
    var L = layers[i]; if (!L || !L.video || L.loaded || reduced || saveData) return;
    L.loaded = true; L.video.preload = "auto"; L.video.src = L.src; L.video.load();
  }
  function playVideo(i) {
    var L = layers[i]; if (!L || !L.video || reduced || saveData) return;
    loadVideo(i);
    var pr = L.video.play(); if (pr && pr.catch) pr.catch(function () {});
  }
  function pauseAllVideos() { layers.forEach(function (L) { if (L.video) L.video.pause(); }); }
  function showBg(i) {
    if (i === curBg) return;
    var prev = curBg; curBg = i;
    playVideo(i);
    layers.forEach(function (L, k) { L.el.classList.toggle("is-on", k === i); });
    if (prev >= 0 && layers[prev] && layers[prev].video) {
      setTimeout(function () { if (curBg !== prev && layers[prev].video) layers[prev].video.pause(); }, 1800);
    }
  }

  /* ---------- theme ---------- */
  function applyTheme(th) {
    var r = document.documentElement.style;
    r.setProperty("--accent", th.accent); r.setProperty("--accent2", th.accent2);
    r.setProperty("--deep", th.deep); r.setProperty("--accent-a", th.accent + "40");
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = th.deep;
  }

  /* ---------- progress dots ---------- */
  var dots = [];
  J.stops.forEach(function (s) {
    var li = document.createElement("li"); li.textContent = s.emoji[0]; progEl.appendChild(li); dots.push(li);
  });
  function updateProgress() {
    dots.forEach(function (d, i) {
      d.classList.toggle("is-done", cur > i + 1);
      d.classList.toggle("is-now", !flying && cur === i + 1);
    });
  }

  /* ---------- layout ---------- */
  var landMQ = window.matchMedia("(min-aspect-ratio: 5/4) and (min-width: 560px)");
  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    [mapC, fxC].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    isLand = landMQ.matches;
    var hudB = progEl.getBoundingClientRect().bottom;
    var pr = polEl.getBoundingClientRect(), nr = panelEl.getBoundingClientRect();
    if (!isLand) {
      var top = Math.min(pr.top, nr.top);
      focalT.x = W / 2; focalT.y = (hudB + top) / 2 + 4; freeW = W;
    } else {
      focalT.x = (nr.right + W) / 2; focalT.y = (hudB + pr.top) / 2; freeW = W - nr.right;
    }
    focalT.y = clamp(focalT.y, hudB + 62, H * 0.62);   // leaves room for the pin label under the progress dots
    if (!flying) { focal.x = focalT.x; focal.y = focalT.y; snapCamera(); }
    kick();
  }
  function closeScale(p) { return Math.max(2, (freeW || W) * 0.94 / p.span); }
  function snapCamera() {
    var p = places[cur];
    cam.lon = p.ulon; cam.lat = p.lat; cam.scale = closeScale(p);
  }

  /* ---------- projection ---------- */
  function px(lon, lat) {
    return { x: focal.x + (wrapNear(lon, cam.lon) - cam.lon) * cam.scale, y: focal.y - (lat - cam.lat) * cam.scale };
  }

  /* ---------- drawing: map ---------- */
  function drawMap() {
    var c = mctx, s = cam.scale;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    var lonMin = cam.lon - focal.x / s - 12, lonMax = cam.lon + (W - focal.x) / s + 12;
    var latTop = cam.lat + focal.y / s, latBot = cam.lat - (H - focal.y) / s;

    c.save();
    c.translate(focal.x - cam.lon * s, focal.y + cam.lat * s);
    c.scale(s, -s);
    c.lineJoin = "round"; c.lineCap = "round";

    // graticule
    var step = s > 14 ? 5 : s > 5 ? 10 : 15;
    c.beginPath();
    for (var lo = Math.ceil(lonMin / step) * step; lo <= lonMax; lo += step) { c.moveTo(lo, Math.max(-90, latBot)); c.lineTo(lo, Math.min(90, latTop)); }
    for (var la = Math.ceil(Math.max(-90, latBot) / step) * step; la <= Math.min(90, latTop); la += step) { c.moveTo(lonMin, la); c.lineTo(lonMax, la); }
    c.strokeStyle = rgba(theme.accent2, 0.16); c.lineWidth = 1 / s; c.stroke();
    c.beginPath(); c.moveTo(lonMin, 0); c.lineTo(lonMax, 0);
    c.setLineDash([6 / s, 6 / s]); c.strokeStyle = rgba(theme.accent2, 0.38); c.lineWidth = 1.4 / s; c.stroke(); c.setLineDash([]);

    // land (drawn once per visible copy of the world)
    var k0 = Math.floor((lonMin + 180) / 360) - 0, k1 = Math.ceil((lonMax - 180) / 360) + 0;
    for (var k = k0 - 1; k <= k1 + 1; k++) {
      c.save(); c.translate(360 * k, 0);
      c.fillStyle = rgba(mixRGB(theme.accent2, [255, 255, 255], 0.35), 0.26);
      c.fill(landPath, "evenodd");
      c.lineWidth = 7 / s; c.strokeStyle = rgba(theme.accent, 0.16); c.stroke(landPath);
      c.lineWidth = 1.6 / s; c.strokeStyle = "rgba(255,255,255,.72)"; c.stroke(landPath);
      c.restore();
    }
    c.restore();

    drawLegs();
    drawPins();
  }

  function legPoint(leg, t, off) {
    var q = bez(leg, t);
    return { x: focal.x + (q.x + off - cam.lon) * cam.scale, y: focal.y - (q.y - cam.lat) * cam.scale };
  }
  function strokeLeg(leg, off, t0, t1, n) {
    mctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var q = legPoint(leg, lerp(t0, t1, i / n), off);
      if (i === 0) mctx.moveTo(q.x, q.y); else mctx.lineTo(q.x, q.y);
    }
    mctx.stroke();
  }
  function drawLegs() {
    var c = mctx;
    c.lineJoin = "round"; c.lineCap = "round";
    var drawOne = function (leg, prog, flightLike) {
      var off = 360 * Math.round((cam.lon - leg.mid.x) / 360);
      c.setLineDash([2, 9]); c.lineWidth = 2.4; c.strokeStyle = "rgba(255,255,255,.5)";
      strokeLeg(leg, off, 0, 1, 60);
      c.setLineDash([]);
      if (prog > 0.002) {
        c.lineWidth = 9; c.strokeStyle = rgba(theme.accent, 0.22); strokeLeg(leg, off, 0, prog, 60);
        c.lineWidth = 3.2; c.strokeStyle = rgba(mixRGB(theme.accent2, [255, 255, 255], 0.5), 0.95); strokeLeg(leg, off, 0, prog, 60);
      }
    };
    for (var i = 1; i <= LAST; i++) drawOne(legs[i], legProg[i]);
    if (flying && flight && flight.adhoc) drawOne(flight.leg, flight.p);
  }

  function pillText(text, x, y, big) {
    var c = mctx;
    c.font = "700 " + (big ? 15 : 12) + 'px Quicksand, system-ui, sans-serif';
    var w = c.measureText(text).width + (big ? 26 : 18), h = big ? 30 : 22, r = h / 2;
    x = clamp(x, w / 2 + 8, W - w / 2 - 8);                 // keep labels on screen
    var x0 = x - w / 2, y0 = y - h / 2;
    c.beginPath();
    c.moveTo(x0 + r, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + h, r); c.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    c.arcTo(x0, y0 + h, x0, y0, r); c.arcTo(x0, y0, x0 + w, y0, r); c.closePath();
    c.fillStyle = "rgba(255,255,255,.9)"; c.fill();
    c.strokeStyle = rgba(theme.accent, 1); c.lineWidth = 2; c.stroke();
    c.fillStyle = "#3a1745"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(text, x, y + 0.5);
  }

  function drawPins() {
    var c = mctx;
    var zoomedOut = cam.scale < closeScale(places[Math.max(cur, 1)]) * 0.62;
    for (var i = 0; i <= LAST; i++) {
      var p = places[i], q = px(p.ulon, p.lat);
      if (q.x < -60 || q.x > W + 60 || q.y < -60 || q.y > H + 60) continue;
      var isCur = (i === cur && !flying);
      var visited = i < cur || (i === cur);
      var pc = p.theme ? hexRGB(p.theme.accent) : theme.accent;
      // pulse rings
      if (isCur && !reduced) {
        for (var r = 0; r < 2; r++) {
          var ph = ((clock * 0.0007) + r * 0.5) % 1;
          c.beginPath(); c.arc(q.x, q.y, 10 + ph * 38, 0, TAU);
          c.strokeStyle = rgba(pc, (1 - ph) * 0.7); c.lineWidth = 3; c.stroke();
        }
      } else if (isCur) {
        c.beginPath(); c.arc(q.x, q.y, 26, 0, TAU); c.strokeStyle = rgba(pc, 0.5); c.lineWidth = 3; c.stroke();
      }
      // dot
      c.beginPath(); c.arc(q.x, q.y, isCur ? 8 : 6, 0, TAU);
      c.fillStyle = visited ? rgba(pc, 1) : "rgba(255,255,255,.9)"; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = "#fff"; c.stroke();
      // labels (small ones are skipped when they would sit on top of the current stop)
      var cq = px(places[cur].ulon, places[cur].lat);
      var nearCur = !isCur && !flying && Math.hypot(q.x - cq.x, q.y - cq.y) < 110;
      if (i > 0) {
        if (isCur) pillText(p.emoji[0] + "  " + p.title, q.x, q.y - 46, true);
        else if (zoomedOut && !nearCur) pillText(p.emoji[0] + " " + p.title, q.x, q.y - 22, false);
      } else if (isCur) {
        pillText("✈️  Departure", q.x, q.y - 46, true);
      } else if (zoomedOut && !nearCur) {
        pillText("🏠 Start", q.x, q.y - 22, false);
      }
    }
  }

  /* plane sprite, pointing along +x, length 1 */
  function drawPlane(x, y, ang, size) {
    var c = mctx;
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(size, size);
    // soft ground shadow
    c.save(); c.translate(-0.05, 0.16); c.scale(1, 1); planePath(c); c.fillStyle = "rgba(20,0,40,.22)"; c.fill(); c.restore();
    planePath(c);
    c.shadowColor = rgba(theme.accent, 1); c.shadowBlur = 18;
    c.fillStyle = "#ffffff"; c.fill();
    c.shadowBlur = 0;
    c.lineWidth = 0.035; c.strokeStyle = rgba(theme.accent, 1); c.stroke();
    // cockpit + stripe
    c.beginPath(); c.ellipse(0.27, 0, 0.07, 0.034, 0, 0, TAU); c.fillStyle = rgba(theme.accent, 1); c.fill();
    c.beginPath(); c.moveTo(-0.3, 0); c.lineTo(0.18, 0); c.lineWidth = 0.025; c.strokeStyle = rgba(theme.accent2, 1); c.stroke();
    c.restore();
  }
  function planePath(c) {
    var up = [[0.5, 0], [0.4, -0.05], [0.14, -0.062], [0.1, -0.062], [-0.13, -0.47], [-0.22, -0.47], [-0.16, -0.075], [-0.33, -0.06], [-0.43, -0.2], [-0.5, -0.2], [-0.5, -0.04], [-0.5, 0]];
    c.beginPath(); c.moveTo(up[0][0], up[0][1]);
    for (var i = 1; i < up.length; i++) c.lineTo(up[i][0], up[i][1]);
    for (var j = up.length - 2; j >= 0; j--) c.lineTo(up[j][0], -up[j][1]);
    c.closePath();
  }

  /* ---------- sparkle trail ---------- */
  function spawnTrail(lon, lat, dt, speedFactor) {
    if (reduced) return;
    var n = Math.max(1, Math.round(dt / 16 * 2.2));
    var back = { x: -Math.cos(heading), y: Math.sin(heading) };       // world-space direction behind the plane
    var cols = [theme.accent, theme.accent2, [255, 255, 255], [255, 230, 150]];
    for (var i = 0; i < n; i++) {
      var along = rand(0.1, 0.6) * 30 / cam.scale, side = rand(-1, 1) * 9 / cam.scale;
      particles.push({
        lon: lon + back.x * along + (-back.y) * side, lat: lat + back.y * along + back.x * side,
        age: 0, max: rand(1000, 1700), size: rand(3, 9), star: Math.random() < 0.65,
        col: cols[(Math.random() * cols.length) | 0], rot: rand(0, TAU), vr: rand(-2, 2),
        dx: rand(-6, 6), dy: rand(-18, -4)
      });
    }
    if (particles.length > 420) particles.splice(0, particles.length - 420);
  }
  function starPath(c, r) {
    c.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath();
  }
  function drawParticles(dt) {
    var c = mctx;
    c.save(); c.globalCompositeOperation = "lighter";
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]; p.age += dt;
      if (p.age >= p.max) { particles.splice(i, 1); continue; }
      var k = 1 - p.age / p.max, q = px(p.lon, p.lat);
      q.x += p.dx * p.age / 1000; q.y += p.dy * p.age / 1000;
      c.save(); c.translate(q.x, q.y); c.rotate(p.rot + p.vr * p.age / 1000);
      c.globalAlpha = Math.pow(k, 1.2);
      c.fillStyle = rgba(p.col, 1);
      var sz = p.size * (0.4 + 0.6 * k);
      if (p.star) { starPath(c, sz * 1.2); c.fill(); } else { c.beginPath(); c.arc(0, 0, sz * 0.55, 0, TAU); c.fill(); }
      c.restore();
    }
    c.restore();
  }

  /* ---------- fx: emoji bursts + confetti (screen space) ---------- */
  var CONF = ["#ff4fa3", "#3ff2e0", "#ffd45e", "#ff7a6b", "#b58cff", "#ffffff", "#7affd8", "#ff9ad0"];
  function burstEmoji(x, y, list, n) {
    if (reduced) return;
    for (var i = 0; i < n; i++) {
      var a = rand(0, TAU), sp = rand(120, 420);
      fxItems.push({
        t: "e", x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140, g: 420, age: 0, max: rand(1500, 2400),
        size: rand(20, 40), ch: list[i % list.length], rot: rand(-0.5, 0.5), vr: rand(-3, 3), drag: 0.985
      });
    }
    kick();
  }
  function burstConfetti(x, y, n, spread, power) {
    if (reduced) return;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + rand(-spread, spread), sp = rand(power * 0.4, power);
      fxItems.push({
        t: "c", x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 520, age: 0, max: rand(2600, 4200),
        w: rand(6, 12), h: rand(9, 18), col: CONF[(Math.random() * CONF.length) | 0], rot: rand(0, TAU), vr: rand(-9, 9),
        sway: rand(0, TAU), drag: 0.987, flip: rand(2, 6)
      });
    }
    kick();
  }
  var rainUntil = 0;
  function confettiRain(ms) { if (reduced) return; rainUntil = performance.now() + ms; kick(); }
  function stillSprinkle(list) {              // reduced-motion version: a calm, static scatter
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H);
    fctx.textAlign = "center"; fctx.textBaseline = "middle";
    for (var i = 0; i < 26; i++) {
      fctx.font = rand(22, 38) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
      fctx.fillText(list[i % list.length], rand(20, W - 20), rand(80, H * 0.55));
    }
    setTimeout(function () { fctx.clearRect(0, 0, W, H); }, 2600);
  }
  function drawFx(dt, now) {
    var c = fctx, s = dt / 1000;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    if (now < rainUntil && !reduced) {
      var n = Math.round(dt / 16 * 3);
      for (var r = 0; r < n; r++) {
        fxItems.push({
          t: "c", x: rand(0, W), y: -20, vx: rand(-40, 40), vy: rand(80, 220), g: 90, age: 0, max: rand(4000, 6000),
          w: rand(6, 12), h: rand(9, 18), col: CONF[(Math.random() * CONF.length) | 0], rot: rand(0, TAU), vr: rand(-7, 7),
          sway: rand(0, TAU), drag: 0.996, flip: rand(2, 6)
        });
      }
    }
    for (var i = fxItems.length - 1; i >= 0; i--) {
      var p = fxItems[i]; p.age += dt;
      if (p.age >= p.max || p.y > H + 60) { fxItems.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt / 16); p.vy = p.vy * Math.pow(p.drag, dt / 16) + p.g * s;
      p.x += p.vx * s + (p.t === "c" ? Math.sin(p.age / 300 + p.sway) * 0.7 : 0); p.y += p.vy * s; p.rot += p.vr * s;
      var k = 1 - p.age / p.max;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      if (p.t === "e") {
        var pop = Math.min(1, p.age / 220), sc = (0.3 + 0.7 * (1 - Math.pow(1 - pop, 3)));
        c.globalAlpha = Math.min(1, k * 2.4); c.scale(sc, sc);
        c.font = p.size + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
        c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(p.ch, 0, 0);
      } else {
        c.globalAlpha = Math.min(1, k * 3);
        c.scale(1, Math.cos(p.age / 1000 * p.flip * 3 + p.sway));
        c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      c.restore();
    }
  }

  /* ---------- HUD ---------- */
  function setHud(lon, lat, mode, val) {
    elLat.textContent = fmtLat(lat); elLon.textContent = fmtLon(lon);
    if (mode === "km") { elTogoK.textContent = "KM LEFT"; elTogo.textContent = Math.round(val).toLocaleString("en-US"); }
    else { elTogoK.textContent = "STOP"; elTogo.textContent = val; }
  }
  function idleHud() {
    var p = places[cur];
    setHud(p.lon, p.lat, "stop", cur === 0 ? "BOARDING" : cur + " / " + LAST);
  }

  /* ---------- content: card, polaroids, buttons ---------- */
  var contentTimer = 0;
  function setContent(i) {
    var p = places[i], fin = !!p.final;
    $("cardTag").textContent = p.isStart ? "Now boarding" : p.tag;
    $("cardTitle").textContent = fin ? p.headline : p.title;
    $("cardPlace").textContent = p.isStart ? p.place : p.place;
    $("cardMsg").textContent = p.isStart ? J.start.message : p.message;
    cardEl.classList.toggle("card--final", fin);
    $("cardPlace").style.display = "";
    // buttons
    nextBtn.hidden = fin; finalActions.hidden = !fin;
    if (!fin) { $("nextLabel").textContent = i === 0 ? "Take off" : "Next stop"; $("nextIcon").textContent = i === 0 ? "✈️" : "➜"; }
    // polaroids
    polEl.innerHTML = "";
    var items = p.isStart ? J.start.stamps : p.photos;
    items.forEach(function (ph) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "pol" + (p.isStart ? " pol--stamp" : "");
      b.setAttribute("aria-label", (p.isStart ? ph.caption : ph.alt) + " (tap to enlarge)");
      var fr = document.createElement("span"); fr.className = "pol__frame";
      var im;
      if (p.isStart) { im = document.createElement("span"); im.className = "pol__img"; im.textContent = ph.emoji; im.setAttribute("aria-hidden", "true"); }
      else { im = document.createElement("img"); im.className = "pol__img"; im.src = ph.src; im.alt = ph.alt; im.decoding = "async"; im.draggable = false; }
      var cap = document.createElement("span"); cap.className = "pol__cap"; cap.textContent = ph.caption;
      fr.appendChild(im); fr.appendChild(cap); b.appendChild(fr); polEl.appendChild(b);
      b.addEventListener("click", function () {
        var was = b.classList.contains("is-lifted");
        Array.prototype.forEach.call(polEl.children, function (x) { x.classList.remove("is-lifted"); });
        if (!was) b.classList.add("is-lifted");
      });
    });
  }
  function showContent() {
    // two frames so the CSS transitions run from the hidden state
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      cardEl.classList.remove("is-out"); actionsEl.classList.remove("is-out");
      cardEl.classList.add("is-in"); actionsEl.classList.add("is-in"); polEl.classList.add("is-in");
    }); });
  }
  function hideContent() {
    cardEl.classList.remove("is-in"); cardEl.classList.add("is-out");
    actionsEl.classList.remove("is-in"); actionsEl.classList.add("is-out");
    polEl.classList.remove("is-in");
    Array.prototype.forEach.call(polEl.children, function (x) { x.classList.remove("is-lifted"); });
  }

  /* ---------- flight ---------- */
  function startFlight(to, adhoc) {
    if (flying) return;
    var from = places[cur], dest = places[to];
    var leg = adhoc ? makeLeg(from, dest) : legs[to];
    var dur = reduced ? 0 : clamp(3900 + leg.len * 34, 4300, 7600);
    var dummy = { idx: to };
    // zoom levels
    var cA = closeScale(from), cB = closeScale(dest);
    var spanX = leg.box.maxx - leg.box.minx + 10, spanY = leg.box.maxy - leg.box.miny + 10;
    var far = Math.min(W * 0.9 / spanX, H * 0.6 / spanY);
    far = clamp(far, Math.max(W / 420, H * 0.34 / 180), Math.min(cA, cB) * 0.7);
    flight = { from: from, to: to, dest: dest, leg: leg, adhoc: !!adhoc, t0: performance.now(), dur: dur, far: far, cA: cA, cB: cB, p: 0, t: 0, bgDone: false, themeA: from.theme, themeB: dest.theme };
    flying = true; body.dataset.state = "flying";
    nextBtn.disabled = true; $("againBtn").disabled = true;
    hideContent(); updateProgress();
    loadVideo(to);                                    // make sure the next video is on its way
    if (to + 1 <= LAST) setTimeout(function () { loadVideo(to + 1); }, 1500);
    if (!adhoc && to <= LAST) { /* leg progress is animated in tick() */ }
    if (adhoc) legProg = [0, 0, 0, 0, 0];
    if (reduced) { finishFlight(); return; }
    kick();
  }

  function tickFlight(now, dt) {
    var f = flight, t = clamp((now - f.t0) / f.dur, 0, 1);
    var p = easeSine(t); f.t = t; f.p = p;
    var pos = bez(f.leg, p), d = bezD(f.leg, p);
    var targetHead = Math.atan2(-d.y, d.x);
    var dh = Math.atan2(Math.sin(targetHead - heading), Math.cos(targetHead - heading));
    heading += dh * Math.min(1, dt / 120);
    // zoom out then back in (log-space), camera drifts to the middle of the route at the widest point
    var kk = smooth(Math.sin(Math.PI * t) * 1.45);
    var base = Math.exp(lerp(Math.log(f.cA), Math.log(f.cB), smooth(t)));
    cam.scale = Math.exp(lerp(Math.log(base), Math.log(f.far), kk));
    cam.lon = lerp(pos.x, f.leg.mid.x, kk * 0.92); cam.lat = lerp(pos.y, f.leg.mid.y, kk * 0.92);
    focal.x = lerp(focalT.x, W / 2, kk); focal.y = lerp(focalT.y, H * 0.52, kk);
    f.pos = pos;
    // theme colours
    var th = smooth((t - 0.2) / 0.7);
    theme.accent = mixRGB(hexRGB(f.themeA.accent), hexRGB(f.themeB.accent), th);
    theme.accent2 = mixRGB(hexRGB(f.themeA.accent2), hexRGB(f.themeB.accent2), th);
    if (!f.adhoc) legProg[f.to] = p;
    // live HUD
    setHud(pos.x, pos.y, "km", haversine(pos.y, pos.x, f.dest.lat, f.dest.lon));
    spawnTrail(pos.x, pos.y, dt);
    // background cross-fade as the plane arrives
    if (!f.bgDone && t > 0.82) { f.bgDone = true; showBg(f.to); applyTheme(f.dest.theme); }
    if (t >= 1) finishFlight();
  }

  function finishFlight() {
    var f = flight; flight = null; flying = false;
    cur = f.to;
    if (!f.adhoc) legProg[cur] = 1;
    var p = places[cur];
    if (!f.bgDone) { showBg(cur); applyTheme(p.theme); }
    theme.accent = hexRGB(p.theme.accent); theme.accent2 = hexRGB(p.theme.accent2);
    body.dataset.state = p.final ? "final" : "stop" + cur;
    setContent(cur);
    layout();                                          // measures the new card, sets focalT
    cam.lon = p.ulon; cam.lat = p.lat; cam.scale = closeScale(p);
    idleHud(); updateProgress();
    nextBtn.disabled = false; $("againBtn").disabled = false;
    showContent();
    live.textContent = "Arrived at " + p.title + ", " + p.place + ". " + (p.final ? p.headline + " " : "") + p.message;
    // arrival burst at the pin
    setTimeout(function () {
      var q = px(p.ulon, p.lat);
      burstEmoji(q.x, q.y, p.emoji, p.final ? 26 : 18);
      if (p.final) { confettiRain(3800); burstConfetti(W * 0.2, H * 0.8, 70, 0.6, 900); burstConfetti(W * 0.8, H * 0.8, 70, 0.6, 900); }
      if (reduced) stillSprinkle(p.emoji);
    }, reduced ? 100 : 350);
    // warm up what's next
    for (var n = 1; n <= 2; n++) { var nx = places[cur + n]; if (nx && nx.photos) nx.photos.forEach(function (ph) { var im = new Image(); im.src = ph.src; }); }
    if (places[cur + 1]) loadVideo(cur + 1);
    kick();
  }

  /* ---------- main loop ---------- */
  function kick() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    var dt = Math.min(64, now - lastT); lastT = now; clock = now;
    if (flying && flight) tickFlight(now, dt);
    else {
      // ease the focal point to its latest measured position
      var e = Math.min(1, dt / 220);
      focal.x += (focalT.x - focal.x) * e; focal.y += (focalT.y - focal.y) * e;
    }
    drawMap();
    // plane
    var P = places[cur], pp, ang = heading, size = 38, bob = 0;
    if (flying && flight && flight.pos) {
      pp = px(flight.pos.x, flight.pos.y);
      size = 36 + 10 * smooth(Math.sin(Math.PI * flight.t) * 1.3);
    } else {
      pp = px(P.ulon, P.lat);
      if (!reduced) bob = Math.sin(now / 520) * 3.5;
    }
    drawParticles(dt);
    drawPlane(pp.x, pp.y + bob, ang, size);
    drawFx(dt, now);
    var more = flying || particles.length || fxItems.length || now < rainUntil || !reduced;
    if (more && !document.hidden) requestAnimationFrame(loop); else running = false;
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });

  /* ---------- music ---------- */
  var audio = $("audio"), musicBtn = $("music"), musicOn = false, fadeT = 0;
  function fadeTo(v, done) {
    clearInterval(fadeT);
    fadeT = setInterval(function () {
      var d = v - audio.volume;
      if (Math.abs(d) < 0.04) { audio.volume = v; clearInterval(fadeT); if (done) done(); } else audio.volume = clamp(audio.volume + Math.sign(d) * 0.04, 0, 1);
    }, 50);
  }
  musicBtn.addEventListener("click", function () {
    if (!musicOn) {
      if (!audio.src || audio.src === location.href) audio.src = J.musicFile;
      audio.volume = 0;
      var pr = audio.play();
      var ok = function () { musicOn = true; musicBtn.setAttribute("aria-pressed", "true"); musicBtn.setAttribute("aria-label", "Pause birthday music"); fadeTo(0.55); };
      if (pr && pr.then) pr.then(ok).catch(function () { musicOn = false; }); else ok();
    } else {
      musicOn = false; musicBtn.setAttribute("aria-pressed", "false"); musicBtn.setAttribute("aria-label", "Play birthday music");
      fadeTo(0, function () { audio.pause(); });
    }
  });

  /* ---------- buttons ---------- */
  nextBtn.addEventListener("click", function () { if (!flying && cur < LAST) startFlight(cur + 1, false); });
  $("againBtn").addEventListener("click", function () {
    if (flying) return;
    fxItems.length = 0; rainUntil = 0;
    startFlight(1, true);
  });
  $("confettiBtn").addEventListener("click", function () {
    if (reduced) { stillSprinkle(places[LAST].emoji); return; }
    burstConfetti(W * 0.15, H * 0.92, 90, 0.5, 1050);
    burstConfetti(W * 0.85, H * 0.92, 90, 0.5, 1050);
    burstConfetti(W * 0.5, H * 0.95, 70, 0.7, 1000);
    burstEmoji(W / 2, H * 0.4, places[LAST].emoji, 14);
    confettiRain(1800);
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "ArrowRight" || e.key === "n") && !flying && cur < LAST && document.activeElement === document.body) nextBtn.click();
  });

  /* ---------- go ---------- */
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(layout, 80); });
  if (landMQ.addEventListener) landMQ.addEventListener("change", layout);
  applyTheme(J.introTheme);
  setContent(0);
  layout();
  idleHud(); updateProgress();
  loadVideo(1);
  showContent();
  kick();
  // fonts change text height -> re-measure the card once they are ready
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!flying) layout(); });

  // test / debug hook
  window.__journey = { get state() { return { cur: cur, flying: flying, cam: cam, focal: focal }; }, next: function () { nextBtn.click(); } };
})();

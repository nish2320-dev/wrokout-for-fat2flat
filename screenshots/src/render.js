/* -------------------------------------------------------------
   Lays one slide out for the current export canvas.
   Poster chrome scales with the canvas; the phone UI is drawn at
   iPhone logical size and scaled by --k, so every export size gets
   identical, correctly proportioned artwork.
   ------------------------------------------------------------- */

const LOGICAL_W = 393;
const LOGICAL_H = 852;

const MARK = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 7.5v9M3.5 9.5v5M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/></svg>`;

function layout(W, H) {
  // vertical rhythm as a share of canvas height
  const headH  = H * 0.180;          // headline block
  const bottom = H * 0.988;          // device bottom edge
  const bezel  = Math.round(H * 0.0092);

  let screenH = bottom - headH - bezel * 2;
  let screenW = screenH * (LOGICAL_W / LOGICAL_H);

  const maxScreenW = W * 0.862 - bezel * 2;   // keep side margins on wide canvases
  if (screenW > maxScreenW) {
    screenW = maxScreenW;
    screenH = screenW * (LOGICAL_H / LOGICAL_W);
  }

  const devW = screenW + bezel * 2;
  const devH = screenH + bezel * 2;

  return {
    '--head-h':        px(headH),
    '--head-pad':      px(W * 0.068),
    '--head-drop':     px(H * 0.006),
    '--brand-size':    px(H * 0.0113),
    '--brand-gap':     px(H * 0.020),
    '--headline-size': px(H * 0.0355),
    '--subhead-size':  px(H * 0.0148),
    '--subhead-gap':   px(H * 0.0088),
    '--dev-w':         px(devW),
    '--dev-h':         px(devH),
    '--dev-top':       px(bottom - devH),
    '--dev-radius':    px(bezel + screenW * 0.1122),
    '--screen-radius': px(screenW * 0.1122),
    '--bezel':         px(bezel),
    '--k':             (screenW / LOGICAL_W).toFixed(5),
    '--glow-top':      px(bottom - devH * 0.62),
    '--glow-size':     px(W * 1.55),
    '--grid':          px(W / 18)
  };
}

const px = (n) => `${Math.round(n * 100) / 100}px`;

function draw(slideIndex, W, H, logoSrc) {
  const slide = SLIDES[slideIndex];
  const vars  = layout(W, H);
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);

  const mark = logoSrc ? `<img src="${logoSrc}" alt="">` : MARK;

  document.getElementById('poster').outerHTML = `
    <div class="poster" id="poster">
      <div class="head">
        <div class="brand">
          <div class="brand-mark">${mark}</div>
          <div class="brand-name">Fat<span>2</span>Flat Fitness</div>
        </div>
        <h1 class="headline">${slide.headline}</h1>
        <p class="subhead">${slide.sub}</p>
      </div>
      <div class="device">
        <div class="screen-clip">
          <div class="screen">${slide.markup}</div>
        </div>
      </div>
    </div>`;

  return slide.id;
}

window.__draw = draw;
window.__slideCount = SLIDES.length;

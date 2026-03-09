/**
 * NEW FILE: Custom player controls overlay.
 * The original project replaces the Twitch player with a bare <video> element
 * that has zero UI controls. This adds a full custom control bar styled to
 * match Twitch's dark theme:
 * - Play/Pause
 * - Volume slider + mute toggle
 * - Current time / live indicator
 * - Quality selector (placeholder for future server-side quality switching)
 * - Theater mode toggle
 * - Fullscreen toggle
 */

import { logger } from './logger';
import { getVolume, setVolume } from './storage';

const CONTROLS_ID = 'twitch-adblock-controls';

/** SVG icon paths */
const ICONS = {
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>',
  volumeHigh: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.47 4.47 0 002.5-3.5zM14 3.23v2.06a6.51 6.51 0 010 13.42v2.06A8.51 8.51 0 0014 3.23z" fill="currentColor"/>',
  volumeMute: '<path d="M16.5 12A4.5 4.5 0 0014 8.5v2.09l2.41 2.41c.06-.31.09-.63.09-.98zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06A6.51 6.51 0 0119 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.9 8.9 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>',
  fullscreen: '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/>',
  fullscreenExit: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="currentColor"/>',
  theater: '<path d="M19 6H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2zm0 10H5V8h14v8z" fill="currentColor"/>',
  live: '<circle cx="12" cy="12" r="6" fill="#e91916"/>',
};

function createSVG(iconPath: string, size = 20): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.style.pointerEvents = 'none';
  svg.innerHTML = iconPath;
  return svg;
}

function createButton(
  icon: string,
  title: string,
  onClick: () => void
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'ta-ctrl-btn';
  btn.title = title;
  btn.appendChild(createSVG(icon));
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

export function injectPlayerControls(video: HTMLVideoElement): HTMLElement {
  // Remove existing controls if any
  const existing = document.getElementById(CONTROLS_ID);
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = CONTROLS_ID;
  container.className = 'ta-controls-overlay';

  // --- Control bar ---
  const bar = document.createElement('div');
  bar.className = 'ta-controls-bar';

  // Play / Pause
  const playBtn = createButton(ICONS.pause, 'Play/Pause', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });
  bar.appendChild(playBtn);

  video.addEventListener('play', () => {
    playBtn.innerHTML = '';
    playBtn.appendChild(createSVG(ICONS.pause));
  });
  video.addEventListener('pause', () => {
    playBtn.innerHTML = '';
    playBtn.appendChild(createSVG(ICONS.play));
  });

  // Volume section
  const volumeWrap = document.createElement('div');
  volumeWrap.className = 'ta-volume-wrap';

  const muteBtn = createButton(
    video.muted ? ICONS.volumeMute : ICONS.volumeHigh,
    'Mute/Unmute',
    () => {
      video.muted = !video.muted;
      muteBtn.innerHTML = '';
      muteBtn.appendChild(createSVG(video.muted ? ICONS.volumeMute : ICONS.volumeHigh));
    }
  );
  volumeWrap.appendChild(muteBtn);

  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '1';
  volumeSlider.step = '0.01';
  volumeSlider.value = String(video.volume);
  volumeSlider.className = 'ta-volume-slider';
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    video.volume = val;
    video.muted = val === 0;
    setVolume(val);
    muteBtn.innerHTML = '';
    muteBtn.appendChild(createSVG(val === 0 ? ICONS.volumeMute : ICONS.volumeHigh));
  });
  volumeWrap.appendChild(volumeSlider);
  bar.appendChild(volumeWrap);

  // Live indicator
  const liveIndicator = document.createElement('div');
  liveIndicator.className = 'ta-live-indicator';
  liveIndicator.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10">${ICONS.live}</svg> LIVE`;
  bar.appendChild(liveIndicator);

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  bar.appendChild(spacer);

  // Theater mode toggle
  const theaterBtn = createButton(ICONS.theater, 'Theater Mode', () => {
    // Toggle Twitch's theater mode by clicking their button if present
    const twitchTheaterBtn = document.querySelector(
      'button[data-a-target="player-theatre-mode-button"]'
    ) as HTMLButtonElement | null;
    if (twitchTheaterBtn) {
      twitchTheaterBtn.click();
    } else {
      // Fallback: toggle a CSS class on the video parent
      const parent = video.closest('.video-player') || video.parentElement;
      parent?.classList.toggle('ta-theater-mode');
    }
  });
  bar.appendChild(theaterBtn);

  // Fullscreen toggle
  const fsBtn = createButton(ICONS.fullscreen, 'Fullscreen', () => {
    const wrapper = video.closest('.video-player') || video.parentElement;
    if (!wrapper) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapper.requestFullscreen().catch((err) => {
        logger.warn('Fullscreen request failed:', err);
      });
    }
  });
  bar.appendChild(fsBtn);

  document.addEventListener('fullscreenchange', () => {
    fsBtn.innerHTML = '';
    fsBtn.appendChild(
      createSVG(document.fullscreenElement ? ICONS.fullscreenExit : ICONS.fullscreen)
    );
  });

  container.appendChild(bar);

  // Show/hide on hover with timeout
  let hideTimeout: ReturnType<typeof setTimeout>;
  const showControls = () => {
    container.classList.add('ta-controls-visible');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      if (!video.paused) {
        container.classList.remove('ta-controls-visible');
      }
    }, 3000);
  };

  const parent = video.parentElement;
  if (parent) {
    parent.addEventListener('mousemove', showControls);
    parent.addEventListener('mouseleave', () => {
      clearTimeout(hideTimeout);
      if (!video.paused) {
        container.classList.remove('ta-controls-visible');
      }
    });
    parent.style.position = 'relative';
    parent.appendChild(container);
  }

  // Show controls initially
  showControls();

  logger.info('Player controls injected');
  return container;
}

export function removePlayerControls(): void {
  const el = document.getElementById(CONTROLS_ID);
  if (el) {
    el.remove();
    logger.debug('Player controls removed');
  }
}

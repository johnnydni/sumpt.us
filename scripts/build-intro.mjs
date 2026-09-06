/**
 * Cuts the splash clip down from the source animation.
 *
 * Three things the source needs before it can open an app.
 *
 * It is six seconds long, and the motion is over after roughly 1.8 — measured
 * frame to frame, everything past that is a still logo with encoder noise on
 * it. Four of those seconds would be spent on every cold start.
 *
 * It carries an audio track. Muting the element would be enough to keep it
 * quiet, but a track nobody can hear is bytes nobody needs, and one fewer way
 * for a browser to surprise you.
 *
 * And it is a 16:9 frame holding a wide, flat band of artwork — 970×170 of
 * content in 1280×720. Cropping to that band lets the clip be sized on screen
 * the way the wordmark is, instead of a landscape rectangle on a portrait
 * phone. The crop keeps the full width: the liquid streak reaches the right
 * edge of the source, so there is nothing spare to take off the sides.
 *
 * Requires ffmpeg. Run with: node scripts/build-intro.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(root, 'brand/intro-source.mp4')
const OUT_DIR = resolve(root, 'public/brand')

/** Where the motion has finished, plus a beat to settle before the cut. */
const DURATION = '2.3'
/**
 * The content band in the 1280×720 source, measured with cropdetect, and a
 * highlight clip.
 *
 * The source paints its background at 254, and lossy encoding drags that to
 * 253 or lower. Against the app's 255 canvas that is a faint grey panel, so
 * anything above 240 is pushed to pure white before encoding — there is no
 * artwork up there, only background, and it leaves the codec no room to drift.
 */
const FILTERS = 'crop=1280:280:0:221,colorlevels=rimax=0.94:gimax=0.94:bimax=0.94,scale=960:-2'

mkdirSync(OUT_DIR, { recursive: true })

const common = ['-v', 'error', '-i', SOURCE, '-t', DURATION, '-an', '-vf', FILTERS]

// H.264 carries iOS and every browser that matters. VP9 is smaller and is what
// an open-source Chromium can actually decode, which is what makes the splash
// checkable in a headless browser at all.
execFileSync('ffmpeg', [
  ...common,
  '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
  '-crf', '20', '-preset', 'slow', '-movflags', '+faststart',
  '-y', resolve(OUT_DIR, 'intro.mp4'),
])

execFileSync('ffmpeg', [
  ...common,
  '-c:v', 'libvpx-vp9', '-crf', '42', '-b:v', '0', '-row-mt', '1', '-deadline', 'good',
  '-y', resolve(OUT_DIR, 'intro.webm'),
])

for (const name of ['intro.webm', 'intro.mp4']) {
  const { size } = statSync(resolve(OUT_DIR, name))
  console.log(`${name.padEnd(12)} ${(size / 1024).toFixed(0)} KB`)
}

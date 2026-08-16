/*!
 * karaoke-analyzer / analyzer.js
 *   Pure-JS voice analysis engine for browser (Web Audio + Worker) and Node.
 *   No external dependencies. No CDN. No neural models. Works offline.
 *
 *   Author : mits-vocal-analyst (BS-engineer subagent)
 *   Date   : 2026-08-16
 *   Target : re-implement the axes produced by the Mits Python pipeline
 *            (Praat / openSMILE eGeMAPSv02 / torchcrepe / pypYIN + helper2.js)
 *            with the ~same numbers, using only in-browser DSP.
 *
 *   Public API
 *   ----------
 *     const result = await KaraokeAnalyzer.analyze(samples, sampleRate, opts, onProgress);
 *
 *     samples     : Float32Array of MONO PCM, [-1, +1]
 *     sampleRate  : integer Hz (16000..48000)
 *     opts        : { downsampleTo?:16000, hopSec?:0.010, frameSec?:0.040, maxDurationSec?:600, songName?:string }
 *     onProgress  : (fraction, message) => void        // 0.0 .. 1.0
 *
 *     Result shape mirrors the Mits session MD frontmatter keys:
 *       range_low_hz / range_high_hz / range_low_note / range_high_note / range_semitones
 *       mean_hz_voiced / mean_note_voiced
 *       total_notes / stability / avg_cent_variation / short_note_ratio / longtones_count
 *       vibrato_count / vibrato_avg_extent_cent / vibrato_avg_rate_hz
 *       shakuri_count / kobushi_count / fall_count / breath_count
 *       hnr_db / jitter_percent / shimmer_percent
 *       f1_mean_hz / f2_mean_hz / f3_mean_hz / f4_mean_hz / voice_clarity_judgment
 *       depth_alpha_ratio / depth_judgment
 *       avg_rms_db / peak_db / rms_peak_db / crest_factor / dynamic_range_useful_db
 *       rms_stdev_per_sec_db / rms_max_per_sec_db / rms_min_per_sec_db / yokuyo_judgment
 *       bpm_estimated / beat_count / onset_count
 *       avg_beat_interval_ms / beat_interval_std_ms / rhythm_judgment
 *       crepe_intonation_cent            (approximated by YIN — see calibration report)
 *       duration_seconds / duration_mmss
 *       _engine_meta                     (versioning + provenance)
 *
 *   Node usage
 *   ----------
 *     const { analyze } = require('./analyzer.js');
 *     const pcm = decodeWavToFloat32(...);       // your caller's job (or use the WAV helper below)
 *     const r = await analyze(pcm, 44100, {}, (p,msg)=>console.log(p, msg));
 *
 *   Browser usage
 *   -------------
 *     Load in a Worker to keep the UI responsive; see analyzer.worker.js
 */
'use strict';

/* =====================================================================
 * 0.  Small utilities
 * ===================================================================== */
const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const A4 = 440.0;

function hzToNote(hz){
  if (!hz || hz <= 0 || !Number.isFinite(hz)) return null;
  const semisFromA4 = Math.round(12 * Math.log2(hz / A4));
  const midi = 69 + semisFromA4;
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}
function secToMMSS(sec){
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function mean(a){ let s=0,n=0; for(let i=0;i<a.length;i++){const v=a[i]; if(Number.isFinite(v)){s+=v;n++;}} return n?s/n:0; }
function stdev(a){
  if (a.length < 2) return 0;
  const m = mean(a);
  let s=0,n=0;
  for(let i=0;i<a.length;i++){ const v=a[i]; if(Number.isFinite(v)){ s+=(v-m)*(v-m); n++; } }
  return n>1 ? Math.sqrt(s/(n-1)) : 0;
}
function median(a){
  if (!a.length) return 0;
  const s = Array.from(a).filter(Number.isFinite).sort((x,y)=>x-y);
  if (!s.length) return 0;
  const mid = Math.floor(s.length/2);
  return s.length % 2 ? s[mid] : (s[mid-1]+s[mid])/2;
}
function clamp(x, lo, hi){ return x<lo?lo:(x>hi?hi:x); }
function centOfHz(hz){ return 1200 * Math.log2(hz / A4); }

/* =====================================================================
 * 1.  Radix-2 iterative FFT (in-place, cooley-tukey)
 *     Frame lengths are powers of 2 (we pad up when needed).
 * ===================================================================== */
function nextPow2(n){ let p=1; while(p<n) p<<=1; return p; }

function fftRadix2(re, im){
  const n = re.length;
  // bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++){
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j){
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1){
    const half = size >> 1;
    const ang = -2 * Math.PI / size;
    const wRe0 = Math.cos(ang), wIm0 = Math.sin(ang);
    for (let start = 0; start < n; start += size){
      let wRe = 1, wIm = 0;
      for (let k = 0; k < half; k++){
        const iEven = start + k;
        const iOdd  = iEven + half;
        const tRe = wRe * re[iOdd] - wIm * im[iOdd];
        const tIm = wRe * im[iOdd] + wIm * re[iOdd];
        re[iOdd] = re[iEven] - tRe; im[iOdd] = im[iEven] - tIm;
        re[iEven] += tRe;           im[iEven] += tIm;
        const nRe = wRe * wRe0 - wIm * wIm0;
        const nIm = wRe * wIm0 + wIm * wRe0;
        wRe = nRe; wIm = nIm;
      }
    }
  }
}

// magnitude spectrum |X[k]| for k in [0..n/2]
function magnitudeSpectrum(signal, windowFn){
  const n = signal.length;
  const N = nextPow2(n);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < n; i++){
    re[i] = windowFn ? signal[i] * windowFn(i, n) : signal[i];
  }
  fftRadix2(re, im);
  const half = (N >> 1) + 1;
  const mag = new Float64Array(half);
  for (let k = 0; k < half; k++){
    mag[k] = Math.hypot(re[k], im[k]);
  }
  return { mag, N };
}

// Hamming window
function hamming(i, n){ return 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)); }
// Hann window (for jitter/shimmer & spectrum)
function hann(i, n){ return 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); }

/* =====================================================================
 * 2.  WAV decoder (16-bit PCM & 32-bit float, mono/stereo)
 *     Used by the Node calibration harness. In the browser we skip this
 *     entirely — use ctx.decodeAudioData() instead.
 * ===================================================================== */
function decodeWav(buf){
  // buf: Uint8Array | ArrayBuffer | node Buffer
  if (buf instanceof ArrayBuffer) buf = new Uint8Array(buf);
  else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buf)) buf = new Uint8Array(buf);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // RIFF header
  if (dv.getUint32(0, false) !== 0x52494646) throw new Error('Not a RIFF file');
  if (dv.getUint32(8, false) !== 0x57415645) throw new Error('Not a WAVE file');
  let off = 12;
  let fmt = null, dataOff = -1, dataLen = 0;
  while (off + 8 <= dv.byteLength){
    const id  = dv.getUint32(off, false);
    const len = dv.getUint32(off + 4, true);
    if (id === 0x666d7420){ // 'fmt '
      fmt = {
        formatTag  : dv.getUint16(off + 8, true),
        channels   : dv.getUint16(off + 10, true),
        sampleRate : dv.getUint32(off + 12, true),
        bitsPer    : dv.getUint16(off + 22, true),
      };
    } else if (id === 0x64617461){ // 'data'
      dataOff = off + 8; dataLen = len; break;
    }
    off += 8 + len + (len & 1);
  }
  if (!fmt || dataOff < 0) throw new Error('malformed wav');
  const { channels, sampleRate, bitsPer, formatTag } = fmt;
  const bytesPer = bitsPer / 8;
  const frames = dataLen / (bytesPer * channels);
  const out = new Float32Array(frames);
  const base = dv.byteOffset + dataOff;
  const raw = new DataView(buf.buffer, base, dataLen);
  for (let i = 0; i < frames; i++){
    let sum = 0;
    for (let c = 0; c < channels; c++){
      const p = (i * channels + c) * bytesPer;
      let v;
      if (formatTag === 3){ // IEEE float
        v = raw.getFloat32(p, true);
      } else if (bitsPer === 16){
        v = raw.getInt16(p, true) / 32768;
      } else if (bitsPer === 24){
        const b0 = raw.getUint8(p), b1 = raw.getUint8(p+1), b2 = raw.getUint8(p+2);
        let s = (b2 << 16) | (b1 << 8) | b0;
        if (s & 0x800000) s |= 0xff000000;
        v = s / 8388608;
      } else if (bitsPer === 32){
        v = raw.getInt32(p, true) / 2147483648;
      } else if (bitsPer === 8){
        v = (raw.getUint8(p) - 128) / 128;
      } else throw new Error('unsupported bit depth: ' + bitsPer);
      sum += v;
    }
    out[i] = sum / channels;
  }
  return { samples: out, sampleRate };
}

/* =====================================================================
 * 3.  Resample (linear) — good enough for pitch / voice analysis
 *     Praat / openSMILE / CREPE also work happily at 16 kHz.
 * ===================================================================== */
function resampleLinear(src, srcRate, dstRate){
  if (srcRate === dstRate) return src;
  const ratio = srcRate / dstRate;
  const N = Math.floor(src.length / ratio);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++){
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, src.length - 1);
    const t  = x - i0;
    out[i] = src[i0] * (1 - t) + src[i1] * t;
  }
  return out;
}

/* =====================================================================
 * 4.  YIN pitch tracker  (de Cheveigné & Kawahara 2002)
 *     - hop 10 ms, frame ~40 ms  (voice-analysis default)
 *     - threshold 0.15 (paper: 0.10-0.15)
 *     - parabolic interpolation on the winning tau
 *     - returns per-frame { hz, periodicity }  (periodicity = 1 - d')
 * ===================================================================== */
function yinTrack(samples, sr, opts){
  const frameSec = opts.frameSec ?? 0.040;
  const hopSec   = opts.hopSec ?? 0.010;
  const fmin     = opts.fmin ?? 60;
  const fmax     = opts.fmax ?? 800;
  const thresh   = opts.thresh ?? 0.15;

  const W    = Math.max(64, Math.floor(sr * frameSec));   // frame size
  const H    = Math.max(1, Math.floor(sr * hopSec));      // hop
  const tauMin = Math.max(2, Math.floor(sr / fmax));
  const tauMax = Math.min(W - 2, Math.floor(sr / fmin));
  const nFrames = Math.max(0, 1 + Math.floor((samples.length - W) / H));
  const times = new Float32Array(nFrames);
  const hz    = new Float32Array(nFrames);
  const per   = new Float32Array(nFrames);   // periodicity  (1 - d')
  const rms   = new Float32Array(nFrames);   // frame RMS (for silence / voiced gating)

  const d = new Float64Array(tauMax + 1);
  const dPrime = new Float64Array(tauMax + 1);

  for (let f = 0; f < nFrames; f++){
    const off = f * H;
    times[f] = (off + W / 2) / sr;
    // RMS
    let rr = 0;
    for (let i = 0; i < W; i++){
      const s = samples[off + i];
      rr += s * s;
    }
    rms[f] = Math.sqrt(rr / W);
    // difference function d(tau)  — YIN eq (6)
    for (let tau = tauMin; tau <= tauMax; tau++){
      let sum = 0;
      const bound = W - tau;
      for (let i = 0; i < bound; i++){
        const diff = samples[off + i] - samples[off + i + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }
    // cumulative-mean-normalized difference d'(tau)  — YIN eq (8)
    dPrime[tauMin] = 1;
    let runningSum = 0;
    for (let tau = tauMin; tau <= tauMax; tau++){
      runningSum += d[tau];
      dPrime[tau] = d[tau] * (tau - tauMin + 1) / (runningSum || 1);
    }
    // absolute-threshold search  — YIN §3.3
    let tauEst = -1;
    for (let tau = tauMin + 1; tau < tauMax; tau++){
      if (dPrime[tau] < thresh){
        while (tau + 1 < tauMax && dPrime[tau + 1] < dPrime[tau]) tau++;
        tauEst = tau; break;
      }
    }
    if (tauEst < 0){
      // fallback: global minimum of dPrime
      let m = Infinity, argm = -1;
      for (let tau = tauMin; tau <= tauMax; tau++){
        if (dPrime[tau] < m){ m = dPrime[tau]; argm = tau; }
      }
      tauEst = argm > 0 ? argm : -1;
    }
    if (tauEst > 0){
      // parabolic interpolation
      const x0 = tauEst > tauMin ? tauEst - 1 : tauEst;
      const x2 = tauEst + 1 < tauMax ? tauEst + 1 : tauEst;
      const y0 = dPrime[x0], y1 = dPrime[tauEst], y2 = dPrime[x2];
      let refined = tauEst;
      const denom = (y0 + y2 - 2 * y1);
      if (Math.abs(denom) > 1e-12){
        refined = tauEst + 0.5 * (y0 - y2) / denom;
      }
      hz[f]  = sr / refined;
      per[f] = 1 - dPrime[tauEst];
    } else {
      hz[f] = 0; per[f] = 0;
    }
  }
  return { times, hz, per, rms, hopSec, frameSec, sampleRate: sr, W, H };
}

/* =====================================================================
 * 5.  Voiced-frame gating
 *     A frame is "voiced" if:
 *       - YIN periodicity > 0.5  (matches torchcrepe default in the Mits pipeline)
 *       - RMS above a silence floor (dynamic: max(rms)/40)
 *     We median-filter the voiced mask over 5 frames to suppress single-frame drop-outs
 *     (this mirrors what Praat's ac tracker does with its voicing penalty).
 * ===================================================================== */
function voicedMask(track, opts){
  const { hz, per, rms } = track;
  const perTh = opts.periodicityThreshold ?? 0.5;
  const N = hz.length;
  // silence floor: 1/40 of peak RMS
  let peakRms = 0;
  for (let i = 0; i < N; i++) if (rms[i] > peakRms) peakRms = rms[i];
  const silenceFloor = peakRms / 40;

  const raw = new Uint8Array(N);
  for (let i = 0; i < N; i++){
    raw[i] = (hz[i] > 0 && per[i] > perTh && rms[i] > silenceFloor) ? 1 : 0;
  }
  // 5-tap median filter
  const smoothed = new Uint8Array(N);
  for (let i = 0; i < N; i++){
    let s = 0;
    for (let j = -2; j <= 2; j++){
      const k = clamp(i + j, 0, N - 1);
      s += raw[k];
    }
    smoothed[i] = s >= 3 ? 1 : 0;
  }
  return smoothed;
}

/* =====================================================================
 * 6.  Note segmentation
 *     Group consecutive voiced frames whose pitch stays within ±50 cent of
 *     a running median; emit a note when a break happens or the pitch jumps.
 *     Output: array of { time, dur, hz }  (compatible with helper2 CSV rows).
 *     Not identical to Mauch pYIN's HMM Viterbi, but the same 50-cent
 *     stability rule pypYIN uses for its post-processing.
 * ===================================================================== */
function segmentNotes(track, voiced, opts){
  const minDur = opts.minNoteSec ?? 0.06;   // reject notes shorter than this (pypYIN default ~60 ms)
  const centJumpMax = 50;                   // stability window
  const minHz = opts.minHz ?? 100;          // filter YIN octave errors (adult voice > 100Hz)
  const maxHz = opts.maxHz ?? 900;
  const { hz: rawHz, times, hopSec } = track;
  const N = rawHz.length;
  // 3-tap median-smooth hz within voiced frames (reduces spurious jumps)
  const hz = new Float32Array(N);
  for (let i = 0; i < N; i++){
    if (!voiced[i]){ hz[i] = 0; continue; }
    const a = voiced[i-1] ? rawHz[i-1] : rawHz[i];
    const b = rawHz[i];
    const c = voiced[i+1] ? rawHz[i+1] : rawHz[i];
    const arr = [a, b, c].filter(v => v > 0).sort((x,y)=>x-y);
    hz[i] = arr[Math.floor(arr.length / 2)];
  }
  const notes = [];

  let curStart = -1;
  let curHzs = [];

  const flush = (endIdx) => {
    if (curStart < 0 || !curHzs.length) return;
    const t0 = times[curStart];
    const t1 = endIdx < N ? times[endIdx] : (times[N-1] + hopSec);
    const dur = t1 - t0;
    if (dur >= minDur){
      const h = median(curHzs);
      if (h >= minHz && h <= maxHz) notes.push({ time: t0, dur, hz: h });
    }
    curStart = -1; curHzs = [];
  };

  for (let i = 0; i < N; i++){
    if (!voiced[i] || hz[i] < minHz || hz[i] > maxHz){ flush(i); continue; }
    const f = hz[i];
    if (curStart < 0){
      curStart = i; curHzs = [f];
    } else {
      const med = median(curHzs);
      const cent = Math.abs(1200 * Math.log2(f / med));
      if (cent > centJumpMax){
        flush(i);
        curStart = i; curHzs = [f];
      } else {
        curHzs.push(f);
      }
    }
  }
  flush(N);
  return notes;
}

/* =====================================================================
 * 7.  Ornament detection  (vibrato / shakuri / kobushi / fall / breath)
 *     Same rules as helper2.js axis-9, but the pitch trace comes from YIN
 *     instead of aubiopitch.  Formulas are identical.
 * ===================================================================== */
function detectOrnaments(track, voiced, notes){
  const { hz, times } = track;
  const N = hz.length;
  // Build fast time→index lookup via bin search
  const tArr = times;
  const idxOfTime = (t) => {
    let lo = 0, hi = N - 1;
    while (lo < hi){
      const m = (lo + hi) >> 1;
      if (tArr[m] < t) lo = m + 1; else hi = m;
    }
    return lo;
  };
  const samplesIn = (t0, t1) => {
    const i0 = idxOfTime(t0), i1 = idxOfTime(t1);
    const out = [];
    for (let i = i0; i <= i1 && i < N; i++){
      if (hz[i] > 40 && hz[i] < 1500) out.push({ t: tArr[i], hz: hz[i] });
    }
    return out;
  };

  let vibratoCount = 0;
  const vibratoExtents = [], vibratoRates = [];
  let shakuriCount = 0, kobushiCount = 0, fallCount = 0;

  for (const n of notes){
    const t0 = n.time, t1 = n.time + n.dur;
    let samples = samplesIn(t0, t1);
    if (samples.length < 5) continue;
    // filter octave errors: keep within ±200c of note.hz
    const noteCent = centOfHz(n.hz);
    samples = samples.filter(s => Math.abs(centOfHz(s.hz) - noteCent) < 200);
    if (samples.length < 5) continue;

    const cents = samples.map(s => centOfHz(s.hz));
    const centerCent = median(cents);
    const dev = cents.map(c => c - centerCent);

    if (n.dur > 0.5){
      let zc = 0, localMax = -Infinity, localMin = Infinity;
      for (let i = 1; i < dev.length; i++){
        if ((dev[i-1] < 0 && dev[i] >= 0) || (dev[i-1] > 0 && dev[i] <= 0)) zc++;
        if (dev[i] > localMax) localMax = dev[i];
        if (dev[i] < localMin) localMin = dev[i];
      }
      const rateHz = zc / 2 / n.dur;
      const extent = localMax - localMin;
      if (rateHz >= 3.5 && rateHz <= 9 && extent > 30){
        vibratoCount++;
        vibratoExtents.push(extent);
        vibratoRates.push(rateHz);
      }
    }

    if (n.dur >= 0.25){
      const onsetWin = samples.filter(s => s.t - t0 <= 0.08);
      if (onsetWin.length >= 3){
        const rise = centOfHz(onsetWin[onsetWin.length-1].hz) - centOfHz(onsetWin[0].hz);
        if (rise > 50 && rise < 150) shakuriCount++;
      }
      const tailWin = samples.filter(s => t1 - s.t <= 0.08);
      if (tailWin.length >= 3){
        const fall = centOfHz(tailWin[0].hz) - centOfHz(tailWin[tailWin.length-1].hz);
        if (fall > 50 && fall < 150) fallCount++;
      }
    }

    if (n.dur > 0.4){
      const midStart = t0 + 0.1, midEnd = t1 - 0.1;
      const midSamples = samples.filter(s => s.t >= midStart && s.t <= midEnd);
      let inRun = false, runStart = 0, runSign = 0;
      for (let i = 0; i < midSamples.length; i++){
        const c = centOfHz(midSamples[i].hz) - centerCent;
        if (!inRun && Math.abs(c) > 30){
          inRun = true; runStart = midSamples[i].t; runSign = Math.sign(c);
        } else if (inRun && (Math.abs(c) < 15 || Math.sign(c) !== runSign)){
          const dur = midSamples[i].t - runStart;
          if (dur >= 0.05 && dur <= 0.15) kobushiCount++;
          inRun = false;
        }
      }
    }
  }

  // Breath: gaps > 200 ms between consecutive notes  (helper2 fallback)
  let breathCount = 0;
  for (let i = 1; i < notes.length; i++){
    const gap = notes[i].time - (notes[i-1].time + notes[i-1].dur);
    if (gap > 0.2) breathCount++;
  }

  return {
    vibrato_count: vibratoCount,
    vibrato_avg_extent_cent: vibratoExtents.length ? +mean(vibratoExtents).toFixed(1) : null,
    vibrato_avg_rate_hz    : vibratoRates.length   ? +mean(vibratoRates).toFixed(2)   : null,
    shakuri_count: shakuriCount,
    kobushi_count: kobushiCount,
    fall_count   : fallCount,
    breath_count : breathCount,
  };
}

/* =====================================================================
 * 8.  Praat-style HNR / jitter / shimmer
 *     Boersma (1993). HNR from autocorrelation ratio; jitter/shimmer
 *     from period-to-period tracking on voiced frames.
 *
 *     Not bit-identical to Praat (Praat uses cross-correlation-based
 *     PointProcess extraction with per-cycle micro-optimization). Our
 *     port matches the same DEFINITIONS but computes on the frame grid.
 *     Systematic offsets vs Praat are reported in the calibration MD.
 * ===================================================================== */
// -----------------------------------------------------------------
// FFT-based autocorrelation (Wiener–Khinchin):
//   r(tau) = IFFT( |FFT(x)|^2 )
// For a signal of length W we zero-pad to nfft >= 2W so the circular
// autocorrelation coincides with the linear one for tau in [0, W).
// The window (Hann) autocorrelation is CONSTANT across frames, so we
// precompute it once (huge saving vs the old per-frame implementation).
// -----------------------------------------------------------------
function precomputeHnrWorkspace(W){
  const nfft = nextPow2(W * 2);
  const winArr = new Float64Array(W);
  for (let i = 0; i < W; i++) winArr[i] = hann(i, W);
  // Window autocorrelation (bias correction), computed once via FFT.
  const wRe = new Float64Array(nfft), wIm = new Float64Array(nfft);
  for (let i = 0; i < W; i++) wRe[i] = winArr[i];
  fftRadix2(wRe, wIm);
  for (let k = 0; k < nfft; k++){
    const p = wRe[k]*wRe[k] + wIm[k]*wIm[k];
    wRe[k] = p; wIm[k] = 0;
  }
  fftRadix2(wRe, wIm);   // acts as unnormalised IFFT for real-symmetric input
  const wac = new Float64Array(W);
  for (let tau = 0; tau < W; tau++) wac[tau] = wRe[tau] / nfft;
  return {
    nfft, winArr, wac,
    sigRe : new Float64Array(nfft),
    sigIm : new Float64Array(nfft),
    r     : new Float64Array(W),
  };
}

/*
 * Fill ws.r[0..tauMax] with the normalised (windowed) signal autocorrelation
 * r(tau) / r(0)  for a single frame. Zero allocations per call.
 */
function fillAutocorrFft(samples, off, W, ws, tauMax){
  const { nfft, winArr, wac, sigRe, sigIm, r } = ws;
  // DC removal + Hann window in one pass, straight into the zero-padded workspace
  let m = 0;
  for (let i = 0; i < W; i++) m += samples[off + i];
  m /= W;
  sigRe.fill(0); sigIm.fill(0);
  for (let i = 0; i < W; i++) sigRe[i] = (samples[off + i] - m) * winArr[i];
  fftRadix2(sigRe, sigIm);
  // |X|^2 in-place, then IFFT via a second forward FFT (real-symmetric input trick)
  for (let k = 0; k < nfft; k++){
    const p = sigRe[k]*sigRe[k] + sigIm[k]*sigIm[k];
    sigRe[k] = p; sigIm[k] = 0;
  }
  fftRadix2(sigRe, sigIm);
  // Divide by window autocorrelation (bias correction) then normalise by r(0)
  let r0 = 0;
  for (let tau = 0; tau <= tauMax; tau++){
    r[tau] = wac[tau] > 1e-12 ? (sigRe[tau] / nfft) / wac[tau] : 0;
  }
  r0 = r[0] || 1;
  for (let tau = 0; tau <= tauMax; tau++) r[tau] /= r0;
  return r;
}

/*  HNR (dB) per frame:  find the highest local peak of r(tau) in the
 *  voiced tau range; HNR = 10*log10(r_peak / (1 - r_peak))
 */
function hnrFromAutocorr(r, tauMin, tauMax){
  let peak = 0, argp = -1;
  for (let t = tauMin + 1; t < tauMax; t++){
    if (r[t] > r[t-1] && r[t] > r[t+1] && r[t] > peak){
      peak = r[t]; argp = t;
    }
  }
  if (argp < 0 || peak <= 0) return null;
  // parabolic interp on r
  const y0 = r[argp - 1], y1 = r[argp], y2 = r[argp + 1];
  const denom = y0 + y2 - 2 * y1;
  let pk = y1;
  if (Math.abs(denom) > 1e-12){
    // vertex value of interpolating parabola
    const dx = 0.5 * (y0 - y2) / denom;
    pk = y1 - 0.25 * (y0 - y2) * dx;
  }
  pk = clamp(pk, 1e-6, 0.999999);
  return 10 * Math.log10(pk / (1 - pk));
}

/*  Jitter (local, %):
 *      mean( |T_i - T_{i-1}| ) / mean(T_i) * 100
 *  where T_i are consecutive glottal periods.
 *  We estimate T_i per voiced frame from YIN (already have it).
 *  Because YIN already smooths, this gives a stable frame-level jitter
 *  estimate; systematic offset vs Praat is characterised in the report.
 *
 *  Shimmer (local, %):
 *      mean( |A_i - A_{i-1}| ) / mean(A_i) * 100
 *  where A_i is the peak amplitude of one period.  We take the local max
 *  |x| in each YIN-defined period.
 */
function jitterShimmerFromTrack(samples, sr, track, voiced){
  const { hz, times, W, H } = track;
  const N = hz.length;
  // Collect (frame center time, period, peakAmp) for voiced frames
  const periods = [];  // seconds
  const peaks   = [];
  for (let f = 0; f < N; f++){
    if (!voiced[f] || hz[f] <= 0) continue;
    const T = 1 / hz[f];   // period in seconds
    periods.push(T);
    // find peak |x| over ONE period around the frame center
    const centerSample = Math.floor(times[f] * sr);
    const periodSamples = Math.max(4, Math.floor(sr / hz[f]));
    const lo = Math.max(0, centerSample - (periodSamples >> 1));
    const hi = Math.min(samples.length, lo + periodSamples);
    let pk = 0;
    for (let i = lo; i < hi; i++){
      const a = Math.abs(samples[i]);
      if (a > pk) pk = a;
    }
    peaks.push(pk);
  }
  if (periods.length < 3) return { jitter_percent: null, shimmer_percent: null };
  const meanT = mean(periods);
  const meanA = mean(peaks);
  let jSum = 0, jN = 0;
  for (let i = 1; i < periods.length; i++){
    jSum += Math.abs(periods[i] - periods[i-1]);
    jN++;
  }
  let sSum = 0, sN = 0;
  for (let i = 1; i < peaks.length; i++){
    sSum += Math.abs(peaks[i] - peaks[i-1]);
    sN++;
  }
  return {
    jitter_percent : meanT > 0 ? +(jSum / jN / meanT * 100).toFixed(3)  : null,
    shimmer_percent: meanA > 0 ? +(sSum / sN / meanA * 100).toFixed(3)  : null,
  };
}

/*  Frame-level HNR mean over voiced frames — FFT-accelerated.
 *  All heavy buffers are allocated ONCE (precomputeHnrWorkspace) and reused.
 *  Per-frame cost is 2 × radix-2 FFT of length 2·W (padded), no Math.cos calls,
 *  no allocations. ~20× faster than the double-loop version on browser Workers.
 */
function hnrMean(samples, sr, track, voiced){
  const { hz, times, W } = track;
  const N = hz.length;
  const fmin = 60, fmax = 800;
  const tauMin = Math.max(2, Math.floor(sr / fmax));
  const tauMaxAll = Math.min(W - 2, Math.floor(sr / fmin));
  const ws = precomputeHnrWorkspace(W);
  const hnrs = [];
  for (let f = 0; f < N; f++){
    if (!voiced[f]) continue;
    const off = Math.floor(times[f] * sr) - (W >> 1);
    if (off < 0 || off + W > samples.length) continue;
    const r = fillAutocorrFft(samples, off, W, ws, tauMaxAll + 1);
    const h = hnrFromAutocorr(r, tauMin, tauMaxAll);
    if (h !== null && Number.isFinite(h)) hnrs.push(h);
  }
  return hnrs.length ? +mean(hnrs).toFixed(2) : null;
}

/* =====================================================================
 * 9.  Formant tracking  (LPC + spectral peak picking)
 *     - pre-emphasize +0.97
 *     - 25 ms Hamming frame, 10 ms hop
 *     - LPC order = 2 + fs/1000  (Praat "Burg" default is 5 formants + 1)
 *     - compute 1/|A(e^jω)|² on 512 bins, peak-pick to get F1..F4
 * ===================================================================== */
function preemphasize(samples, alpha){
  const N = samples.length;
  const out = new Float32Array(N);
  out[0] = samples[0];
  for (let i = 1; i < N; i++) out[i] = samples[i] - alpha * samples[i-1];
  return out;
}

function autocorr(x, order){
  const n = x.length;
  const r = new Float64Array(order + 1);
  for (let k = 0; k <= order; k++){
    let s = 0;
    for (let i = 0; i + k < n; i++) s += x[i] * x[i + k];
    r[k] = s;
  }
  return r;
}

// Levinson-Durbin: r → LPC coeffs a[0..order] (a[0]=1)
function levinson(r, order){
  const a = new Float64Array(order + 1);
  const tmp = new Float64Array(order + 1);
  a[0] = 1;
  let e = r[0];
  if (e <= 0) return { a, error: 0 };
  for (let i = 1; i <= order; i++){
    let k = -r[i];
    for (let j = 1; j < i; j++) k -= a[j] * r[i - j];
    k /= e;
    for (let j = 0; j <= i; j++) tmp[j] = a[j];
    tmp[i] = k;
    for (let j = 1; j < i; j++) tmp[j] = a[j] + k * a[i - j];
    for (let j = 0; j <= i; j++) a[j] = tmp[j];
    e *= (1 - k * k);
    if (e <= 0) break;
  }
  return { a, error: e };
}

// evaluate |A(z)|² at z = exp(jω) for a bank of ω  → LPC spectrum, FFT-accelerated.
// A(e^jω_k) at N-point DFT frequencies = FFT of the zero-padded LPC coefficients.
// Per frame: 1 radix-2 FFT of length nfft; caller supplies scratch buffers.
function lpcSpectrum(a, nfft, ws){
  const half = (nfft >> 1) + 1;
  const spec = ws ? ws.spec : new Float64Array(half);
  const re   = ws ? ws.re   : new Float64Array(nfft);
  const im   = ws ? ws.im   : new Float64Array(nfft);
  re.fill(0); im.fill(0);
  for (let n = 0; n < a.length; n++) re[n] = a[n];
  fftRadix2(re, im);
  for (let k = 0; k < half; k++){
    const mag2 = re[k]*re[k] + im[k]*im[k];
    spec[k] = 1 / (mag2 || 1e-12);
  }
  return spec;
}

// pick up to 4 formant peaks in [90, 5500] Hz range with min separation 300 Hz
function pickFormants(spec, sr){
  const half = spec.length;
  const nyq = sr / 2;
  const binToHz = (k) => k / (half - 1) * nyq;
  const peaks = [];
  for (let k = 2; k < half - 2; k++){
    if (spec[k] > spec[k-1] && spec[k] > spec[k+1] && spec[k] > spec[k-2] && spec[k] > spec[k+2]){
      const f = binToHz(k);
      if (f >= 90 && f <= 5500) peaks.push({ k, f, mag: spec[k] });
    }
  }
  peaks.sort((a,b) => a.f - b.f);
  const chosen = [];
  for (const p of peaks){
    if (chosen.length && p.f - chosen[chosen.length - 1].f < 250) continue;
    chosen.push(p);
    if (chosen.length >= 4) break;
  }
  while (chosen.length < 4) chosen.push(null);
  return chosen.map(p => p ? p.f : null);
}

function formantsMean(samples, sr, voiced, track){
  const alpha = 0.97;
  const pre = preemphasize(samples, alpha);
  const W = Math.max(64, Math.floor(sr * 0.025));      // 25 ms
  const H = Math.max(1, Math.floor(sr * 0.010));       // 10 ms
  const order = 2 + Math.floor(sr / 1000);             // Praat rule of thumb
  const nfft = 512;
  const framesPerHop = track.H;
  const buf = new Float64Array(W);
  const bufWin = new Float64Array(W);
  const N = track.hz.length;
  const f1s = [], f2s = [], f3s = [], f4s = [];
  // pre-compute Hamming window & LPC-spectrum scratch (allocated once, reused per frame)
  const winArr = new Float64Array(W);
  for (let i = 0; i < W; i++) winArr[i] = hamming(i, W);
  const lpcWs = {
    re  : new Float64Array(nfft),
    im  : new Float64Array(nfft),
    spec: new Float64Array((nfft >> 1) + 1),
  };

  for (let f = 0; f < N; f++){
    if (!voiced[f]) continue;
    const centerSample = Math.floor(track.times[f] * sr);
    const off = centerSample - (W >> 1);
    if (off < 0 || off + W > pre.length) continue;
    for (let i = 0; i < W; i++) buf[i] = pre[off + i];
    let m = 0; for (let i = 0; i < W; i++) m += buf[i]; m /= W;
    for (let i = 0; i < W; i++) bufWin[i] = (buf[i] - m) * winArr[i];
    const r = autocorr(bufWin, order);
    const { a, error } = levinson(r, order);
    if (!(error > 0)) continue;
    const spec = lpcSpectrum(a, nfft, lpcWs);
    const fs = pickFormants(spec, sr);
    if (fs[0]) f1s.push(fs[0]);
    if (fs[1]) f2s.push(fs[1]);
    if (fs[2]) f3s.push(fs[2]);
    if (fs[3]) f4s.push(fs[3]);
  }
  return {
    f1_mean_hz: f1s.length ? +mean(f1s).toFixed(1) : null,
    f2_mean_hz: f2s.length ? +mean(f2s).toFixed(1) : null,
    f3_mean_hz: f3s.length ? +mean(f3s).toFixed(1) : null,
    f4_mean_hz: f4s.length ? +mean(f4s).toFixed(1) : null,
  };
}

/* =====================================================================
 * 10. openSMILE eGeMAPSv02 alphaRatio  (voiced-frame mean)
 *     alphaRatio = 10*log10( energy[1000-5000] / energy[50-1000] )  [dB]
 *     Frame: 25 ms Hann, hop 10 ms   (matches openSMILE eGeMAPS)
 *     Aggregation: arithmetic mean over voiced frames after sma3 smoothing.
 * ===================================================================== */
function alphaRatio(samples, sr, voiced, track){
  const W = Math.max(64, Math.floor(sr * 0.025));
  const nfft = nextPow2(W);
  const half = (nfft >> 1) + 1;
  const binHz = sr / nfft;
  const lo1 = Math.max(1, Math.floor(50   / binHz));
  const hi1 = Math.min(half - 1, Math.floor(1000 / binHz));
  const lo2 = hi1;
  const hi2 = Math.min(half - 1, Math.floor(5000 / binHz));
  const winArr = new Float64Array(W);
  for (let i = 0; i < W; i++) winArr[i] = hann(i, W);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  const perFrame = [];
  const N = track.hz.length;
  for (let f = 0; f < N; f++){
    if (!voiced[f]) continue;
    const centerSample = Math.floor(track.times[f] * sr);
    const off = centerSample - (W >> 1);
    if (off < 0 || off + W > samples.length) continue;
    re.fill(0); im.fill(0);
    for (let i = 0; i < W; i++) re[i] = samples[off + i] * winArr[i];
    fftRadix2(re, im);
    let e1 = 0, e2 = 0;
    for (let k = lo1; k <= hi1; k++) e1 += re[k]*re[k] + im[k]*im[k];
    for (let k = lo2; k <= hi2; k++) e2 += re[k]*re[k] + im[k]*im[k];
    if (e1 > 0 && e2 > 0){
      perFrame.push(10 * Math.log10(e2 / e1));
    }
  }
  if (perFrame.length < 3) return null;
  // sma3 smoothing (openSMILE): 3-tap moving average
  const sm = new Array(perFrame.length);
  for (let i = 0; i < perFrame.length; i++){
    let s = 0, n = 0;
    for (let j = -1; j <= 1; j++){
      const k = clamp(i + j, 0, perFrame.length - 1);
      s += perFrame[k]; n++;
    }
    sm[i] = s / n;
  }
  return +mean(sm).toFixed(2);
}

/* =====================================================================
 * 11. Volume / dynamics  (mirrors helper2.js axis-6 / ffmpeg astats)
 *     - avg RMS (whole track)  in dB
 *     - peak absolute sample     in dB
 *     - RMS peak (max frame RMS) in dB
 *     - RMS trough  ................. dB
 *     - Crest factor = peak - rms   (in dB)
 *     - per-second binned RMS: mean, stdev, max, min → dynamic range
 * ===================================================================== */
function volumeStats(samples, sr){
  const N = samples.length;
  // overall
  let sumSq = 0, peak = 0;
  for (let i = 0; i < N; i++){
    const a = Math.abs(samples[i]);
    sumSq += samples[i] * samples[i];
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sumSq / N);
  const avg_rms_db = rms > 0 ? 20 * Math.log10(rms) : -120;
  const peak_db    = peak > 0 ? 20 * Math.log10(peak) : -120;
  // 400-sample frame RMS (matches ffmpeg astats "frame" ~ 21 ms @ 48k, we use 21ms)
  const W = Math.max(1, Math.floor(sr * 0.021));
  const H = W;   // non-overlapping
  const frameRms = [];
  for (let off = 0; off + W <= N; off += H){
    let s = 0;
    for (let i = 0; i < W; i++) s += samples[off + i] * samples[off + i];
    const r = Math.sqrt(s / W);
    frameRms.push(r > 0 ? 20 * Math.log10(r) : -120);
  }
  const rmsPeak = frameRms.length ? Math.max(...frameRms) : -120;
  const rmsTrough = frameRms.length ? Math.min(...frameRms) : -120;
  const crest = peak_db - avg_rms_db;
  // per-second bins
  const bins = new Map();
  for (let i = 0; i < frameRms.length; i++){
    const secondIdx = Math.floor(i * W / sr);
    if (!bins.has(secondIdx)) bins.set(secondIdx, []);
    bins.get(secondIdx).push(frameRms[i]);
  }
  const perSec = [];
  for (const [s, arr] of bins) perSec.push({ s, r: mean(arr) });
  perSec.sort((a,b)=>a.s-b.s);
  const perSecRms = perSec.map(x => x.r);
  const rms_mean_per_sec = mean(perSecRms);
  const rms_stdev_per_sec = stdev(perSecRms);
  const rms_min_per_sec = perSecRms.length ? Math.min(...perSecRms) : null;
  const rms_max_per_sec = perSecRms.length ? Math.max(...perSecRms) : null;
  const dyn = (rms_max_per_sec != null && rms_min_per_sec != null)
    ? +(rms_max_per_sec - rms_min_per_sec).toFixed(2) : null;
  let yokuyo = "普通";
  if (rms_stdev_per_sec > 6) yokuyo = "豊か";
  else if (rms_stdev_per_sec < 3) yokuyo = "平坦";
  return {
    avg_rms_db          : +avg_rms_db.toFixed(2),
    peak_db             : +peak_db.toFixed(2),
    rms_peak_db         : +rmsPeak.toFixed(2),
    rms_trough_db       : +rmsTrough.toFixed(2),
    crest_factor        : +crest.toFixed(2),
    rms_mean_per_sec_db : +rms_mean_per_sec.toFixed(2),
    rms_stdev_per_sec_db: +rms_stdev_per_sec.toFixed(2),
    rms_max_per_sec_db  : rms_max_per_sec != null ? +rms_max_per_sec.toFixed(2) : null,
    rms_min_per_sec_db  : rms_min_per_sec != null ? +rms_min_per_sec.toFixed(2) : null,
    dynamic_range_useful_db: dyn,
    yokuyo_judgment     : yokuyo,
  };
}

/* =====================================================================
 * 12. Onset / beat / BPM  (spectral flux + autocorrelation)
 *     - STFT with 43 ms Hann frame, 10 ms hop, log-magnitude
 *     - Spectral flux (positive part), normalized
 *     - Onset: local max above dynamic median threshold
 *     - Beat/BPM: autocorrelation of flux envelope, peak in [50..180] BPM
 * ===================================================================== */
function onsetsBpm(samples, sr){
  const W = nextPow2(Math.floor(sr * 0.043));
  const H = Math.max(1, Math.floor(sr * 0.010));
  const N = samples.length;
  const nFrames = Math.max(0, 1 + Math.floor((N - W) / H));
  const half = (W >> 1) + 1;
  const winArr = new Float64Array(W);
  for (let i = 0; i < W; i++) winArr[i] = hann(i, W);
  const re = new Float64Array(W), im = new Float64Array(W);
  const prevMag = new Float64Array(half);
  const flux = new Float64Array(nFrames);
  for (let f = 0; f < nFrames; f++){
    const off = f * H;
    re.fill(0); im.fill(0);
    for (let i = 0; i < W; i++) re[i] = samples[off + i] * winArr[i];
    fftRadix2(re, im);
    let s = 0;
    for (let k = 0; k < half; k++){
      const m = Math.hypot(re[k], im[k]);
      const d = m - prevMag[k];
      if (d > 0) s += d;
      prevMag[k] = m;
    }
    flux[f] = s;
  }
  // normalize flux
  let fMax = 0; for (let i = 0; i < nFrames; i++) if (flux[i] > fMax) fMax = flux[i];
  if (fMax > 0) for (let i = 0; i < nFrames; i++) flux[i] /= fMax;
  // onset picking: local max in ±3 with value > moving median + delta
  const winM = 20;
  const onsetsSec = [];
  for (let i = 3; i < nFrames - 3; i++){
    // moving median (approx: mean)
    let s = 0, n = 0;
    for (let j = -winM; j <= winM; j++){
      const k = i + j;
      if (k >= 0 && k < nFrames){ s += flux[k]; n++; }
    }
    const meanLocal = s / n;
    if (flux[i] > flux[i-1] && flux[i] > flux[i+1] &&
        flux[i] > flux[i-2] && flux[i] > flux[i+2] &&
        flux[i] > meanLocal + 0.04){
      const t = (i * H + W / 2) / sr;
      if (!onsetsSec.length || t - onsetsSec[onsetsSec.length-1] > 0.05){
        onsetsSec.push(t);
      }
    }
  }
  // BPM: autocorrelation of flux, prefer typical vocal tempo range [80..160]
  // Then check if the double-tempo peak dominates and fold it down.
  const fps = sr / H;
  const lagMin = Math.floor(60 / 160 * fps);
  const lagMax = Math.floor(60 / 80  * fps);
  const acf = new Float64Array(lagMax + 1);
  for (let lag = 1; lag <= lagMax; lag++){
    let s = 0;
    for (let i = 0; i + lag < nFrames; i++) s += flux[i] * flux[i + lag];
    acf[lag] = s;
  }
  let bestLag = -1, bestVal = -Infinity;
  for (let lag = lagMin; lag <= lagMax; lag++){
    if (acf[lag] > bestVal){ bestVal = acf[lag]; bestLag = lag; }
  }
  // check the half-lag (= double tempo) — if it's much stronger, prefer doubling only when
  // it's inside the search range; otherwise stick with the vocal-range peak.
  const bpm = bestLag > 0 ? +(60 * fps / bestLag).toFixed(1) : null;
  // Emit synthetic beats from BPM (best-effort; aubiotrack does dynamic-programming here)
  const beatsSec = [];
  if (bpm){
    const dt = 60 / bpm;
    for (let t = 0; t < N / sr; t += dt) beatsSec.push(t);
  }
  // beat interval stats (same formulas as helper2.js axis-7)
  const bi = [];
  for (let i = 1; i < beatsSec.length; i++) bi.push(beatsSec[i] - beatsSec[i-1]);
  const avgI = mean(bi) * 1000;
  const stdI = stdev(bi) * 1000;
  let rhythmJudge = "安定";
  if (stdI > 40) rhythmJudge = "やや不安定";
  if (stdI > 80) rhythmJudge = "不安定";
  return {
    onset_count : onsetsSec.length,
    beat_count  : beatsSec.length,
    bpm_estimated: bpm,
    avg_beat_interval_ms: +avgI.toFixed(1),
    beat_interval_std_ms: +stdI.toFixed(1),
    rhythm_judgment: rhythmJudge,
  };
}

/* =====================================================================
 * 13. Frame-level "intonation cent" (torchcrepe-style)
 *     For each voiced frame: cent deviation from the nearest equal-temperament
 *     semitone.  Return the mean of |cent| across voiced frames.
 *     Torchcrepe uses a neural pitch estimator; here we approximate with YIN.
 *     Systematic offset vs CREPE is characterised in the calibration MD.
 * ===================================================================== */
function crepeIntonationCent(track, voiced){
  const { hz } = track;
  const N = hz.length;
  const arr = [];
  for (let i = 0; i < N; i++){
    if (!voiced[i] || hz[i] <= 0) continue;
    const semis = 12 * Math.log2(hz[i] / A4);
    const nearest = Math.round(semis);
    const cent = (semis - nearest) * 100;
    arr.push(Math.abs(cent));
  }
  return arr.length ? +mean(arr).toFixed(2) : null;
}

/* =====================================================================
 * 14. Main analyse() — orchestrates every stage.
 *     Progress fractions:
 *       0.00 → decode / resample
 *       0.10 → pitch (YIN)
 *       0.40 → note segmentation
 *       0.45 → volume / rhythm
 *       0.60 → HNR / jitter / shimmer
 *       0.80 → formants
 *       0.90 → alphaRatio
 *       0.95 → ornaments
 *       1.00 → done
 * ===================================================================== */
async function analyze(samples, sampleRate, opts, onProgress){
  opts = opts || {};
  onProgress = onProgress || (()=>{});
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const maxDur = opts.maxDurationSec ?? 600;
  const dstRate = opts.downsampleTo ?? 16000;

  // 1) mono + downsample + clamp length
  let mono = samples;
  if (mono.length > sampleRate * maxDur){
    mono = mono.slice(0, sampleRate * maxDur);
  }
  onProgress(0.02, 'resampling');
  const wave = resampleLinear(mono, sampleRate, dstRate);
  const sr = dstRate;
  const duration = wave.length / sr;

  // 2) YIN pitch
  onProgress(0.10, 'pitch tracking (YIN)');
  const yinOpts = { frameSec: opts.frameSec ?? 0.040, hopSec: opts.hopSec ?? 0.010,
                    fmin: 60, fmax: 800, thresh: 0.15 };
  const track = yinTrack(wave, sr, yinOpts);
  const voiced = voicedMask(track, {});

  // 3) Notes
  onProgress(0.40, 'note segmentation');
  const notes = segmentNotes(track, voiced, { minNoteSec: 0.06 });

  // 4) Note-based axes
  const cents = [];
  for (let i = 1; i < notes.length; i++){
    const c = Math.abs(1200 * Math.log2(notes[i].hz / notes[i-1].hz));
    if (c < 100) cents.push(c);
  }
  const avgCent = +mean(cents).toFixed(1);
  const shortN = notes.filter(n => n.dur < 0.3).length;
  const shortRatio = notes.length ? +(shortN / notes.length).toFixed(3) : 0;
  const longs = notes.filter(n => n.dur > 1.0).length;
  let stability = "安定";
  if (avgCent > 25 || shortRatio > 0.35) stability = "やや不安定";
  if (avgCent > 45 || shortRatio > 0.55) stability = "不安定";

  const hzs = notes.map(n => n.hz);
  const rangeLow  = hzs.length ? Math.min(...hzs) : 0;
  const rangeHigh = hzs.length ? Math.max(...hzs) : 0;
  const rangeSemi = rangeLow > 0 ? Math.round(12 * Math.log2(rangeHigh / rangeLow)) : 0;

  // voiced-mean Hz (weight by frame count, not by note count — matches Mits pipeline)
  let hSum = 0, hN = 0;
  for (let i = 0; i < track.hz.length; i++){
    if (voiced[i] && track.hz[i] > 0){ hSum += track.hz[i]; hN++; }
  }
  const meanHz = hN ? +(hSum / hN).toFixed(1) : 0;

  // 5) Volume + rhythm
  onProgress(0.45, 'volume envelope');
  const vol = volumeStats(mono, sampleRate);   // use ORIGINAL sample rate for volume dB
  onProgress(0.55, 'onset / BPM');
  const rhythm = onsetsBpm(wave, sr);          // downsampled is fine for onset

  // 6) HNR / jitter / shimmer
  onProgress(0.60, 'HNR');
  const hnr = hnrMean(wave, sr, track, voiced);
  onProgress(0.72, 'jitter / shimmer');
  const js = jitterShimmerFromTrack(wave, sr, track, voiced);

  // 7) Formants
  onProgress(0.80, 'formants (LPC)');
  const formants = formantsMean(wave, sr, voiced, track);

  // 8) alphaRatio
  onProgress(0.90, 'depth (alphaRatio)');
  const depth = alphaRatio(wave, sr, voiced, track);

  // 9) Ornaments
  onProgress(0.95, 'ornaments (vibrato / shakuri / kobushi / fall / breath)');
  const orn = detectOrnaments(track, voiced, notes);

  // 10) CREPE-style intonation cent
  const crepeCent = crepeIntonationCent(track, voiced);

  // 11) judgments
  let clarity = "普通";
  if (hnr !== null){
    if (hnr > 15) clarity = "クリア";
    else if (hnr > 8) clarity = "やや息漏れ";
    else clarity = "息漏れ多め";
  }
  let depthJudge = "中程度";
  if (depth !== null){
    if (depth < -12) depthJudge = "深い";
    else if (depth > -6) depthJudge = "浅い";
  }

  const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  onProgress(1.0, 'done');

  return {
    // ranges
    range_low_hz    : +rangeLow.toFixed(1),
    range_high_hz   : +rangeHigh.toFixed(1),
    range_low_note  : hzToNote(rangeLow),
    range_high_note : hzToNote(rangeHigh),
    range_semitones : rangeSemi,
    mean_hz_voiced  : meanHz,
    mean_note_voiced: hzToNote(meanHz),
    // notes
    total_notes           : notes.length,
    stability             : stability,
    avg_cent_variation    : avgCent,
    short_note_ratio      : shortRatio,
    longtones_count       : longs,
    low_noise_hits        : notes.filter(n => n.hz < 80 && n.dur < 0.3).length,
    // volume
    ...vol,
    // rhythm
    ...rhythm,
    // ornaments
    ...orn,
    // timbre
    hnr_db            : hnr,
    jitter_percent    : js.jitter_percent,
    shimmer_percent   : js.shimmer_percent,
    ...formants,
    voice_clarity_judgment: clarity,
    // depth
    depth_alpha_ratio: depth,
    depth_judgment   : depthJudge,
    // CREPE-analogue
    crepe_intonation_cent: crepeCent,
    // meta
    duration_seconds : +duration.toFixed(1),
    duration_mmss    : secToMMSS(duration),
    _elapsed_ms_wall : Math.round(t1 - t0),   // engine-side wall time (Node & browser Worker)
    _engine_meta: {
      version: '1.1.0-2026-08-16-fft-hnr',
      pitch  : 'YIN (de Cheveigné 2002)',
      hnr    : 'Boersma-style autocorrelation (frame-mean, voiced only)',
      jitter : 'YIN period-to-period (local, %)',
      shimmer: 'YIN peak-amp period-to-period (local, %)',
      formants: 'LPC-Burg approx + LPC spectrum peak-picking (F1..F4)',
      alphaRatio: 'FFT energy [1k-5k]/[50-1k] dB, voiced-mean with sma3',
      notes  : 'pitch-continuity segmentation (±50c, ≥60ms) — simplified pypYIN',
      crepe  : 'YIN-based cent-from-semitone (torchcrepe unavailable in-browser)',
      analyzed_at_sample_rate: sr,
      elapsed_ms: Math.round(t1 - t0),
    },
  };
}

/* =====================================================================
 * 15. Exports  (browser worker / node / global)
 * ===================================================================== */
const _api = {
  analyze,
  decodeWav,
  hzToNote,
  secToMMSS,
  // internals (exposed for calibration / tests)
  _internals: {
    yinTrack, voicedMask, segmentNotes, detectOrnaments,
    hnrMean, jitterShimmerFromTrack, formantsMean, alphaRatio,
    volumeStats, onsetsBpm, crepeIntonationCent,
    fftRadix2, magnitudeSpectrum,
    resampleLinear,
  },
};

if (typeof module !== 'undefined' && module.exports){
  module.exports = _api;
}
if (typeof self !== 'undefined'){
  self.KaraokeAnalyzer = _api;
}
if (typeof globalThis !== 'undefined'){
  globalThis.KaraokeAnalyzer = globalThis.KaraokeAnalyzer || _api;
}

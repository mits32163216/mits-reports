/*!
 * analyzer.worker.js — Web Worker wrapper for analyzer.js
 *
 * Host page:
 *   const worker = new Worker('./analyzer.worker.js');
 *   worker.postMessage({ pcm, sampleRate, opts }, [pcm.buffer]);
 *   worker.onmessage = (e) => {
 *     if (e.data.type === 'progress') console.log(e.data.fraction, e.data.message);
 *     if (e.data.type === 'done')     console.log(e.data.result);
 *     if (e.data.type === 'error')    console.error(e.data.error);
 *   };
 *
 * Host is responsible for using AudioContext.decodeAudioData(fileBuffer)
 * to obtain the Float32Array PCM (mono mix-down if needed).
 */
'use strict';
importScripts('./analyzer.js');

self.onmessage = async (e) => {
  const { pcm, sampleRate, opts } = e.data;
  try {
    const result = await self.KaraokeAnalyzer.analyze(
      pcm, sampleRate, opts || {},
      (fraction, message) => self.postMessage({ type: 'progress', fraction, message })
    );
    self.postMessage({ type: 'done', result });
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err && err.stack || err) });
  }
};

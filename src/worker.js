import { generate } from './engine.js';

self.onmessage = e => {
  const res = generate(e.data, p => self.postMessage({ type: 'progress', ...p }));
  self.postMessage({ type: 'done', ...res });
};
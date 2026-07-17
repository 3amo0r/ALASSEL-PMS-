// store.js — renderer-side state cache + pub/sub.
// The actual file I/O lives in main.js; this module just keeps an
// in-memory copy so UI code can read/mutate synchronously, then persists
// on every mutation (debounced) via the preload bridge.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  let state = null;
  const listeners = new Set();
  let saveTimer = null;

  const Store = {
    async init() {
      state = await window.alaseelAPI.loadData();
      return state;
    },

    get() {
      return state;
    },

    // Shallow-merge a patch into state and notify + persist.
    set(patch) {
      state = Object.assign({}, state, patch);
      notify();
      scheduleSave();
      return state;
    },

    // For deep mutations (e.g. editing one room in the rooms array),
    // callers mutate `state` in place via Store.get() and then call
    // Store.touch() to trigger notify + persist without a shallow merge.
    touch() {
      notify();
      scheduleSave();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    async saveNow() {
      clearTimeout(saveTimer);
      return window.alaseelAPI.saveData(state);
    }
  };

  function notify() {
    listeners.forEach((fn) => {
      try { fn(state); } catch (e) { console.error('store listener error', e); }
    });
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      window.alaseelAPI.saveData(state).catch((e) => console.error('save failed', e));
    }, 250);
  }

  Alaseel.store = Store;
})();

/**
 * Lab Test API Controller (SPRINT-ERB-00 §5.3, SPRINT-ERB-05 R6, SPRINT-ERB-02 R6)
 * Consolidates workbench testing interfaces onto window.__lab.
 */

import { resolveFidelity } from './fidelity.js';

export function installLabApi({ stage, membrane, registry, recorder }) {
  const api = {
    version: 1,
    geometry: {
      get() {
        return stage ? stage.getGeometry() : null;
      },
      set(width, height) {
        if (stage) {
          stage.setViewportSize(Number(width), Number(height), 'px', '', null, 'custom');
        }
      },
      rotate() {
        if (stage) {
          stage.rotate('rotate');
        }
      },
      setOrientation(orientation) {
        if (stage) {
          const internal = (orientation === 'portrait' || orientation === 'vertical') ? 'vertical' : 'horizontal';
          stage.setOrientation(internal, 'rotate');
        }
      }
    },
    target: {
      get() {
        return membrane ? membrane.getTarget() : null;
      },
      set(url) {
        if (membrane) {
          membrane.bindTarget(url, 'custom');
        }
      }
    },
    registry,
    fidelity: {
      current() {
        const geom = stage ? stage.getGeometry() : null;
        const device = (geom && geom.deviceId && registry) ? registry.getById(geom.deviceId) : null;
        return resolveFidelity(device, 'lab-iframe');
      }
    },
    recorder: {
      start() {
        recorder?.start();
      },
      pause() {
        recorder?.pause();
      },
      resume() {
        recorder?.resume();
      },
      stop() {
        recorder?.stop();
      },
      reset() {
        recorder?.reset();
      },
      state() {
        return recorder?.state;
      },
      stats() {
        return recorder?.stats();
      },
      snapshot() {
        return recorder?.snapshot() || [];
      },
      source() {
        return recorder?.source;
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.__lab = api;
  }

  return api;
}

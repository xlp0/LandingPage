import { resolveFidelity } from './fidelity.js';

export function installLabApi({ stage, membrane, registry, recorder, workflow = null }) {
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
    },
    workflow: workflow
      ? {
          state() {
            return workflow.getState();
          },
          setStep(stepId) {
            return workflow.setStep(stepId);
          },
          targetTrace() {
            return workflow.getTargetTrace();
          },
          clearTargetTrace() {
            return workflow.clearTargetTrace();
          },
          syncTargetDom() {
            return workflow.syncTargetDom();
          },
          reportModuleFailure(failure) {
            return workflow.reportModuleFailure(failure);
          },
          loadOptionalModules(descriptors, options) {
            return workflow.loadOptionalModules(descriptors, options);
          },
          metrics() {
            return workflow.getMetrics();
          }
        }
      : null
  };

  if (typeof window !== 'undefined') {
    window.__lab = api;
  }

  return api;
}

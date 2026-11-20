import { resolveFidelity } from './fidelity.js';

export function installLabApi({
  stage,
  membrane,
  registry,
  recorder,
  workflow = null,
  bombadil = null,
  modeController = null
}) {
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
          stage.rotateStageViewport('rotate');
        }
      },
      setOrientation(orientation) {
        if (stage) {
          const normalized = orientation === 'landscape' ? 'landscape' : 'portrait';
          stage.setOrientation(normalized, 'rotate');
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
      : null,
    bombadil: bombadil
      ? {
        handles() {
          return bombadil.handles();
        },
        trigger(options) {
          return bombadil.trigger(options);
        },
        stop(runId) {
          return bombadil.stop(runId);
        },
        shrink(options) {
          return bombadil.shrink(options);
        },
        openTarget(targetOrHandle) {
          return bombadil.openTarget(targetOrHandle);
        },
        status() {
          return bombadil.status();
        },
        runs() {
          return bombadil.runs();
        },
        run(runId) {
          return bombadil.run(runId);
        },
        coverage() {
          return bombadil.coverage();
        },
        subscribe(listener) {
          return bombadil.subscribe(listener);
        }
      }
      : null,
    mode: modeController
      ? {
        get() {
          return modeController.get();
        },
        set(mode) {
          return modeController.set(mode);
        }
      }
      : null,
    arrangement: stage
      ? {
        get() {
          return stage.getArrangement ? stage.getArrangement() : null;
        },
        set(arrangement) {
          stage.setArrangement(arrangement);
        }
      }
      : null
  };

  if (typeof window !== 'undefined') {
    window.__lab = api;
  }

  return api;
}

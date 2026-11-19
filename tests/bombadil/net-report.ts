import { extract } from "@antithesishq/bombadil";

// One extractor for the page-state firing log (window.__netReport, BPV-03), shared by
// every spec so each trace carries it. Bombadil names snapshots after the spec's own
// variables, so this one arrives unnamed; scripts/bombadil/trace-to-net.mjs recognises
// it by its shape. Keep the netId, nonce, path and records fields.

export type Firing = {
  seq: number;
  transitionId: string | null;
  fromPlaceId: string | null;
  toPlaceId: string | null;
};

export const netReport = extract((state) => {
  const log = (state.window as unknown as { __netReport?: Firing[] }).__netReport;
  return {
    netId: state.document.body?.getAttribute("data-net-id") ?? null,
    nonce: state.document.body?.getAttribute("data-boot-nonce") ?? null,
    path: state.document.location.pathname,
    records: Array.isArray(log)
      ? log.map((record) => ({
          seq: Number(record.seq),
          transitionId: record.transitionId ?? null,
          fromPlaceId: record.fromPlaceId ?? null,
          toPlaceId: record.toPlaceId ?? null
        }))
      : []
  };
});

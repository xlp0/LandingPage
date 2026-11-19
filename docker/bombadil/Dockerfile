# Local Bombadil runner for Program BPV (decision BPV-D09). Runs on Docker on this machine,
# never on GitHub. See docker/bombadil/compose.yml and docs/08-testing/BOMBADIL_PROPERTY_TESTING.md.
#
# The repository is bind-mounted at /app at run time. The image only carries Chromium and
# the Linux node_modules, which the compose file keeps in a named volume so the host's
# macOS node_modules are never used inside the container.
FROM node:24-bookworm

# Bombadil 0.7.10 looks for /usr/bin/chromium; Debian ships it for amd64 and arm64.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Only the manifests, so the dependency layer is rebuilt only when they change.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/markdown-renderer/package.json packages/markdown-renderer/
COPY packages/p2p/package.json packages/p2p/
COPY packages/server/package.json packages/server/
RUN npm ci --no-audit --no-fund

# Chromium's sandbox needs user namespaces that Docker's default profile does not grant.
ENV BOMBADIL_EXTRA_ARGS=--no-sandbox \
    TZ=UTC

CMD ["bash", "scripts/bombadil/nightly.sh"]

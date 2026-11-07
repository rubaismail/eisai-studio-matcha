#!/bin/bash
# eisai-deploy: build a GitHub commit into its own release folder, switch the
# live API to it, and roll back automatically if it doesn't come up healthy.
#
# Installed on the server as /usr/local/sbin/eisai-deploy (see docs/deployment.md).
#
# Usage:
#   sudo eisai-deploy            deploy the latest commit on main
#   sudo eisai-deploy <commit>   deploy a specific full 40-character commit hash
#                                (an already built release switches instantly,
#                                which is also how you roll back)
#
# Safety rules:
#   - Nothing live changes until `npm ci && npm run check` passes for the new release.
#   - After switching, if /api/health isn't OK within 30 seconds, it switches back.
#   - It never deletes releases, secrets (/etc/eisai) or database data.
set -euo pipefail

REPO=https://github.com/rubaismail/eisai-studio-matcha.git
RELEASES=/srv/eisai/releases
CURRENT=/srv/eisai/current
BUILD_USER=ubuntu
BUILT_MARKER=.eisai-built   # written only after `npm run check` passes
HEALTH_URL=http://127.0.0.1:4000/api/health

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run with sudo: sudo eisai-deploy [commit]"

as_builder() { sudo -u "$BUILD_USER" -H "$@"; }

healthy() {
  for _ in $(seq 1 15); do
    if curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null | grep -q '"ok"'; then return 0; fi
    sleep 2
  done
  return 1
}

# Point `current` at a release in one atomic step and restart the API with that
# release's systemd unit.
activate() {
  # Each step checks its own result: `set -e` is off inside `if activate ...`.
  local rel=$1
  ln -sfn "$rel" "$CURRENT.next" || return 1
  mv -Tf "$CURRENT.next" "$CURRENT" || return 1
  if ! cmp -s "$rel/deploy/eisai-api.service" /etc/systemd/system/eisai-api.service; then
    cp "$rel/deploy/eisai-api.service" /etc/systemd/system/eisai-api.service || return 1
    systemctl daemon-reload || return 1
  fi
  systemctl restart eisai-api || return 1
  healthy
}

# --- which commit -----------------------------------------------------------
if [ $# -gt 1 ]; then die "usage: sudo eisai-deploy [commit]"; fi
if [ $# -eq 1 ]; then
  C=$1
else
  C=$(git ls-remote "$REPO" refs/heads/main | cut -c1-40)
fi
[[ "$C" =~ ^[0-9a-f]{40}$ ]] || die "need a full 40-character commit hash, got '$C'"

PREV=$(readlink -f "$CURRENT" || true)
REL="$RELEASES/$C"
say "Live now:  ${PREV:-none}"
say "Deploying: $C"
[ "$PREV" = "$REL" ] && { say "That commit is already live. Nothing to do."; exit 0; }

# --- build (skipped if this release was already built and checked) ---------
if [ -f "$REL/$BUILT_MARKER" ]; then
  say "Release already built and checked; switching to it."
else
  if [ ! -d "$REL/.git" ]; then
    say "Cloning into $REL"
    rm -rf "$REL"   # a half-finished folder from an interrupted clone
    as_builder git clone --quiet "$REPO" "$REL"
  fi
  as_builder git -C "$REL" fetch --quiet origin
  as_builder git -C "$REL" checkout --quiet --force "$C"
  [ "$(as_builder git -C "$REL" rev-parse HEAD)" = "$C" ] || die "checkout of $C failed"

  say "Installing and checking (lint, typecheck, tests, build). This takes several minutes."
  say "The live API keeps running the old release during this step."
  cd "$REL"
  if ! as_builder npm ci --no-audit --no-fund || ! as_builder npm run check; then
    die "install or check failed. Nothing live was changed. Fix it on GitHub and deploy again."
  fi
  as_builder touch "$REL/$BUILT_MARKER"
fi

# --- switch, verify, roll back on failure -----------------------------------
say "Switching the live API to $C"
if activate "$REL"; then
  say "Deployed $C"
  curl -s "$HEALTH_URL"; echo
  say "Releases on disk (newest first). Keep the last 2-3; never delete the live one:"
  ls -1t "$RELEASES"
  exit 0
fi

echo
journalctl -u eisai-api -n 30 --no-pager || true
if [ -n "$PREV" ] && [ -d "$PREV" ]; then
  say "New release is not healthy. Rolling back to $PREV"
  if activate "$PREV"; then
    die "deploy of $C failed (see log above). Rolled back; the old release is live."
  fi
  die "ROLLBACK ALSO FAILED. The API is down. Check: sudo journalctl -u eisai-api -n 100"
fi
die "deploy failed and there was no previous release to roll back to."

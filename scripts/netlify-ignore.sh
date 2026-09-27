#!/usr/bin/env bash
# Netlify "ignore" command (netlify.toml): exit 0 = skip this build, exit 1 = build.
# Every production deploy costs credits, and commits that only change docs or tooling
# do not change the site. When in doubt, build.
if [ -z "$CACHED_COMMIT_REF" ] || [ "$CACHED_COMMIT_REF" = "$COMMIT_REF" ]; then
  exit 1 # first build, or nothing to compare with
fi
git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- . \
  ':(exclude)docs' ':(exclude)SPEC.md' ':(exclude)CLAUDE.md' ':(exclude).github' ':(exclude).claude'

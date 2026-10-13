# Source this file from the repository root in bash or zsh.
if [ ! -x "$PWD/.tools/node/bin/node" ]; then
  echo 'From the repository root, run: node scripts/bootstrap.mjs'
  return 1
fi
export PATH="$PWD/.tools/node/bin:$PWD/.tools/flutter/bin:$PATH"
node --version
npm --version

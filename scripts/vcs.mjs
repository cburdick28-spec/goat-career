#!/usr/bin/env node
// Minimal git replacement using isomorphic-git, since this machine has no
// system git binary and no admin rights to install Xcode Command Line Tools.
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '..');
const REMOTE_URL = 'https://github.com/cburdick28/goat-career.git';
const AUTHOR = { name: 'cburdick28', email: 'cburdick28@users.noreply.github.com' };

const [, , cmd, ...args] = process.argv;

async function main() {
  switch (cmd) {
    case 'init': {
      await git.init({ fs, dir, defaultBranch: 'main' });
      console.log('Initialized empty repository in', dir);
      break;
    }
    case 'add': {
      const paths = args.length ? args : ['.'];
      for (const p of paths) {
        await addPath(p);
      }
      console.log('Added:', paths.join(', '));
      break;
    }
    case 'commit': {
      const mIndex = args.indexOf('-m');
      const message = mIndex >= 0 ? args[mIndex + 1] : 'commit';
      const sha = await git.commit({ fs, dir, message, author: AUTHOR });
      console.log('commit', sha);
      break;
    }
    case 'push': {
      const token = execSync('gh auth token').toString().trim();
      await git.push({
        fs,
        http,
        dir,
        remote: 'origin',
        url: REMOTE_URL,
        ref: 'main',
        onAuth: () => ({ username: token }),
      });
      console.log('Pushed to', REMOTE_URL);
      break;
    }
    case 'log': {
      const commits = await git.log({ fs, dir });
      for (const c of commits) {
        console.log(`${c.oid.slice(0, 7)} ${c.commit.message.split('\n')[0]}`);
      }
      break;
    }
    case 'head': {
      const oid = await git.resolveRef({ fs, dir, ref: 'HEAD' });
      console.log(oid);
      break;
    }
    default:
      console.error('Usage: vcs.mjs <init|add|commit|push|log|head> [args]');
      process.exit(1);
  }
}

async function addPath(relPath) {
  const abs = path.join(dir, relPath);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(abs)) {
      if (entry === '.git' || entry === 'node_modules' || entry === 'dist' || entry === '.superpowers') continue;
      await addPath(path.join(relPath, entry));
    }
  } else {
    await git.add({ fs, dir, filepath: relPath });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

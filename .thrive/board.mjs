#!/usr/bin/env node
// Thrive board helper. All project board writes go through this script.
//
//   node .thrive/board.mjs show <issue>
//   node .thrive/board.mjs set <issue> --status "In Development"
//   node .thrive/board.mjs list --status Refined
//   node .thrive/board.mjs sync          # refresh status option IDs from the API
//
// Status option IDs are cached in board.json so routine moves cost one API call
// instead of three. `sync` rewrites that cache after a column is added or renamed.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const configPath = join(here, 'board.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function die(message) {
  console.error(message);
  process.exit(1);
}

function items() {
  const raw = gh([
    'project', 'item-list', String(config.projectNumber),
    '--owner', config.owner, '--limit', '200', '--format', 'json',
  ]);
  return JSON.parse(raw).items;
}

function findItem(issue) {
  const item = items().find((i) => i.content?.number === Number(issue));
  if (!item) die(`Issue #${issue} is not on project #${config.projectNumber}.`);
  return item;
}

function flag(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
}

function optionId(status) {
  const id = config.statuses[status];
  if (id) return id;
  die(
    `Unknown status "${status}".\n` +
    `Known: ${Object.keys(config.statuses).join(', ')}\n` +
    `If the column was just added or renamed, run: node .thrive/board.mjs sync`
  );
}

const [command, ...argv] = process.argv.slice(2);

switch (command) {
  case 'show': {
    const item = findItem(argv[0]);
    console.log(`#${item.content.number}  ${item.content.title}`);
    console.log(`Status: ${item.status ?? '(none)'}`);
    console.log(item.content.url);
    break;
  }

  case 'set': {
    const issue = argv[0];
    const status = flag(argv, 'status');
    if (!issue || !status) die('Usage: board.mjs set <issue> --status "<column>"');
    const item = findItem(issue);
    if (item.status === status) {
      console.log(`#${issue} already in ${status}.`);
      break;
    }
    gh([
      'api', 'graphql', '-f', `query=mutation {
        updateProjectV2ItemFieldValue(input: {
          projectId: "${config.projectId}"
          itemId: "${item.id}"
          fieldId: "${config.statusFieldId}"
          value: { singleSelectOptionId: "${optionId(status)}" }
        }) { projectV2Item { id } }
      }`,
    ]);
    console.log(`#${issue}: ${item.status ?? '(none)'} -> ${status}`);
    break;
  }

  case 'list': {
    const status = flag(argv, 'status');
    const rows = items().filter((i) => !status || i.status === status);
    if (rows.length === 0) {
      console.log(status ? `Nothing in ${status}.` : 'Board is empty.');
      break;
    }
    for (const i of rows) {
      console.log(`#${i.content.number}  [${i.status ?? '-'}]  ${i.content.title}`);
    }
    break;
  }

  case 'sync': {
    const raw = gh([
      'project', 'field-list', String(config.projectNumber),
      '--owner', config.owner, '--format', 'json',
    ]);
    const field = JSON.parse(raw).fields.find((f) => f.id === config.statusFieldId);
    if (!field) die('Status field not found on the project.');
    config.statuses = Object.fromEntries(field.options.map((o) => [o.name, o.id]));
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`Synced ${field.options.length} statuses: ${Object.keys(config.statuses).join(', ')}`);
    break;
  }

  default:
    die('Usage: board.mjs <show|set|list|sync> ...');
}

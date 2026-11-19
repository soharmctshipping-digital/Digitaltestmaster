# SST 1 draft build: working files

These scripts hold the code changes for SST 1 (customer chat) as patches, so the work can be
picked up again if a session is cut off. They contain no phone numbers, emails or secrets.

- `patchA.py`: stage A. Applies exact text replacements to four code steps exported from
  n8n as `orig_<Step_name>.js` and writes `new_<Step_name>.js`. Each replacement must match
  exactly once or the script stops.
- `rig.js`, `testA.js`: an offline test rig. Runs "Build Claude request" and
  "Read Claude answer" against sample messages with no n8n, no WhatsApp and no AI call.
  Needs `npm i luxon`.

To use: export the code of "Read message", "Build Claude request", "Read Claude answer" and
"Tell customer they are alerted" from SST 1 (version 1ed21e80, the one published on
19 Nov 2026) into `orig_*.js`, run `python3 patchA.py`, then `node testA.js`.

Wiring that goes with stage A: a new IF step "Fixed reply?" between "Bot paused?" (false
output) and "Ask Claude". True (`$json.canned` is set) goes straight to "Read Claude answer";
false goes to "Ask Claude".

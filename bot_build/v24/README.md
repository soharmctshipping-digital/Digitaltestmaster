# Form v24 build files

- `make_v24.py` + `v24_tail.js` produce `v24_form_definition.js` (the code for T8 "Form definition")
  from `../v23/v23_form_definition.js`. Run `python3 make_v24.py` in a folder holding both.
- `patchF.py` turns the live SST 1 "Read message" code (v23 version) into `v24_Read_message.js`.
- `testF.js` fills every service's pages the way a customer would and prints what the bot reads,
  plus a test that answers from another service are dropped.

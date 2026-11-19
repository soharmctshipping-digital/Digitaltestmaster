# Stage D: switch SST 1 to form v23 and allow a typed yes/okay at the summary. Usage: python3 patchD.py <new_form_id>
import sys
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (c, old[:90]); return s.replace(old, new)
fid = sys.argv[1]; assert fid.isdigit() and len(fid) > 10
s = open('c_Build_Claude_request.js').read()
s = rep(s, "service: '29363394833300676', mode: 'published', live: true", "service: '%s', mode: 'published', live: true" % fid)
s = rep(s, "const PORT_SEARCH_FORM = { id: '29363394833300676',", "const PORT_SEARCH_FORM = { id: '%s'," % fid)
s = rep(s, "// Port search trial: the service form with live port search (v10, still a draft) goes only to these numbers until it is signed off.",
           "// The service form in use: v23 (19 Nov 2026). The one before it was v22, id 29363394833300676.")
s = rep(s, "and ask: “Is everything correct? Tap *Yes, confirm*, or tell me what to change.” Set options to",
           "and ask: “Is everything correct? Tap *Yes, confirm* (or just reply yes or okay), or tell me what to change.” Set options to")
open('d_Build_Claude_request.js', 'w').write(s); print('ok')

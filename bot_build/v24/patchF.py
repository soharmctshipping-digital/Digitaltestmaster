# Stage F (23 Nov 2026): "Read message" understands form v24 and keeps only the chosen service's answers.
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (c, old[:90]); return s.replace(old, new)
s = open('v23_Read_message.js').read()
s = rep(s, "  const m = v(f.mode);\n  const st = m === 'sea' ? v(f.sea_type) : '';\n",
"""  const m = v(f.mode);
  const st = m === 'sea' ? v(f.sea_type) : '';
  // Only the answers that belong to the chosen service are read. A form can still hold answers from a service the
  // customer started and then left (forms before v24 kept them), and those must never reach the enquiry.
  { const SV = ['sea', 'air', 'land', 'customs', 'transit', 'project', 'warehousing', 'containers', 'agency'], SK = ['fcl', 'lcl', 'bulk', 'roro'];
    const own = n => { if (/^(form|mode|notes)$/.test(n)) return true; if (/^(sea_type|far_|pod_oman|pol_|pod_)/.test(n)) return m === 'sea'; const tl = n.split('_').pop(); if (SV.indexOf(tl) >= 0) return tl === m; if (SK.indexOf(tl) >= 0) return m === 'sea' && tl === st; return true; };
    for (const key of Object.keys(f)) if (!own(key)) delete f[key]; }
  const EV = { no: 'No', electric: 'Electric', hybrid: 'Hybrid', mix: 'A mix' };
""")
s = rep(s, "  add('In running condition', g('running') ? t(g('running')) : '');\n",
           "  add('In running condition', g('running') ? t(g('running')) : '');\n  add('Electric or hybrid', EV[g('ev')] || g('ev'));\n")
s = rep(s, "  add('Heaviest piece (' + hu + ')', g('heavy'));\n",
"""  add('Heaviest piece (' + hu + ')', g('heavy'));
  if (m === 'project') { add('Shipped as', ({ breakbulk: 'Break bulk', flatrack: 'Flat rack or open top', not_sure: 'Not sure' })[g('shipas')] || g('shipas')); add('Crane or offloading help at site', g('crane') ? t(g('crane')) : ''); }
  if (m === 'air') add('For an exhibition or temporary import', g('exhibition') ? t(g('exhibition')) : '');
""")
s = rep(s, "add('Has an Oman customs code', t(g('code')));", "add('Has an Oman customs code', t(g('code'))); add('Number of trucks', v(f.trucks_customs));")
s = rep(s, "add('Needs our trucks', g('trucks') === 'no' ? 'No, they have their own' : t(g('trucks'))); }",
           "add('Needs our trucks', g('trucks') === 'no' ? 'No, they have their own' : t(g('trucks'))); add('Empty container returns to', ({ destination: 'Stays at the destination (one way)', sohar: 'Back to Sohar Port', jebel_ali: 'Jebel Ali', duqm: 'Duqm Port', not_sure: 'Not sure' })[g('return')] || g('return')); add('Consignee at destination who will clear the goods', g('consignee') ? t(g('consignee')) : ''); }")
s = rep(s, "add('Services needed', gl('services').map(x => x === 'handling' ? 'Handling in and out' : t(x)).join(', ')); }",
           "add('Services needed', gl('services').map(x => x === 'handling' ? 'Handling in and out' : t(x)).join(', ')); add('Arriving as', ({ pallets: 'Pallets', loose: 'Loose cartons or pieces', mix: 'A mix' })[g('arrive')] || g('arrive')); add('Local delivery areas', g('areas')); }")
s = rep(s, "add('IMO number', g('vessel_imo'));", "add('IMO number', g('vessel_imo')); add('Vessel type and size', g('vessel_size')); add('Days in port', g('days')); add('Crew joining / leaving', g('crew'));")
s = rep(s, "  } else { add(R[0], listed('pol') || g('origin')); add(R[1], listed('pod') || g('destination')); }",
"""  } else if (m === 'air') {
    // Form v24: Muscat Airport is fixed for air imports (destination) and air exports (origin) and is shown, not asked.
    add(R[0], g('origin') || (dir === 'export' ? 'Muscat Airport, Oman' : ''));
    add(R[1], g('destination') || (dir === 'import' ? 'Muscat Airport, Oman' : ''));
  } else { add(R[0], listed('pol') || g('origin')); add(R[1], listed('pod') || g('destination')); }""")
s = rep(s, "  add('Cargo value (USD, for the customs guarantee)', g('value'));",
"""  add(m === 'customs' ? 'Cargo value (USD, for a duty estimate)' : 'Cargo value (USD, for the customs guarantee)', g('value'));
  if (k === 'fcl' && g('freedays')) add('Extra free days at the port', g('freedays') === 'yes' ? 'Yes, ' + (v(f.freedays_n_fcl) || 'number not given') + ' days' : 'No');""")
open('v24_Read_message.js', 'w').write(s)
print('ok')

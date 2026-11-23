# Builds the v24 form definition (T8 "Form definition" code) from the v23 source.
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (c, old[:100]); return s.replace(old, new)
src = open('../v23/v23_form_definition.js').read()
head = src[:src.index("const norm = ch =>")]
s = head
s = rep(s, "// SST service form v23 (19 Nov 2026).", "// SST service form v24 (23 Nov 2026). Each service has its own pages, so answers from one service never travel with another.\n// Air: Muscat Airport fixed for import (destination) and export (origin). New questions from the charge-point review (HS codes left out).\n// Was v23:")
s = rep(s, "const DIR = [['import', 'Import into Oman'], ['export', 'Export from Oman']];",
           "const DIR = [['import', 'Import into Oman'], ['export', 'Export from Oman']];\nconst EVO = [['no', 'No'], ['electric', 'Electric'], ['hybrid', 'Hybrid'], ['mix', 'A mix']];")
# air: Muscat Airport fixed
s = rep(s, "  M('air', [...route('air', 'Airport of origin', 'Destination airport')]),",
"""  DT('direction_air', 'import', [{ type: 'TextBody', text: 'Arriving at: Muscat Airport, Oman.' }, ti('origin_air', 'Airport of origin', true, 'text', 'City or airport, for example Frankfurt')]),
  DT('direction_air', 'export', [{ type: 'TextBody', text: 'Departing from: Muscat Airport, Oman.' }, ti('destination_air', 'Destination airport', true, 'text', 'City or airport, for example Mumbai')]),""")
# warehousing: arriving as, delivery areas
s = rep(s, "  F('wtype_warehousing', 'cold', [ti('temp_warehousing', 'Temperature (°C)', true, 'text', 'For example +4 or -18')]),",
"""  F('wtype_warehousing', 'cold', [ti('temp_warehousing', 'Temperature (°C)', true, 'text', 'For example +4 or -18')]),
  M('warehousing', [radio('arrive_warehousing', 'Arriving as', [['pallets', 'Pallets'], ['loose', 'Loose cartons or pieces'], ['mix', 'A mix']])]),""")
# p3 additions
s = rep(s, "    radio('condition_roro', 'New or used?', [['new', 'New'], ['used', 'Used']]), radio('running_roro', 'In running condition?', YN)]),",
           "    radio('condition_roro', 'New or used?', [['new', 'New'], ['used', 'Used']]), radio('running_roro', 'In running condition?', YN), radio('ev_roro', 'Electric or hybrid?', EVO)]),")
s = rep(s, "  ...importExport('air', 'air', 'airport'),",
           "  ...importExport('air', 'air', 'airport'),\n  DT('direction_air', 'import', [radio('exhibition_air', 'For an exhibition?', YN, 'Or another temporary import that will be re-exported')]),")
s = rep(s, "  M('project', [dimField('project', 'Largest piece size', 'Length x Width x Height, for example 9.2 x 2.9 x 3.7'), heavyField('project', 'Heaviest piece')]),",
"""  M('project', [dimField('project', 'Largest piece size', 'Length x Width x Height, for example 9.2 x 2.9 x 3.7'), heavyField('project', 'Heaviest piece'),
    ti('volume_project', 'Total volume (CBM)', true, 'text', 'Cubic metres for all pieces, or write "not sure"'),
    radio('shipas_project', 'How will it be shipped?', [['breakbulk', 'Break bulk'], ['flatrack', 'Flat rack or open top'], ['not_sure', 'Not sure']]),
    radio('crane_project', 'Crane or offloading at site?', YNS, 'Crane, forklift or labour at the delivery site')]),""")
s = rep(s, "    radio('code_customs', 'Oman customs code?', YNS, 'Does the importer have one?')]),",
"""    radio('code_customs', 'Oman customs code?', YNS, 'Does the importer have one?')]),
  { type: 'If', condition: D + "form.equip_customs} == 'fcl' || " + D + "form.equip_customs} == 'reefer'", then: [radio('size_customs', 'Container size', SIZE)] },""")
s = rep(s, "  M('transit', [radio('trucks_transit', 'Do you need our trucks?', [['yes', 'Yes'], ['no', 'No, we have our own']])]),",
"""  DT('equip_transit', 'containers', [radio('return_transit', 'Where does the empty go back?', [['destination', 'Stays at destination'], ['sohar', 'Back to Sohar Port'], ['jebel_ali', 'Jebel Ali'], ['duqm', 'Duqm Port'], ['not_sure', 'Not sure']])]),
  DT('equip_transit', 'vehicles', [radio('ev_transit', 'Electric or hybrid?', EVO)]),
  M('transit', [radio('trucks_transit', 'Do you need our trucks?', [['yes', 'Yes'], ['no', 'No, we have our own']]),
    radio('consignee_transit', 'Consignee at destination?', YNS, 'Someone at the destination who will clear the goods')]),""")
s = rep(s, "  M('agency', [ti('vessel_name_agency', 'Vessel name', true), ti('vessel_imo_agency', 'IMO number', false, 'number', 'IMO (International Maritime Organization) number of the vessel')])];",
"""  M('agency', [ti('vessel_name_agency', 'Vessel name', true), ti('vessel_imo_agency', 'IMO number', false, 'number', 'IMO (International Maritime Organization) number of the vessel'),
    ti('vessel_size_agency', 'Vessel type and size', false, 'text', 'For example bulk carrier, 32,000 GRT or 190 m LOA'),
    ti('days_agency', 'Days in port', true, 'number', 'How many days alongside or at anchor'),
    ti('crew_agency', 'Crew joining/leaving', false, 'text', 'Only for crew change, for example 3 joining, 2 leaving')])];""")
# p4 additions
s = rep(s, "  DT('sea_type', 'fcl', [commodity('fcl'), qty('fcl', 'How many containers?', 'For example 2, or 2 x 20 feet and 1 x 40 feet'), weight('fcl', '', 'Total weight of the whole consignment')]),",
"""  DT('sea_type', 'fcl', [commodity('fcl'), qty('fcl', 'How many containers?', 'For example 2, or 2 x 20 feet and 1 x 40 feet'), weight('fcl', '', 'Total weight of the whole consignment'),
    Object.assign(radio('freedays_fcl', 'Extra free days at the port?', YN, 'Beyond the shipping line\\'s standard free time'), { required: false })]),
  F('freedays_fcl', 'yes', [ti('freedays_n_fcl', 'How many extra days?', true, 'number')]),""")
s = rep(s, "  DT('sea_type', 'bulk', [commodity('bulk'), qty('bulk', 'How many pieces?', 'Write \"loose\" for bulk cargo'), weight('bulk', 'Weight (tonnes)')]),",
           "  DT('sea_type', 'bulk', [commodity('bulk'), qty('bulk', 'How many pieces?', 'Write \"loose\" for bulk cargo'), weight('bulk', 'Weight (tonnes)'), ti('volume_bulk', 'Total volume (CBM)', true, 'text', 'Cubic metres for all pieces, or write \"not sure\"')]),")
s = rep(s, "  M('customs', [commodity('customs'), qty('customs', 'How many?', 'For example 2 x 40 feet, 15 pallets or 3 vehicles'), weight('customs', 'Total weight (kg)'), dg('customs')]),",
"""  M('customs', [commodity('customs')]),
  DT('via_customs', 'road', [ti('trucks_customs', 'How many trucks?', true, 'number')]),
  cond('data', 'via_customs', '!=', 'road', [qty('customs', 'How many?', 'For example 2 x 40 feet, 15 pallets or 3 vehicles')]),
  M('customs', [weight('customs', 'Total weight (kg)'), ti('value_customs', 'Cargo value (USD)', false, 'number', 'Optional, for an estimate of duty and VAT'), dg('customs')]),""")
s = rep(s, "ti('value_transit', 'Cargo value', false, 'number', 'In US dollars (USD), needed for the customs guarantee')",
           "ti('value_transit', 'Cargo value (USD)', true, 'number', 'In US dollars, needed for the customs guarantee')")
s = rep(s, "  M('warehousing', [commodity('warehousing'), qty('warehousing', 'How many pallets?', 'A rough number is fine'), weight('warehousing', 'Kg per pallet'), dg('warehousing'), ready('warehousing', 'Start date')]),",
           "  M('warehousing', [commodity('warehousing'), qty('warehousing', 'How many pallets?', 'A rough number is fine'), weight('warehousing', 'Kg per pallet'), dg('warehousing'), ready('warehousing', 'Start date'), ta('areas_warehousing', 'Delivery areas', false, 'Only if you need local delivery')]),")
s = rep(s, '[["Sohar","Oman"],', '[')   # Oman ports are asked separately; Sohar is not an overseas port of loading or discharge
tail = open('v24_tail.js').read()
open('v24_form_definition.js', 'w').write(s + tail)
print('ok')

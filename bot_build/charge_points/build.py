import json,glob,collections,re,sys,statistics
sys.path.insert(0,'.')
from canon import canon
from inputs import I
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
CP='../cp/'
rows=[];quotes={}
for f in sorted(glob.glob(CP+'lines_*.jsonl')):
    for l in open(f):
        try: rows.append(json.loads(l))
        except: pass
for f in sorted(glob.glob(CP+'quotes_*.jsonl')):
    for l in open(f):
        try: q=json.loads(l); quotes[q['file_id']]=q
        except: pass
# Container sale and lease quotations were extracted earlier by a dedicated pass; add any not covered by the readers.
seen={r['file_id'] for r in rows}
for l in open('../rates/containers_out.jsonl'):
    c=json.loads(l)
    if c['file_id'] in seen: continue
    li=str(c.get('line_item') or '')
    if re.match(r'\s*(total|ex-yard price without|summary)',li,re.I): continue
    t=str(c.get('treatment') or '').lower()
    t='fixed' if 'in total' in t else ('excluded' if 'exclud' in t else t)
    rows.append(dict(file_id=c['file_id'],quote_ref=c.get('quote_ref',''),quote_date=c.get('quote_date',''),service='Container sale / lease',direction='Within Oman',section=c.get('deal_type',''),line_item=li,amount=c.get('amount'),amount_high=c.get('amount_high'),currency=c.get('currency',''),basis=c.get('basis',''),treatment=t,driver='container size + new or used'+(' + lease period' if 'lease' in str(c.get('deal_type','')).lower() else '')+(' + delivery address' if re.search('transport',li,re.I) else '')))
    quotes.setdefault(c['file_id'],dict(file_id=c['file_id'],quote_ref=c.get('quote_ref',''),quote_date=c.get('quote_date',''),service='Container sale / lease',direction='Within Oman',details_given=['Container size / type','Condition','Quantity','Location'],inputs_needed=['container size','new or used','number of containers','delivery address'],assumptions=[],documents_required=[]))
SERV=['Sea freight FCL','Sea freight LCL','Sea freight break bulk / bulk','Sea freight RoRo','Air freight','Land freight (GCC / Oman trucking)','Import customs clearance','Transit (through Oman)','Project / heavy-lift','Warehousing / 3PL','Container sale / lease','Shipping agency']
def svc(s):
    s=str(s or '')
    for x in SERV:
        if s==x: return x
    if 'customs' in s.lower(): return 'Import customs clearance'
    if 'transit' in s.lower(): return 'Transit (through Oman)'
    return s or 'Other'
for r in rows:
    r['_g'],r['_c']=canon(r.get('line_item'),r.get('section'))
    r['_s']=svc(r.get('service'))
fid_by_svc=collections.defaultdict(set)
for r in rows: fid_by_svc[r['_s']].add(r['file_id'])
def num(x):
    try: return float(x)
    except: return None
def fmt(a):
    if a is None: return ''
    return ('%.3f'%a).rstrip('0').rstrip('.') if a!=int(a) else str(int(a))
def summarise(rs):
    q=len({r['file_id'] for r in rs})
    tr=collections.Counter(r.get('treatment') or '' for r in rs)
    priced=[r for r in rs if num(r.get('amount')) is not None and r.get('currency') not in ('','%')]
    typ='';rng='';cur=''
    if priced:
        cc=collections.Counter(r['currency'] for r in priced).most_common(1)[0][0]
        vals=[num(r['amount']) for r in priced if r['currency']==cc]
        m=collections.Counter(vals).most_common(1)[0]
        typ=f"{cc} {fmt(m[0])}"+(f" ({m[1]} of {len(vals)})" if len(vals)>1 else '')
        rng=f"{cc} {fmt(min(vals))} to {fmt(max(vals))}" if min(vals)!=max(vals) else ''
        cur=cc
    basis=collections.Counter(re.sub(r'\s+',' ',str(r.get('basis') or '').strip().lower())[:60] for r in rs if r.get('basis')).most_common(2)
    drv=collections.Counter()
    for r in rs:
        for d in re.split(r'\s*\+\s*|,\s*',str(r.get('driver') or '')):
            d=d.strip().lower()
            if d: drv[d]+=1
    ex=collections.Counter(str(r.get('line_item'))[:70] for r in rs).most_common(3)
    return dict(q=q,n=len(rs),typ=typ,rng=rng,basis='; '.join(b for b,_ in basis),
        treat=', '.join(f"{k or 'unstated'} {v}" for k,v in tr.most_common(3)),
        drivers=', '.join(d for d,_ in drv.most_common(3)), ex=' | '.join(e for e,_ in ex))
wb=Workbook()
H=Font(bold=True,color='FFFFFF'); HF=PatternFill('solid',fgColor='408747'); WR=Alignment(wrap_text=True,vertical='top')
def sheet(ws,head,data,widths):
    ws.append(head)
    for c in ws[1]: c.font=H; c.fill=HF; c.alignment=WR
    for d in data: ws.append(d)
    for i,w in enumerate(widths,1): ws.column_dimensions[get_column_letter(i)].width=w
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment=WR
    ws.freeze_panes='A2'
# 1 read me
ws=wb.active; ws.title='Read me'
nq=len({r['file_id'] for r in rows})
readme=[
 ['Extended charge-point list, Sohar Shipping quotations'],
 ['Built 23 November 2026 from the quotation PDFs in the SST CLAUDE Google Drive folder, read in full one by one.'],
 [f'Quotations read: {nq}. Charge lines recorded: {len(rows)}. Distinct charge points after grouping: {len({(r["_g"],r["_c"]) for r in rows})}.'],
 [''],
 ['Sheets'],
 ['All charge points: every distinct charge, how many quotations show it, the usual figure and range, basis, how it is treated (fixed, at actual, included, excluded) and what decides it.'],
 ['By bot service: the same charge points split into the twelve services the WhatsApp bot offers.'],
 ['Input check: for each service, every fact needed to price those charges, and whether the WhatsApp form asks for it, works it out, or is missing it.'],
 ['Missing inputs: only the gaps, with a proposed question for the form.'],
 ['Quotations: one row per quotation, with the inputs it needed and the assumptions it flagged.'],
 ['All lines: every charge line as printed, with the charge point it was grouped under.'],
 [''],
 ['Notes'],
 ['"Usual figure" is the most common amount among all lines that print a figure, including figures shown as approximate or at actual (for example port tariff amounts). For percentage charges such as the bank guarantee it is the stated minimum. Check the Treatment column before quoting a figure as fixed.'],
 ['Where a line carries a 20ft and a 40ft price, the 20ft figure is used for "usual figure"; the 40ft figure is in All lines (amount_high).'],
 ['Reference numbers are not unique in the source PDFs (some are reused or blank), so quotations are counted by Drive file.'],
 ['No customer names, phone numbers or emails are included.'],
]
for r in readme: ws.append(r)
ws.column_dimensions['A'].width=150; ws['A1'].font=Font(bold=True,size=14)
for r in (5,13): ws.cell(r,1).font=Font(bold=True)
# 2 all charge points
g=collections.defaultdict(list)
for r in rows: g[(r['_g'],r['_c'])].append(r)
data=[]
for (grp,cp),rs in sorted(g.items(),key=lambda kv:(kv[0][0],-len({x['file_id'] for x in kv[1]}))):
    s=summarise(rs)
    svcs=collections.Counter(r['_s'] for r in rs)
    data.append([grp,cp,s['q'],s['n'],s['typ'],s['rng'],s['basis'],s['treat'],s['drivers'],', '.join(f"{k} {v}" for k,v in svcs.most_common()),s['ex']])
sheet(wb.create_sheet('All charge points'),['Group','Charge point','Quotations','Lines','Usual figure','Range seen','Basis','Treatment','Decided by','Services it appears in (lines)','Example wordings'],data,[22,40,11,8,20,22,30,28,30,40,60])
# 3 by bot service
data=[]
for sv in SERV:
    rs=[r for r in rows if r['_s']==sv]
    nq_s=len(fid_by_svc[sv])
    gg=collections.defaultdict(list)
    for r in rs: gg[(r['_g'],r['_c'])].append(r)
    for (grp,cp),x in sorted(gg.items(),key=lambda kv:-len({y['file_id'] for y in kv[1]})):
        s=summarise(x)
        data.append([sv,nq_s,grp,cp,s['q'],f"{round(100*s['q']/nq_s)}%" if nq_s else '',s['typ'],s['rng'],s['basis'],s['treat'],s['drivers']])
sheet(wb.create_sheet('By bot service'),['Bot service','Quotations for this service','Group','Charge point','Quotations with it','Share','Usual figure','Range seen','Basis','Treatment','Decided by'],data,[28,12,22,40,11,8,20,22,30,28,30])
# 4 input check
data=[]
for sv in SERV:
    for (fact,st,src,why) in I.get(sv,[]): data.append([sv,fact,st,src,why])
ws=wb.create_sheet('Input check')
sheet(ws,['Bot service','Fact needed to price','Status','Where it comes from (form field or how it is worked out)','Charges it affects'],data,[28,38,16,60,60])
COL={'Asked':'D9EAD3','Computed':'DDEBF7','Partly':'FFF2CC','Missing':'F4CCCC','Not from customer':'EDEDED'}
for row in ws.iter_rows(min_row=2):
    c=row[2]; c.fill=PatternFill('solid',fgColor=COL.get(c.value,'FFFFFF'))
# 5 missing
PROP={
 ('Sea freight FCL','Number of HS codes'):'Ask only when customs clearance is Yes: "How many different products (HS codes)? Not sure is fine." Or read it from the invoice once uploaded.',
 ('Sea freight FCL','Free days needed at destination'):'Optional: "Do you need extra free days at Sohar Port? (No / Yes, how many)"',
 ('Sea freight LCL','Number of HS codes'):'As for FCL.',
 ('Sea freight break bulk / bulk','Total volume (CBM)'):'Add "Total volume (CBM)", "not sure" accepted, as for LCL.',
 ('Sea freight break bulk / bulk','Freight tons'):'Worked out once total volume is asked.',
 ('Sea freight RoRo','Electric or hybrid'):'Add "Electric or hybrid?" (No / Electric / Hybrid / Mix).',
 ('Air freight','Exhibition / temporary import'):'Add "Is this for an exhibition or temporary import?" (No / Yes).',
 ('Air freight','Number of HS codes'):'As for FCL.',
 ('Land freight (GCC / Oman trucking)','Number of HS codes'):'As for FCL.',
 ('Import customs clearance','Container size (20ft / 40ft)'):'Add "Container size" (20ft / 40ft / both) when FCL or reefer is chosen.',
 ('Import customs clearance','Number of trucks (road)'):'Rename "How many?" to "How many trucks?" when arriving by road.',
 ('Import customs clearance','Number of HS codes'):'Add "How many different products (HS codes)?", "not sure" accepted.',
 ('Import customs clearance','Cargo value'):'Optional "Cargo value (for a duty estimate)". Not needed while duty is quoted at actual.',
 ('Transit (through Oman)','Cargo value'):'Make "Cargo value" required (it sets the bank guarantee).',
 ('Transit (through Oman)','Empty container return location'):'Add "Where does the empty container go back to?" (Stays at destination / Back to Sohar / Jebel Ali / Duqm / Not sure) when containers are moving.',
 ('Transit (through Oman)','Local consignee or importer of record at destination'):'Add "Is there a consignee at destination who will clear the goods?" (Yes / No / Not sure).',
 ('Transit (through Oman)','Electric or hybrid vehicles'):'Add "Electric or hybrid?" when vehicles are moving.',
 ('Transit (through Oman)','Number of HS codes'):'As for FCL.',
 ('Project / heavy-lift','Total volume (CBM)'):'Add "Total volume (CBM)", "not sure" accepted.',
 ('Project / heavy-lift','Shipped as break bulk or on flat racks'):'Add "How is it shipped?" (Break bulk / Flat rack or open top / Not sure).',
 ('Project / heavy-lift','Crane or offloading at site'):'Add "Crane or offloading help at site?" (Yes / No / Not sure), as for land freight.',
 ('Warehousing / 3PL','Arriving palletised or loose'):'Add "Arriving as" (Pallets / Loose cartons / Mix).',
 ('Warehousing / 3PL','Local delivery destinations'):'When "Local delivery" is ticked: "Delivery areas" (text).',
 ('Shipping agency','Vessel size (GRT / LOA) and type'):'Add "Vessel type and size (GRT or LOA)", optional; the sales team can look it up from the IMO number.',
 ('Shipping agency','Days alongside / at anchor'):'Add "Expected days in port".',
 ('Shipping agency','Number of crew joining / leaving'):'When "Crew change" is ticked: "How many crew joining and leaving?"',
}
data=[]
for sv in SERV:
    for (fact,st,src,why) in I.get(sv,[]):
        if st in ('Missing','Partly'): data.append([sv,fact,st,why,PROP.get((sv,fact),'')])
sheet(wb.create_sheet('Missing inputs'),['Bot service','Fact','Status today','Charges it affects','Proposed question'],data,[28,36,12,55,75])
# 6 quotations
data=[]
for fid,q in quotes.items():
    sv=q.get('service'); sv=', '.join(sv) if isinstance(sv,list) else str(sv or '')
    data.append([q.get('quote_ref',''),q.get('quote_date',''),sv,q.get('direction',''),', '.join(q.get('details_given') or []),', '.join(q.get('inputs_needed') or []),'; '.join(q.get('assumptions') or []),', '.join(q.get('documents_required') or []),len([r for r in rows if r['file_id']==fid])])
data.sort(key=lambda d:(str(d[1]),str(d[0])))
sheet(wb.create_sheet('Quotations'),['Reference','Date','Service','Direction','Details given','Inputs needed','Assumptions flagged','Documents asked for','Charge lines'],data,[24,11,30,18,45,45,60,40,9])
# 7 all lines
data=[[r.get('quote_ref',''),r.get('quote_date',''),r['_s'],r.get('direction',''),r['_g'],r['_c'],r.get('section',''),r.get('line_item',''),num(r.get('amount')),num(r.get('amount_high')),r.get('currency',''),r.get('basis',''),r.get('treatment',''),r.get('driver','')] for r in rows]
sheet(wb.create_sheet('All lines'),['Reference','Date','Service','Direction','Group','Charge point','Section','Line as printed','Amount','Amount high / 40ft','Currency','Basis','Treatment','Decided by'],data,[22,11,26,16,20,34,26,50,10,10,8,26,12,26])
out='/home/user/Digitaltestmaster/SST_Charge_Points_by_Service.xlsx'
wb.save(out)
# summary for the chat
st=collections.Counter((sv,s) for sv in SERV for (_,s,_,_) in I.get(sv,[]))
print('quotes',len(quotes),'lines',len(rows),'charge points',len(g))
for sv in SERV: print(sv,'quotations',len(fid_by_svc[sv]),'charge points',len({(r['_g'],r['_c']) for r in rows if r['_s']==sv}),{k:st[(sv,k)] for k in ('Asked','Computed','Partly','Missing','Not from customer') if st[(sv,k)]})
print('unclassified',sum(1 for r in rows if r['_g']=='Unclassified'))
print(out)

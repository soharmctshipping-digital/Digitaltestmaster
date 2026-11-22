# Stage E (22 Nov 2026): "Job enquiry" as a fourth choice at the start, answered with the careers page and office number.
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, (c, old[:90]); return s.replace(old, new)
def q(text): return "  '" + text.replace('\\', '\\\\').replace("'", "\\'") + "',"
JOB = "Thank you for your interest in joining Sohar Shipping. Please visit the careers page on our website to see the vacancies currently open and to apply: https://www.soharshipping.com/career"
JOB2 = "If you would like to ask about a job, you can also call our office on +968 249 55 777."
s = open('d_Build_Claude_request.js').read()
# prompt: job enquiries are answered, not escalated
s = rep(s, "certificate requests; job applications; supplier, vendor,", "certificate requests; supplier, vendor,")
i = s.index("  'FLOW',\n")
s = s[:i] + q("JOB ENQUIRIES: if the customer asks about jobs, vacancies, careers, internships or sending a CV (or chooses “Job enquiry”), do not escalate and do not start an enquiry. Reply with exactly this meaning, in their language: “" + JOB + "” then, on a new line, “" + JOB2 + "” Set stage to \"faq\", options \"\" and every flag false.") + "\n  '',\n" + s[i:]
# fixed reply when the choice is tapped (or typed exactly), so no AI call is needed
s = rep(s, "  } else if (noFiles && earlyStage && /^new enquiry$/i.test(contentNow)) {",
"""  } else if (noFiles && earlyStage && /^(job enquiry|job inquiry|job vacancy|job vacancies|vacancy|vacancies|careers?)[\\s.!?]*$/i.test(contentNow)) {
    canned = fixed('""" + JOB.replace("'", "\\'") + """' + NL + NL + '""" + JOB2.replace("'", "\\'") + """', 'faq', '');
  } else if (noFiles && earlyStage && /^new enquiry$/i.test(contentNow)) {""")
open('e_Build_Claude_request.js', 'w').write(s)

s = open('orig_Read_Claude_answer.js').read()
s = rep(s, "  start: { en: ['New enquiry', 'Existing shipment', 'Something else'], ar: ['طلب جديد', 'شحنة قائمة', 'أمر آخر'] },",
           "  start: { en: ['New enquiry', 'Existing shipment', 'Job enquiry', 'Something else'], ar: ['طلب جديد', 'شحنة قائمة', 'استفسار عن وظيفة', 'أمر آخر'] },")
s = rep(s, "  if (OPTS[optKind]) {\n    shown = OPTS[optKind][lang];\n",
"""  if (optKind === 'start') {
    // Four choices (WhatsApp allows only three tap buttons), so the first question is sent as a short list.
    shown = OPTS.start[lang];
    interactive = { messaging_product: 'whatsapp', to: ctx.phone, type: 'interactive', interactive: { type: 'list', body: { text: btnBody }, action: { button: isAr ? 'اختر' : 'Choose an option', sections: [{ title: isAr ? 'كيف نساعدك؟' : 'How can we help?', rows: shown.map((t, i) => ({ id: 'start_' + (i + 1), title: t })) }] } } };
  } else if (OPTS[optKind]) {
    shown = OPTS[optKind][lang];
""")
s = rep(s, "a.out_of_scope !== true && firstReply && !byeOnly) optKind = 'start';", "a.out_of_scope !== true && firstReply && !byeOnly && !/soharshipping\\.com\\/career/i.test(reply)) optKind = 'start';   // no menu under the careers answer")
open('e_Read_Claude_answer.js', 'w').write(s)
print('ok')

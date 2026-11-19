// A fixed reply written in "Build Claude request" (first greeting, "New enquiry", details form) is handed on in the
// same shape as an AI answer, so everything after this point works the same and no AI call is made.
const b = $('Build Claude request').first().json;
return [{ json: { content: [{ type: 'text', text: JSON.stringify(b.canned) }], stop_reason: 'end_turn', fixed_reply: true } }];

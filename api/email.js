// Serverless "email me this chat" endpoint (Vercel Node function).
//
// Sends the visitor's Majoo conversation to the address they typed, via
// Resend (https://resend.com). The transcript is sent once, at the visitor's
// request, and nothing is stored by this function.
//
// Request body: { to: 'name@example.com', messages: [{ role, text }, ...] }
// Response:     { sent: true } | { configured: false } | { error, detail }
//
// Config (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   required to switch emailing on (a plain GET reports whether it is set)
//   EMAIL_FROM       optional; sender shown to the visitor. Defaults to
//                    "Majoo at MajuLaw <majoo@majulaw.sg>" — the domain must be
//                    verified in Resend, or use "onboarding@resend.dev" while testing.

const MAX_MESSAGES = 60;
const MAX_CHARS = 6000;          // per message
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;              // sends per IP per window (best-effort, per instance)
const recent = new Map();

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const validEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

function rateLimited(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) return true;
  hits.push(now); recent.set(ip, hits);
  return false;
}

function normalise(body) {
  const msgs = Array.isArray(body && body.messages) ? body.messages : [];
  return msgs.slice(-MAX_MESSAGES).map((m) => ({
    who: m && m.role === 'user' ? 'You' : 'Majoo',
    text: (m && m.text ? String(m.text) : '').slice(0, MAX_CHARS).trim(),
  })).filter((m) => m.text);
}

function render(rows) {
  const date = new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' });
  const text = [
    'Your conversation with Majoo — MajuLaw (' + date + ')',
    '',
    'Majoo is an AI-powered chatbot and can make mistakes. Majoo does not give legal advice or calculate specific shares. For an estimate of share distribution under Faraid, use the Syariah Court\'s Online Trial Inheritance Calculator: https://syariahcourt.gov.sg/Inheritance/Online-Trial-inheritance-Calculator',
    '',
    ...rows.map((r) => r.who + ': ' + r.text + '\n'),
    '—',
    'Sent at your request from majulaw.sg. We did not keep a copy of this conversation or your email address.',
  ].join('\n');

  const bubbles = rows.map((r) => r.who === 'You'
    ? `<tr><td style="padding:6px 0 6px 60px;text-align:right"><div style="display:inline-block;text-align:left;background:#1b2741;color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:15px;line-height:1.45;white-space:pre-wrap">${esc(r.text)}</div><div style="font-size:11px;color:#8a8f99;margin-top:3px">You</div></td></tr>`
    : `<tr><td style="padding:6px 60px 6px 0"><div style="display:inline-block;background:#f6efe6;color:#1c2230;border-radius:16px 16px 16px 4px;padding:10px 14px;font-size:15px;line-height:1.45;white-space:pre-wrap">${esc(r.text)}</div><div style="font-size:11px;color:#8a8f99;margin-top:3px">Majoo</div></td></tr>`
  ).join('');

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#efe4d2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1c2230">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" style="max-width:600px;width:100%;background:#fff;border-radius:18px;overflow:hidden">
      <tr><td style="background:#cbae73;padding:18px 24px;font-size:22px;font-weight:800;color:#1b2741">MajuLaw</td></tr>
      <tr><td style="padding:22px 24px 6px">
        <h1 style="margin:0 0 6px;font-size:20px;color:#1b2741">Your conversation with Majoo</h1>
        <p style="margin:0 0 14px;font-size:13px;color:#5f6673">${esc(date)}</p>
        <p style="margin:0 0 18px;padding:10px 12px;background:rgba(203,174,115,.25);border-left:3px solid #b8923f;border-radius:8px;font-size:12.5px;line-height:1.5;color:#3a2a10">
          Majoo is an AI-powered chatbot and can make mistakes. Majoo does not give legal advice or calculate specific shares. For an estimate of share distribution under Faraid, please use the Syariah Court&rsquo;s <a href="https://syariahcourt.gov.sg/Inheritance/Online-Trial-inheritance-Calculator" style="color:#7a1b1f">Online Trial Inheritance Calculator</a>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bubbles}</table>
      </td></tr>
      <tr><td style="padding:16px 24px 22px;font-size:12px;color:#8a8f99;line-height:1.5;border-top:1px solid #eee">
        Sent at your request from <a href="https://majulaw.sg" style="color:#7a1b1f">majulaw.sg</a>. We did not keep a copy of this conversation or your email address.<br>
        A project by SUSS Law students for the LAW@CDC Access to Justice Co-Lab.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { text, html, subject: 'Your conversation with Majoo — MajuLaw' };
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, endpoint: 'email', configured: !!process.env.RESEND_API_KEY });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(200).json({ configured: false }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const to = body && typeof body.to === 'string' ? body.to.trim() : '';
  if (!validEmail(to)) { res.status(400).json({ error: 'invalid_email' }); return; }
  const rows = normalise(body);
  if (rows.length < 2 || !rows.some((r) => r.who === 'You')) { res.status(400).json({ error: 'empty_chat' }); return; }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) { res.status(429).json({ error: 'rate_limited' }); return; }

  const { text, html, subject } = render(rows);
  const from = process.env.EMAIL_FROM || 'Majoo at MajuLaw <majoo@majulaw.sg>';

  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 300);
      res.status(502).json({ error: 'upstream_error', detail });
      return;
    }
    res.status(200).json({ sent: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error', detail: String(e).slice(0, 300) });
  }
};

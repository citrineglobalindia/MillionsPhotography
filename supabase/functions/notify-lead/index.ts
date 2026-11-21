// notify-lead: emails the studio (and optionally auto-replies to the couple) when a website enquiry arrives.
// Triggered by the leads_notify database trigger via pg_net. Deployed with verify_jwt = false.
// Safe to call publicly: it only acts on enquiries created in the last 10 minutes that have not been
// notified yet (lead_notifications primary key), and only sends when RESEND_API_KEY is set.
// Secrets: RESEND_API_KEY (required to send), RESEND_FROM (e.g. "Million's Photography <hello@millionsphotography.com>"), SITE_URL (optional).
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = Deno.env.get("SITE_URL") ?? "https://www.millionsphotography.com";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fmtDate = (d?: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not decided";
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

async function send(key: string, payload: Record<string, unknown>) {
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return { ok: r.ok, detail: r.ok ? "sent" : `${r.status} ${(await r.text()).slice(0, 200)}` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let leadId = "";
  try { leadId = (await req.json()).lead_id; } catch { return json({ error: "bad body" }, 400); }
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "bad id" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: lead } = await sb.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return json({ skipped: "not found" });
  if (Date.now() - new Date(lead.created_at).getTime() > 10 * 60 * 1000) return json({ skipped: "too old" });
  const { error: claimErr } = await sb.from("lead_notifications").insert({ lead_id: leadId });
  if (claimErr) return json({ skipped: "already notified" });

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { await sb.from("lead_notifications").update({ detail: "RESEND_API_KEY not configured" }).eq("lead_id", leadId); return json({ skipped: "email not configured" }); }

  const { data: rows } = await sb.from("settings").select("key,value").in("key", ["notifications", "contact"]);
  const S = Object.fromEntries((rows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value])) as Record<string, any>;
  const to: string[] = (S.notifications?.emails?.length ? S.notifications.emails : [S.contact?.email]).filter(Boolean);
  const from = Deno.env.get("RESEND_FROM") ?? "Million's Photography <onboarding@resend.dev>";
  const couple = `${lead.name}${lead.partner ? " & " + lead.partner : ""}`;
  const rowsHtml = [
    ["Reference", lead.ref], ["Couple", couple], ["Event", lead.event_type], ["Date", fmtDate(lead.event_date)], ["Location", lead.location],
    ["Phone", lead.phone], ["Email", lead.email], ["Source", lead.source + (lead.utm?.utm_campaign ? ` · ${lead.utm.utm_campaign}` : "")],
  ].map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#8d837c;font-size:13px">${esc(k)}</td><td style="padding:6px 0;font-size:15px">${esc(v || "—")}</td></tr>`).join("");
  const digits = String(lead.phone ?? "").replace(/\D/g, "");
  const wa = digits ? `https://wa.me/${digits.length === 10 ? "91" + digits : digits}?text=${encodeURIComponent(`Hi ${lead.name}, this is Million's Photography & Films — thank you for your enquiry!`)}` : "";
  const studioHtml = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1b1715"><p style="font:12px Arial;letter-spacing:.2em;text-transform:uppercase;color:#b48d57">New enquiry · ${esc(lead.ref)}</p><h1 style="font-weight:500;font-size:28px;margin:0 0 16px">${esc(couple)}</h1><table>${rowsHtml}</table><p style="background:#f6f3ee;padding:14px;border-radius:8px;white-space:pre-wrap;font-size:15px">${esc(lead.message)}</p><p><a href="${SITE}/admin#/leads/${lead.id}" style="background:#7d1430;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-family:Arial;font-size:14px">Open in CRM</a>${wa ? ` &nbsp; <a href="${wa}" style="font-family:Arial;font-size:14px;color:#2f7a4f">Reply on WhatsApp</a>` : ""}</p></div>`;

  let studio = { ok: false, detail: "no recipients" };
  if (to.length) studio = await send(key, { from, to, reply_to: lead.email || undefined, subject: `New enquiry ${lead.ref} — ${couple}${lead.event_date ? ", " + fmtDate(lead.event_date) : ""}`, html: studioHtml });

  let auto = { ok: false, detail: "off" };
  if (S.notifications?.autoreply !== false && lead.email) {
    const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1b1715"><p style="font-family:'Bodoni Moda',Didot,serif;font-size:34px;color:#7d1430;margin:0">MPF</p><h1 style="font-weight:500;font-size:26px">Thank you, ${esc(lead.name)}!</h1><p style="font-size:16px;line-height:1.6">We've received your enquiry${lead.event_date ? " for <b>" + esc(fmtDate(lead.event_date)) + "</b>" : ""} and will get back to you within 24 hours to talk about your celebration.</p><p style="font-size:15px;color:#544a44">Your reference: <b>${esc(lead.ref)}</b></p><p style="font-size:15px">In the meantime, explore our <a href="${SITE}/portfolio" style="color:#7d1430">portfolio</a> and <a href="${SITE}/films" style="color:#7d1430">films</a>.</p><p style="font-style:italic;color:#8d837c">Every picture, a feeling. Every story, yours forever.<br>— Million's Photography &amp; Films</p></div>`;
    auto = await send(key, { from, to: [lead.email], reply_to: to[0], subject: "We've received your enquiry — Million's Photography & Films", html });
  }
  await sb.from("lead_notifications").update({ studio_sent: studio.ok, autoreply_sent: auto.ok, detail: `studio: ${studio.detail}; autoreply: ${auto.detail}` }).eq("lead_id", leadId);
  return json({ studio, auto });
});

"use client";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";

export default function ContactForm({ bookTitle }: { bookTitle?: string }) {
  const { t } = useLocale();
  const [form, setForm] = useState({
    name:    "",
    email:   "",
    subject: bookTitle
      ? `${t.contact.subjects[0]}: ${bookTitle}`
      : t.contact.subjects[0],
    message: bookTitle ? t.book.inquiryMsg(bookTitle, "") : "",
  });
  const [status, setStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch { setStatus("error"); }
  }

  if (status === "sent") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-semibold text-green-800">{t.contact.sent}</p>
        <p className="text-sm text-green-600 mt-1">{t.contact.sentHint}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t.contact.fullName}</label>
          <input required className="input" value={form.name}
            onChange={e => set("name", e.target.value)} />
        </div>
        <div>
          <label className="label">{t.contact.emailField}</label>
          <input required type="email" className="input" value={form.email}
            onChange={e => set("email", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">{t.contact.subject}</label>
        <select className="input" value={form.subject}
          onChange={e => set("subject", e.target.value)}>
          {t.contact.subjects.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t.contact.message}</label>
        <textarea required rows={4} className="input resize-none" value={form.message}
          onChange={e => set("message", e.target.value)} />
      </div>
      {status === "error" && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{t.contact.error}</p>
      )}
      <button type="submit" disabled={status === "sending"} className="btn-primary">
        {status === "sending" ? t.contact.sending : t.contact.send}
      </button>
    </form>
  );
}

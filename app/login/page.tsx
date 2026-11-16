"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Package } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Giriş yapılamadı.");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="loginShell">
      <form className="loginCard" onSubmit={submit}>
        <div className="loginBrand"><span><Package size={27}/></span><div><b>HOBIMOTO</b><small>STOK YÖNETİMİ</small></div></div>
        <div className="loginIntro"><div className="loginLock"><LockKeyhole size={21}/></div><span className="eyebrow">GÜVENLİ ERİŞİM</span><h1>Tekrar hoş geldin.</h1><p>Stok yönetim paneline devam etmek için giriş yap.</p></div>
        <label className="loginField"><span>KULLANICI ADI</span><input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required placeholder="Kullanıcı adın"/></label>
        <label className="loginField"><span>ŞİFRE</span><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Şifren"/></label>
        {error && <div className="loginError">{error}</div>}
        <button className="primary loginSubmit" disabled={busy}>{busy ? "Kontrol ediliyor..." : "Giriş Yap"}</button>
        <small className="loginFoot">Hobimoto · Yetkili personel erişimi</small>
      </form>
    </main>
  );
}

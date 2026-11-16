'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Barcode, Camera, Check, ChevronRight, CirclePlus, Clock3, Package, Pencil, Search, Trash2, X } from "lucide-react";

type Product = { barcode:string; name:string; category:string; price:number; stock:number; critical:number; shelf:string };
type Log = { id:string; date:string; type:string; barcode:string; name:string; quantity:number; user:string };
const empty: Product = { barcode:"", name:"", category:"", price:0, stock:0, critical:3, shelf:"" };

export default function Home() {
  const [products,setProducts] = useState<Product[]>([]);
  const [history,setHistory] = useState<Log[]>([]);
  const [loading,setLoading] = useState(true);
  const [mode,setMode] = useState<"Çıkış"|"Giriş"|"Sorgula">("Çıkış");
  const [barcode,setBarcode] = useState("");
  const [quantity,setQuantity] = useState(1);
  const [user,setUser] = useState("Personel");
  const [query,setQuery] = useState("");
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState<Product>(empty);
  const [editing,setEditing] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState<{text:string;bad?:boolean}|null>(null);
  const [camera,setCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{stop:()=>void}|null>(null);

  async function refresh() {
    const r = await fetch("/api/data", {cache:"no-store"});
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setProducts(d.products); setHistory(d.history);
  }
  useEffect(() => { refresh().catch(e=>setNotice({text:e.message,bad:true})).finally(()=>setLoading(false)); }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(()=>setNotice(null),4000);
    return ()=>clearTimeout(t);
  },[notice]);

  const critical = products.filter(p=>p.stock<=p.critical);
  const totalUnits = products.reduce((s,p)=>s+p.stock,0);
  const totalValue = products.reduce((s,p)=>s+p.stock*p.price,0);
  const filtered = useMemo(()=>products.filter(p=>
    [p.name,p.barcode,p.category,p.shelf].join(" ").toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))
  ),[products,query]);
  const found = products.find(p=>p.barcode===barcode.trim());

  async function stockAction() {
    if (!barcode.trim()) return setNotice({text:"Önce barkod okut veya gir.",bad:true});
    setBusy(true);
    try {
      const r=await fetch("/api/stock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({barcode:barcode.trim(),type:mode,quantity,user})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error);
      setNotice({text:`${d.product.name} • Yeni stok: ${d.product.stock}`});
      setBarcode(""); setQuantity(1); await refresh();
    } catch(e:any) { setNotice({text:e.message,bad:true}); }
    finally {setBusy(false);}
  }
  function openNew() {setForm(empty);setEditing("");setModal(true);}
  function openEdit(p:Product) {setForm({...p});setEditing(p.barcode);setModal(true);}
  async function save() {
    setBusy(true);
    try {
      const r=await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,originalBarcode:editing||undefined})});
      const d=await r.json();if(!r.ok)throw new Error(d.error);
      setModal(false);setNotice({text:"Ürün kaydedildi."});await refresh();
    }catch(e:any){setNotice({text:e.message,bad:true});}
    finally{setBusy(false);}
  }
  async function remove(p:Product) {
    if(!confirm(`${p.name} ürününü silmek istediğine emin misin?`))return;
    const r=await fetch(`/api/products?barcode=${encodeURIComponent(p.barcode)}`,{method:"DELETE"});
    const d=await r.json();if(!r.ok)return setNotice({text:d.error,bad:true});
    setNotice({text:"Ürün silindi."});await refresh();
  }
  async function startCamera() {
    try {
      setCamera(true);
      const reader = new BrowserMultiFormatReader();
      await new Promise(r=>setTimeout(r,150));
      if(!videoRef.current) return;
      const controls = await reader.decodeFromVideoDevice(undefined,videoRef.current,(result)=>{
        if(result){setBarcode(result.getText());setCamera(false);controlsRef.current?.stop();setNotice({text:"Barkod okundu."});}
      });
      controlsRef.current = controls;
    } catch(e:any) {setCamera(false);setNotice({text:"Kamera açılamadı. Tarayıcı kamera iznini ve HTTPS bağlantısını kontrol et.",bad:true});}
  }
  function stopCamera(){controlsRef.current?.stop();controlsRef.current=null;setCamera(false);}

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brandMark">H</div><div><b>HOBIMOTO</b><small>STOK YÖNETİMİ</small></div></div>
      <div className="sideLabel">MENÜ</div>
      <a className="nav active"><Package size={18}/> Genel Bakış</a>
      <a className="nav" href="#stok"><Barcode size={18}/> Barkod İşlemleri</a>
      <a className="nav" href="#urunler"><Package size={18}/> Ürünler</a>
      <a className="nav" href="#gecmis"><Clock3 size={18}/> İşlem Geçmişi</a>
      <div className="sideBottom"><div className="statusDot"/> Sistem hazır <small>Google Sheets bağlantısı</small></div>
    </aside>
    <section className="main">
      <header className="topbar"><div><span className="eyebrow">HOBIMOTO / YÖNETİM</span><h1>Genel Bakış</h1></div><button className="primary" onClick={openNew}><CirclePlus size={17}/> Ürün Ekle</button></header>
      <div className="content">
        <div className="welcome"><div><span className="eyebrow light">STOK KONTROL MERKEZİ</span><h2>Mağazan kontrol altında.</h2><p>Ürünlerini yönet, barkod okut ve stok hareketlerini anlık takip et.</p></div><div className="welcomeIcon"><Barcode size={58}/></div></div>
        <div className="stats">
          <Stat label="Ürün çeşidi" value={products.length.toLocaleString("tr-TR")} icon={<Package/>} note="Kayıtlı ürün"/>
          <Stat label="Toplam stok" value={totalUnits.toLocaleString("tr-TR")} icon={<Barcode/>} note="Toplam adet"/>
          <Stat label="Kritik stok" value={critical.length.toLocaleString("tr-TR")} icon={<AlertTriangle/>} note="Kontrol gerektiriyor" warn/>
          <Stat label="Stok değeri" value={totalValue.toLocaleString("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0})} icon={<ArrowUpFromLine/>} note="Tahmini satış değeri"/>
        </div>
        <section className="panel scannerPanel" id="stok">
          <div className="panelHead"><div><span className="eyebrow">HIZLI İŞLEM</span><h3>Barkod merkezi</h3></div><span className="live"><i/> CANLI</span></div>
          <div className="modeTabs">{(["Çıkış","Giriş","Sorgula"] as const).map(m=><button key={m} className={mode===m?"selected":""} onClick={()=>setMode(m)}>{m==="Çıkış"?<ArrowDownToLine size={16}/>:m==="Giriş"?<ArrowUpFromLine size={16}/>:<Search size={16}/>} {m}</button>)}</div>
          <div className="scanGrid"><div className="scanInput"><label>BARKOD NUMARASI</label><div className="inputWrap"><Barcode size={19}/><input autoFocus value={barcode} onChange={e=>setBarcode(e.target.value)} onKeyDown={e=>e.key==="Enter"&& (mode==="Sorgula"?setNotice({text:found?`${found.name} • ${found.price} TL • Stok ${found.stock}`:"Ürün bulunamadı.",bad:!found}):stockAction())} placeholder="Barkodu okut veya yaz..."/><button className="cameraBtn" onClick={startCamera}><Camera size={18}/></button></div>
          {found?<div className="found"><Check size={15}/><span><b>{found.name}</b> · {found.stock} adet · {found.price.toLocaleString("tr-TR")} TL</span></div>:barcode&&<div className="mutedHint">Bu barkod henüz kayıtlı değil.</div>}
          </div><div className="qtyBox"><label>ADET</label><div className="qtyControl"><button onClick={()=>setQuantity(Math.max(1,quantity-1))}>−</button><input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/><button onClick={()=>setQuantity(quantity+1)}>+</button></div></div></div>
          <div className="actionRow"><input className="userInput" value={user} onChange={e=>setUser(e.target.value)} placeholder="Personel adı"/><button className="primary actionButton" disabled={busy} onClick={()=>mode==="Sorgula"?(found?setNotice({text:`${found.name} • ${found.price} TL • Stok ${found.stock}`}):setNotice({text:"Ürün bulunamadı.",bad:true})):stockAction()}>{busy?"İşleniyor...":mode==="Çıkış"?"Stoktan Düş":mode==="Giriş"?"Stok Ekle":"Ürünü Sorgula"} <ChevronRight size={17}/></button></div>
          {camera&&<div className="cameraLayer"><div className="cameraHead">Barkod taranıyor <button onClick={stopCamera}><X/></button></div><video ref={videoRef}/><p>Barkodu çerçevenin içine hizala.</p></div>}
        </section>
        <div className="sectionTitle" id="urunler"><div><span className="eyebrow">ENVANTER</span><h3>Ürün listesi</h3></div><div className="searchBox"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ürün veya barkod ara..."/></div></div>
        <div className="panel tablePanel"><div className="tableScroll"><table><thead><tr><th>ÜRÜN</th><th>BARKOD</th><th>KATEGORİ</th><th>FİYAT</th><th>STOK</th><th>RAF</th><th></th></tr></thead><tbody>
        {loading?<tr><td colSpan={7} className="empty">Yükleniyor...</td></tr>:filtered.length===0?<tr><td colSpan={7} className="empty">Ürün bulunamadı. İlk ürününü ekleyebilirsin.</td></tr>:filtered.map(p=><tr key={p.barcode}><td><b>{p.name}</b><small className="mobileMeta">{p.category}</small></td><td className="mono">{p.barcode}</td><td>{p.category||"—"}</td><td>{p.price.toLocaleString("tr-TR")} ₺</td><td><span className={`stockPill ${p.stock<=p.critical?"low":""}`}>{p.stock} adet</span></td><td>{p.shelf||"—"}</td><td><div className="rowActions"><button title="Düzenle" onClick={()=>openEdit(p)}><Pencil size={15}/></button><button title="Sil" onClick={()=>remove(p)}><Trash2 size={15}/></button></div></td></tr>)}
        </tbody></table></div></div>
        <div className="sectionTitle" id="gecmis"><div><span className="eyebrow">KAYITLAR</span><h3>Son stok hareketleri</h3></div></div>
        <div className="panel historyPanel">{history.length===0?<div className="empty">Henüz stok hareketi yok.</div>:history.slice(0,8).map(h=><div className="historyRow" key={h.id}><div className={`historyIcon ${h.type==="Giriş"?"in":"out"}`}>{h.type==="Giriş"?<ArrowUpFromLine size={17}/>:<ArrowDownToLine size={17}/>}</div><div className="historyName"><b>{h.name}</b><small>{h.barcode} · {h.user}</small></div><div className={h.type==="Giriş"?"green":"red"}>{h.type==="Giriş"?"+":"−"}{h.quantity}</div><time>{new Date(h.date).toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</time></div>)}</div>
        {critical.length>0&&<div className="warning"><AlertTriangle size={18}/><div><b>{critical.length} ürün kritik stok seviyesinde.</b><span>Ürün listesinde stok uyarısı olan ürünleri kontrol et.</span></div></div>}
        <footer>HOBIMOTO <span>•</span> Stok Yönetim Sistemi</footer>
      </div>
    </section>
    {notice&&<div className={`toast ${notice.bad?"bad":""}`}>{notice.bad?<AlertTriangle size={17}/>:<Check size={17}/>} {notice.text}<button onClick={()=>setNotice(null)}><X size={15}/></button></div>}
    {modal&&<div className="modalBackdrop" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modalHead"><div><span className="eyebrow">ENVANTER KAYDI</span><h3>{editing?"Ürünü düzenle":"Yeni ürün ekle"}</h3></div><button onClick={()=>setModal(false)}><X/></button></div>
      <div className="formGrid">
        <Field label="Barkod" value={form.barcode} disabled={!!editing} onChange={v=>setForm({...form,barcode:v})}/>
        <Field label="Ürün adı" value={form.name} onChange={v=>setForm({...form,name:v})}/>
        <Field label="Kategori" value={form.category} onChange={v=>setForm({...form,category:v})}/>
        <Field label="Birim fiyat (₺)" type="number" value={String(form.price)} onChange={v=>setForm({...form,price:Number(v)})}/>
        <Field label="Mevcut stok" type="number" value={String(form.stock)} onChange={v=>setForm({...form,stock:Number(v)})}/>
        <Field label="Kritik stok seviyesi" type="number" value={String(form.critical)} onChange={v=>setForm({...form,critical:Number(v)})}/>
        <Field label="Raf yeri" value={form.shelf} onChange={v=>setForm({...form,shelf:v})}/>
      </div><div className="modalActions"><button className="secondary" onClick={()=>setModal(false)}>Vazgeç</button><button className="primary" disabled={busy} onClick={save}>{busy?"Kaydediliyor...":"Kaydet"}</button></div>
    </div></div>}
  </main>;
}

function Stat({label,value,icon,note,warn=false}:{label:string;value:string;icon:React.ReactNode;note:string;warn?:boolean}) {
  return <div className="stat"><div className={`statIcon ${warn?"warn":""}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
function Field({label,value,onChange,type="text",disabled=false}:{label:string;value:string;onChange:(v:string)=>void;type?:string;disabled?:boolean}) {
  return <label className="field"><span>{label}</span><input type={type} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/></label>;
}

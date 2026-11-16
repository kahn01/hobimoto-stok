# Hobimoto Stok Takip

Next.js + Vercel + Google Sheets tabanlı barkodlu stok takip uygulaması.

## Özellikler
- Ürün ekleme, düzenleme, silme
- USB/Bluetooth klavye tipi barkod okuyucu desteği
- HTTPS üzerinden telefon kamerasıyla barkod tarama (ZXing)
- Stok girişi / çıkışı ve işlem geçmişi
- Kritik stok göstergesi, ürün arama, stok değeri

## 1. Google Sheets hazırlığı
1. Google Drive'da boş bir Google E-Tablolar dosyası oluşturun.
2. Google Cloud Console'da bir proje açın ve **Google Sheets API**'yi etkinleştirin.
3. Bir Service Account oluşturup JSON anahtarını indirin.
4. Service Account e-posta adresini Google Sheet dosyasında **Düzenleyici** olarak paylaşın.
5. Sheet URL'sindeki `/d/` ile `/edit` arasındaki değeri `GOOGLE_SHEET_ID` olarak kullanın.
6. İndirilen JSON dosyasını base64 kodlayın. macOS/Linux: `base64 -i service-account.json | tr -d '\n'`; Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('service-account.json'))`.

Uygulama ilk açıldığında `Stok_Listesi` ve `Islem_Gecmisi` sekmelerini ve başlıklarını otomatik oluşturur.

## 2. Yerelde çalıştırma
```bash
npm install
cp .env.example .env.local
# .env.local içindeki iki değişkeni doldurun
npm run dev
```
Tarayıcıda http://localhost:3000 adresini açın.

## 3. Vercel'e yayınlama
1. Bu projeyi GitHub deposuna yükleyin.
2. Vercel'de **Add New → Project** ile depoyu içe aktarın.
3. Project Settings → Environment Variables bölümüne `GOOGLE_SHEET_ID` ve `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` değişkenlerini ekleyin.
4. Deploy edin. Kamera taraması HTTPS altında çalışır.

## Google Sheets sütunları
- `Stok_Listesi`: Barkod, Urun_Adi, Kategori, Birim_Fiyat, Mevcut_Stok, Kritik_Seviye, Raf_Yeri
- `Islem_Gecmisi`: Islem_ID, Tarih_Saat, Islem_Turu, Barkod, Urun_Adi, Adet, Kullanici

## Önemli üretim notları
- Bu ilk sürümde giriş/kullanıcı yetkilendirmesi yoktur. Yayına almadan önce Vercel Deployment Protection veya bir kimlik doğrulama katmanı ekleyin; aksi halde URL'yi bilen kişiler stok verisini değiştirebilir.
- Google Sheets eşzamanlı yoğun kasa işlemlerinde gerçek bir transaction/veritabanı değildir. Birden fazla kasadan aynı anda işlem yapılacaksa PostgreSQL/Supabase gibi transaction destekli veritabanına geçilmesi önerilir.
- İlk kurulumdan sonra Sheet sekme isimlerini ve sütun sıralarını değiştirmeyin.
- Ürünleri silmek işlem geçmişini silmez; geçmiş kayıtları korunur.

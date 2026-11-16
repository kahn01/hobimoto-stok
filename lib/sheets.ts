import { google } from "googleapis";

const PRODUCTS = "Stok_Listesi";
const LOGS = "Islem_Gecmisi";
const PRODUCT_HEADERS = ["Barkod","Urun_Adi","Kategori","Birim_Fiyat","Mevcut_Stok","Kritik_Seviye","Raf_Yeri"];
const LOG_HEADERS = ["Islem_ID","Tarih_Saat","Islem_Turu","Barkod","Urun_Adi","Adet","Kullanici"];

function sheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!raw || !process.env.GOOGLE_SHEET_ID) throw new Error("Google Sheets ortam değişkenleri eksik.");
  const credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function ensureSheets() {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const names = new Set((meta.data.sheets || []).map(s => s.properties?.title));
  const requests: any[] = [];
  for (const title of [PRODUCTS, LOGS]) {
    if (!names.has(title)) requests.push({ addSheet: { properties: { title } } });
  }
  if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  const productRows = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${PRODUCTS}!A1:G1` });
  if (!productRows.data.values?.length) await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${PRODUCTS}!A1:G1`, valueInputOption: "RAW",
    requestBody: { values: [PRODUCT_HEADERS] }
  });
  const logRows = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${LOGS}!A1:G1` });
  if (!logRows.data.values?.length) await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${LOGS}!A1:G1`, valueInputOption: "RAW",
    requestBody: { values: [LOG_HEADERS] }
  });
}

export type Product = {
  barcode: string; name: string; category: string; price: number;
  stock: number; critical: number; shelf: string;
};

export async function getProducts(): Promise<Product[]> {
  await ensureSheets();
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!, range: `${PRODUCTS}!A2:G`
  });
  return (res.data.values || []).filter(r => r[0]).map(r => ({
    barcode: String(r[0]), name: String(r[1] || ""), category: String(r[2] || ""),
    price: Number(r[3] || 0), stock: Number(r[4] || 0),
    critical: Number(r[5] || 0), shelf: String(r[6] || "")
  }));
}

export async function getHistory(limit = 100) {
  await ensureSheets();
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!, range: `${LOGS}!A2:G`
  });
  return (res.data.values || []).slice(-limit).reverse().map(r => ({
    id: r[0], date: r[1], type: r[2], barcode: r[3], name: r[4],
    quantity: Number(r[5] || 0), user: r[6]
  }));
}

export async function saveProduct(p: Product, originalBarcode?: string) {
  await ensureSheets();
  const sheets = sheetsClient(), spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const rows = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${PRODUCTS}!A2:G` });
  const values = rows.data.values || [];
  const target = originalBarcode || p.barcode;
  const index = values.findIndex(r => String(r[0]) === target);
  const row = [p.barcode,p.name,p.category,p.price,p.stock,p.critical,p.shelf];
  if (index >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${PRODUCTS}!A${index + 2}:G${index + 2}`,
      valueInputOption: "USER_ENTERED", requestBody: { values: [row] }
    });
  } else {
    if (values.some(r => String(r[0]) === p.barcode)) throw new Error("Bu barkod zaten kayıtlı.");
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${PRODUCTS}!A:G`, valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS", requestBody: { values: [row] }
    });
  }
}

export async function deleteProduct(barcode: string) {
  await ensureSheets();
  const sheets = sheetsClient(), spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === PRODUCTS);
  const rows = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${PRODUCTS}!A2:G` });
  const index = (rows.data.values || []).findIndex(r => String(r[0]) === barcode);
  if (index < 0) throw new Error("Ürün bulunamadı.");
  const sheetId = sheet?.properties?.sheetId;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{
    deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: index + 1, endIndex: index + 2 } }
  }] } });
}

export async function adjustStock(barcode: string, type: "Giriş" | "Çıkış", quantity: number, user: string) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error("Adet 1 ile 100000 arasında tam sayı olmalı.");
  await ensureSheets();
  const sheets = sheetsClient(), spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const rows = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${PRODUCTS}!A2:G` });
  const values = rows.data.values || [];
  const index = values.findIndex(r => String(r[0]) === barcode);
  if (index < 0) throw new Error("Bu barkodla kayıtlı ürün bulunamadı.");
  const row = values[index];
  const oldStock = Number(row[4] || 0);
  const newStock = oldStock + (type === "Giriş" ? quantity : -quantity);
  if (newStock < 0) throw new Error(`Yetersiz stok. Mevcut stok: ${oldStock}`);
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${PRODUCTS}!E${index + 2}`, valueInputOption: "USER_ENTERED",
    requestBody: { values: [[newStock]] }
  });
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${LOGS}!A:G`, valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[crypto.randomUUID(), now, type, barcode, row[1], quantity, user || "Personel"]] }
  });
  return { barcode, name: String(row[1]), stock: newStock, critical: Number(row[5] || 0) };
}

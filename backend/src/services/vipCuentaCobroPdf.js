import puppeteer from 'puppeteer';
import {
  fetchVipCuentaCobro,
} from './vipCuentaCobro.js';
import { buildVipCuentaHtml, wrapVipCuentaHtmlDocument } from './vipCuentaCobroTemplate.js';

function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function vipCuentaPdfFileName(row) {
  const num = safeName(row.numero).replace(/\s/g, '');
  const cli = safeName(row.nombrecliente).split(' ')[0] || row.codigo_cliente;
  return `Cuenta Cobro ${num} ${cli}.pdf`;
}

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
    process.once('exit', () => {
      browserPromise?.then((b) => b.close()).catch(() => {});
    });
  }
  return browserPromise;
}

export async function renderVipCuentaHtmlToPdfBuffer(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(wrapVipCuentaHtmlDocument(html), {
      waitUntil: 'networkidle0',
    });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
      },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function buildVipCuentaPdf(row) {
  const html = buildVipCuentaHtml(row);
  return renderVipCuentaHtmlToPdfBuffer(html);
}

export async function buildVipCuentaPdfById(cns) {
  const row = await fetchVipCuentaCobro(cns);
  if (!row) return null;
  const pdf = await buildVipCuentaPdf(row);
  return { row, pdf, filename: vipCuentaPdfFileName(row) };
}

export function buildVipCuentaPreviewHtml(row) {
  return buildVipCuentaHtml(row);
}

export async function buildVipCuentaPreviewHtmlById(cns) {
  const row = await fetchVipCuentaCobro(cns);
  if (!row) return null;
  return { row, html: buildVipCuentaHtml(row) };
}

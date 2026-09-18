/**
 * ReceiptBench — demo data seeder
 * ---------------------------------------------------------------------------
 * Fills the app with synthetic prompts, receipts, and benchmark results so you
 * can explore every view without an API key or a single paid model call.
 *
 * Usage:
 *   1. npm run dev
 *   2. Open http://localhost:3000 and open the browser devtools console
 *   3. Paste this entire file into the console and press Enter
 *   4. Reload the page
 *
 * It writes to:
 *   - localStorage:  ocr_prompts, ocr_results, ocr_custom_models
 *   - IndexedDB:      ReceiptBenchDB / receipts
 *
 * To wipe the demo data again, run in the console:
 *   localStorage.clear(); indexedDB.deleteDatabase('ReceiptBenchDB'); location.reload();
 *
 * All data is fabricated. The receipt images are drawn on a <canvas> at runtime
 * and use fictional merchants and reserved-for-fiction 555-01xx phone numbers —
 * no real people, businesses, or payment details are involved. Benchmark results
 * are synthesized from a seeded PRNG, so the numbers are reproducible but are
 * NOT real measurements of any model.
 */

(async () => {
  // ---------- 1. Draw synthetic receipt images (fictional merchants, no real PII) ----------
  const RECEIPT_DEFS = [
    {
      key: 'cafe',
      merchant: 'BLUE HARBOR COFFEE',
      addr: ['241 Wharf Street', 'Portland, ME 04101', '(207) 555-0142'],
      date: '2026-02-14', time: '08:42 AM',
      items: [
        { name: 'Cortado', qty: 1, price: 4.25 },
        { name: 'Almond Croissant', qty: 1, price: 3.95 },
        { name: 'Cold Brew 16oz', qty: 2, price: 5.50 }
      ],
      currency: 'USD', taxRate: 0.055, payment: 'VISA ****4291'
    },
    {
      key: 'grocery',
      merchant: 'NORTHGATE MARKET',
      addr: ['8890 Riverbend Ave', 'Boise, ID 83702', '(208) 555-0177'],
      date: '2026-01-29', time: '06:15 PM',
      items: [
        { name: 'Organic Bananas', qty: 3, price: 0.69 },
        { name: 'Whole Milk 1gal', qty: 1, price: 4.49 },
        { name: 'Sourdough Loaf', qty: 1, price: 5.25 },
        { name: 'Free Range Eggs 12ct', qty: 2, price: 6.19 },
        { name: 'Roma Tomatoes lb', qty: 2, price: 1.98 }
      ],
      currency: 'USD', taxRate: 0.06, payment: 'MASTERCARD ****8830'
    },
    {
      key: 'hardware',
      merchant: 'CEDAR & BOLT SUPPLY',
      addr: ['12 Foundry Road', 'Asheville, NC 28801', '(828) 555-0119'],
      date: '2026-02-03', time: '11:07 AM',
      items: [
        { name: '2x4 Pine Stud 8ft', qty: 6, price: 4.87 },
        { name: 'Deck Screws 5lb', qty: 1, price: 28.40 },
        { name: 'Wood Glue 16oz', qty: 1, price: 9.15 }
      ],
      currency: 'USD', taxRate: 0.07, payment: 'CASH'
    }
  ];

  function drawReceipt(def) {
    const W = 620, PAD = 46;
    const c = document.createElement('canvas');
    const lineH = 30;
    const H = 300 + def.items.length * lineH + 320;
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    // paper
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, W, H);
    // subtle paper noise
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.022})`;
      g.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }

    let y = PAD + 24;
    const center = (txt, font, color = '#111') => {
      g.font = font; g.fillStyle = color; g.textAlign = 'center';
      g.fillText(txt, W / 2, y);
    };
    const row = (l, r, font = '400 22px "Courier New", monospace', color = '#1a1a1a') => {
      g.font = font; g.fillStyle = color;
      g.textAlign = 'left';  g.fillText(l, PAD, y);
      g.textAlign = 'right'; g.fillText(r, W - PAD, y);
    };
    const rule = (dash = true) => {
      g.strokeStyle = '#9a9a95'; g.lineWidth = 1.5;
      g.setLineDash(dash ? [6, 6] : []);
      g.beginPath(); g.moveTo(PAD, y); g.lineTo(W - PAD, y); g.stroke();
      g.setLineDash([]);
    };

    center(def.merchant, '700 30px "Courier New", monospace');
    y += 34;
    def.addr.forEach(a => { center(a, '400 19px "Courier New", monospace', '#4a4a48'); y += 25; });
    y += 14; rule(); y += 34;

    row(def.date, def.time, '400 20px "Courier New", monospace', '#3a3a38');
    y += 24; row('ORDER #' + (1000 + Math.floor(Math.random() * 8999)), '', '400 20px "Courier New", monospace', '#3a3a38');
    y += 20; rule(); y += 36;

    let subtotal = 0;
    def.items.forEach(it => {
      const line = it.qty * it.price;
      subtotal += line;
      row(`${it.qty} x ${it.name}`, line.toFixed(2));
      y += lineH;
    });

    y += 8; rule(); y += 34;
    const tax = Math.round(subtotal * def.taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    row('SUBTOTAL', subtotal.toFixed(2)); y += 30;
    row('TAX', tax.toFixed(2)); y += 34;
    row('TOTAL', '$' + total.toFixed(2), '700 26px "Courier New", monospace');
    y += 40; rule(); y += 34;
    row('PAID', def.payment, '400 20px "Courier New", monospace', '#3a3a38');
    y += 46;
    center('THANK YOU FOR YOUR VISIT', '400 19px "Courier New", monospace', '#5a5a58');
    y += 40;
    // fake barcode
    g.fillStyle = '#111';
    let bx = PAD + 40;
    while (bx < W - PAD - 40) { const w = 1 + Math.random() * 4; g.fillRect(bx, y, w, 52); bx += w + 2 + Math.random() * 3; }

    def._subtotal = subtotal; def._tax = tax; def._total = total;
    return c.toDataURL('image/jpeg', 0.9);
  }

  // ---------- 2. Receipts + ground truth ----------
  const receipts = RECEIPT_DEFS.map((def, i) => {
    const dataUrl = drawReceipt(def);
    const gt = {
      merchant: def.merchant.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' '),
      total: def._total,
      date: def.date,
      currency: def.currency,
      items: def.items.map(it => ({ name: it.name, price: it.price, qty: it.qty }))
    };
    return {
      id: `receipt-${def.key}`,
      name: `${def.merchant.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')}.jpg`,
      imageUrl: dataUrl,
      base64: dataUrl.split(',')[1],
      mimeType: 'image/jpeg',
      groundTruthJson: JSON.stringify(gt, null, 2),
      _gt: gt
    };
  });

  // write to IndexedDB
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('ReceiptBenchDB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('receipts')) db.createObjectStore('receipts', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('receipts', 'readwrite');
      const store = tx.objectStore('receipts');
      store.clear();
      receipts.forEach(r => { const { _gt, ...rest } = r; store.put(rest); });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });

  // ---------- 3. Prompts ----------
  const now = Date.now();
  const DAY = 86400000;
  const prompts = [
    {
      id: 'prompt-baseline', name: 'Receipt Baseline', version: 1,
      content: `Extract the merchant name, transaction date, currency, line items, and grand total from this receipt.\n\nReturn a single JSON object. Use the exact field names: merchant, date, currency, items, total.\nEach entry in "items" must have: name, price, qty.`,
      createdAt: now - 12 * DAY
    },
    {
      id: 'prompt-strict', name: 'Strict Schema + Rules', version: 2,
      content: `Extract structured data from this receipt image.\n\nRULES:\n1. "date" must be normalized to ISO 8601 (YYYY-MM-DD).\n2. "total" is the final amount charged AFTER tax — never the subtotal.\n3. "currency" must be a 3-letter ISO 4217 code (e.g. USD).\n4. Preserve line-item names exactly as printed, including size/weight suffixes.\n5. "qty" defaults to 1 when no quantity is printed.\n6. Never invent a field you cannot read — use null instead.\n\nRequired field names: merchant, date, currency, items[{name, price, qty}], total.`,
      createdAt: now - 6 * DAY
    },
    {
      id: 'prompt-fewshot', name: 'Few-Shot Guided', version: 3,
      content: `You are extracting receipt data for an expense pipeline.\n\nEXAMPLE\nPrinted: "3 x Organic Bananas ........ 2.07"\nExtracted: { "name": "Organic Bananas", "qty": 3, "price": 0.69 }\nNote: "price" is the UNIT price, not the line total.\n\nApply the same logic to every line item in the attached receipt.\nNormalize dates to YYYY-MM-DD. "total" is the post-tax amount due.\nRequired field names: merchant, date, currency, items[{name, price, qty}], total.`,
      createdAt: now - 2 * DAY
    }
  ];

  // ---------- 4. Custom model (demonstrates the custom-model feature) ----------
  const customModels = {
    'qwen/qwen2.5-vl-72b-instruct': {
      id: 'qwen/qwen2.5-vl-72b-instruct',
      name: 'Qwen2.5-VL 72B',
      inputPrice: 0.25 / 1000000,
      outputPrice: 0.75 / 1000000,
      color: 'bg-rose-100 text-rose-700 border-rose-200'
    }
  };

  // ---------- 5. Synthesized benchmark results ----------
  const MODEL_PRICING = {
    'google/gemini-2.5-flash-lite':  { in: 0.075, out: 0.30 },
    'google/gemini-2.5-flash':       { in: 0.10,  out: 0.40 },
    'google/gemini-3-pro-preview':   { in: 1.25,  out: 5.00 },
    'openai/gpt-4o':                 { in: 5.00,  out: 15.00 },
    'anthropic/claude-3.5-sonnet':   { in: 3.00,  out: 15.00 },
    'qwen/qwen2.5-vl-72b-instruct':  { in: 0.25,  out: 0.75 }
  };
  // per-model behaviour: accuracy ceiling, latency profile
  const MODEL_PROFILE = {
    'google/gemini-2.5-flash-lite': { base: 0.62, lat: 1500 },
    'google/gemini-2.5-flash':      { base: 0.78, lat: 2300 },
    'google/gemini-3-pro-preview':  { base: 0.93, lat: 5200 },
    'openai/gpt-4o':                { base: 0.85, lat: 4100 },
    'anthropic/claude-3.5-sonnet':  { base: 0.88, lat: 3600 },
    'qwen/qwen2.5-vl-72b-instruct': { base: 0.71, lat: 6400 }
  };
  // prompt engineering lifts accuracy
  const PROMPT_LIFT = { 'prompt-baseline': 0.0, 'prompt-strict': 0.055, 'prompt-fewshot': 0.085 };
  // harder receipts score lower
  const RECEIPT_DIFF = { 'receipt-cafe': 0.02, 'receipt-grocery': -0.05, 'receipt-hardware': -0.01 };

  // deterministic pseudo-random so screenshots are reproducible
  let _s = 20260214;
  const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };

  const buildOutput = (receipt, acc) => {
    const gt = receipt._gt;
    const conf = v => Math.min(0.99, Math.max(0.41, v));
    const jitter = () => conf(acc + (rnd() - 0.5) * 0.12);
    const out = {
      merchant: { value: gt.merchant, confidence: jitter() },
      date: { value: acc > 0.7 ? gt.date : gt.date.split('-').reverse().join('/'), confidence: jitter() },
      currency: { value: gt.currency, confidence: jitter() },
      total: { value: acc > 0.6 ? gt.total : Math.round((gt.total * 0.93) * 100) / 100, confidence: jitter() },
      items: gt.items.map((it, idx) => {
        const drop = acc < 0.7 && idx === gt.items.length - 1;
        return {
          name: { value: drop ? null : it.name, confidence: drop ? 0.0 : jitter() },
          price: { value: acc > 0.75 ? it.price : Math.round(it.price * it.qty * 100) / 100, confidence: jitter() },
          qty: { value: it.qty, confidence: jitter() }
        };
      })
    };
    return JSON.stringify(out, null, 2);
  };

  const results = [];
  const modelIds = Object.keys(MODEL_PROFILE);
  const RUNS = 3;
  let tsCursor = now - 4 * 3600 * 1000;

  for (let run = 0; run < RUNS; run++) {
    for (const modelId of modelIds) {
      for (const prompt of prompts) {
        for (const receipt of receipts) {
          const prof = MODEL_PROFILE[modelId];
          const price = MODEL_PRICING[modelId];
          let acc = prof.base + PROMPT_LIFT[prompt.id] + RECEIPT_DIFF[receipt.id] + (rnd() - 0.5) * 0.06;
          acc = Math.max(0.28, Math.min(0.99, acc));
          // quantize to look like real field-match ratios
          const fieldCount = 4 + receipt._gt.items.length * 3;
          acc = Math.round(acc * fieldCount) / fieldCount;

          const latencyMs = Math.round(prof.lat * (0.82 + rnd() * 0.42));
          const inputTokens = 1180 + Math.round(rnd() * 260);
          const outputTokens = 210 + receipt._gt.items.length * 34 + Math.round(rnd() * 60);
          const tokensUsed = inputTokens + outputTokens;
          const costUsd = (inputTokens * price.in / 1000000) + (outputTokens * price.out / 1000000);

          tsCursor += 4000 + Math.round(rnd() * 9000);
          results.push({
            id: crypto.randomUUID(),
            promptId: prompt.id,
            modelId,
            receiptId: receipt.id,
            outputJson: buildOutput(receipt, acc),
            timestamp: tsCursor,
            metrics: {
              latencyMs,
              accuracy: acc,
              tokensUsed,
              costUsd,
              tokensPerSecond: outputTokens / (latencyMs / 1000)
            },
            runIndex: run
          });
        }
      }
    }
  }
  // Shuffle timestamps so the "recent" views show an interleaved mix of models
  {
    const stamps = results.map(r => r.timestamp).sort((a, b) => a - b);
    for (let i = stamps.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [stamps[i], stamps[j]] = [stamps[j], stamps[i]];
    }
    results.forEach((r, i) => { r.timestamp = stamps[i]; });
  }
  results.sort((a, b) => b.timestamp - a.timestamp);

  localStorage.setItem('ocr_prompts', JSON.stringify(prompts.map(({ ...p }) => p)));
  localStorage.setItem('ocr_results', JSON.stringify(results));
  localStorage.setItem('ocr_custom_models', JSON.stringify(customModels));

  return { receipts: receipts.length, prompts: prompts.length, results: results.length, models: modelIds.length };
})()

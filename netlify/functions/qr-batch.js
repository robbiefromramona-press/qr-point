// POST /api/qr-batch
// Body: { manifest: [{ id, pointNumber }, ...], baseUrl: "https://qrpoint.example.com" }
//
// Generates one QR code per point (encoding {baseUrl}/p/{id}) and lays them
// out on a printable PDF label sheet (US Letter, 3 columns) labeled by point
// number, ready to send to a laser printer for jobsite labels.

const QRCode = require('qrcode');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { jsonResponse, CORS_HEADERS } = require('./_supabase');

const PAGE_WIDTH = 612; // 8.5in @ 72pt/in
const PAGE_HEIGHT = 792; // 11in @ 72pt/in
const MARGIN = 36; // 0.5in
const COLS = 3;
const ROWS = 7;
const CELL_W = (PAGE_WIDTH - MARGIN * 2) / COLS;
const CELL_H = (PAGE_HEIGHT - MARGIN * 2) / ROWS;
const QR_SIZE = Math.min(CELL_W, CELL_H) - 34; // leave room for the label text

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const { manifest, baseUrl } = payload;

  if (!Array.isArray(manifest) || !manifest.length) {
    return jsonResponse(400, { error: 'Missing or empty manifest array.' });
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    return jsonResponse(400, { error: 'Missing baseUrl (string) in request body.' });
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const perPage = COLS * ROWS;
    const pageCount = Math.ceil(manifest.length / perPage);

    for (let p = 0; p < pageCount; p++) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const pageItems = manifest.slice(p * perPage, (p + 1) * perPage);

      for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);

        const cellX = MARGIN + col * CELL_W;
        const cellTopY = PAGE_HEIGHT - MARGIN - row * CELL_H;

        const url = `${baseUrl.replace(/\/+$/, '')}/p/${item.id}`;
        const qrPngDataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: 300,
          errorCorrectionLevel: 'M',
        });
        const qrPngBytes = Buffer.from(qrPngDataUrl.split(',')[1], 'base64');
        const qrImage = await pdfDoc.embedPng(qrPngBytes);

        const qrX = cellX + (CELL_W - QR_SIZE) / 2;
        const qrY = cellTopY - QR_SIZE - 6;

        page.drawImage(qrImage, { x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE });

        const label = String(item.pointNumber ?? item.id);
        const fontSize = 10;
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        page.drawText(label, {
          x: cellX + (CELL_W - textWidth) / 2,
          y: qrY - 14,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="qr-point-labels.pdf"',
        ...CORS_HEADERS,
      },
      isBase64Encoded: true,
      body: Buffer.from(pdfBytes).toString('base64'),
    };
  } catch (err) {
    return jsonResponse(500, { error: `PDF generation failed: ${err.message}` });
  }
};

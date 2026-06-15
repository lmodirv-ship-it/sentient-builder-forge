// Extract text from PDF in the browser using pdfjs-dist (legacy build for max compat).
// Tries to load the worker; falls back to worker-less mode if the worker URL fails
// (some bundling / preview environments block module workers).
export async function extractPdfText(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction must run in the browser.");
  }

  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Try to wire up the worker. If it fails, disable the worker entirely.
  let disableWorker = false;
  try {
    const workerMod: any = await import(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
    );
    pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;
  } catch {
    disableWorker = true;
  }

  const buf = await file.arrayBuffer();
  let pdf: any;
  try {
    pdf = await pdfjs.getDocument({
      data: buf,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      disableWorker,
    }).promise;
  } catch (e: any) {
    // Retry once without worker if the worker path failed at runtime.
    if (!disableWorker) {
      pdf = await pdfjs.getDocument({
        data: buf,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: true,
        disableWorker: true,
      }).promise;
    } else {
      throw new Error(
        "Failed to read PDF: " + (e?.message || String(e)),
      );
    }
  }

  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strs = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ");
    text += strs + "\n\n";
  }
  const out = text.trim();
  if (!out) {
    throw new Error(
      "No selectable text found in this PDF (it may be a scanned image — try uploading pages as images for OCR).",
    );
  }
  return out;
}

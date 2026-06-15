// Extract text from PDF in the browser using pdfjs-dist (legacy build for max compat).
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // @ts-ignore
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: buf,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strs = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    text += strs + "\n\n";
  }
  return text.trim();
}

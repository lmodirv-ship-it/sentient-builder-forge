export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function kindLabel(k: "site" | "video" | "image" | "logo" | "cv" | "audio"): string {
  return { site: "موقع", video: "فيديو", image: "صورة", logo: "شعار", cv: "سيرة", audio: "صوت" }[k];
}

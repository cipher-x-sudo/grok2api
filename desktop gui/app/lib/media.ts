export async function dataUrlToFile(dataUrl: string, filename = "upload.png"): Promise<File> {
  const r = await fetch(dataUrl);
  const blob = await r.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

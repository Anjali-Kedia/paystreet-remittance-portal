import { api } from "./api";

export async function downloadFile(
  url: string,
  filename: string,
  mime: string,
) {
  const res = await api.get(url, { responseType: "blob" });
  const blob = new Blob([res.data], { type: mime });
  const link = document.createElement("a");
  const href = URL.createObjectURL(blob);
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

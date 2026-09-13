import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowDownToLine, CloudUpload, FileArchive, FileText, LockKeyhole } from "lucide-react";
import { useRoute } from "wouter";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export default function SharePage() {
  const [, params] = useRoute("/s/:token");
  const fileQuery = trpc.files.getPublic.useQuery({ token: params?.token ?? "" }, { enabled: Boolean(params?.token), retry: false });
  const file = fileQuery.data;
  const isArchive = file?.mimeType.includes("zip") || file?.mimeType.includes("compressed");

  return <main className="min-h-screen bg-[#0d0d10] px-6 py-8 text-[#f7f4ee]"><nav className="mx-auto flex max-w-5xl items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#a896ff] text-[#16131e]"><CloudUpload className="size-5" /></span><span className="text-lg font-semibold tracking-tight">DropVault</span></nav><section className="mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center"><div className="w-full rounded-[1.75rem] border border-white/10 bg-[#16151b] p-7 text-center shadow-2xl shadow-black/30 sm:p-12">{fileQuery.isLoading ? <p className="text-[#aaa6b2]">Memuat file...</p> : fileQuery.isError || !file ? <><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-[#351e29] text-[#e9898c]"><LockKeyhole className="size-6" /></div><h1 className="text-2xl font-semibold">Link tidak tersedia</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#aaa6b2]">File ini mungkin sudah dihapus atau link yang kamu buka sudah tidak valid.</p></> : <><div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-[#a896ff]/10 text-[#a896ff]">{isArchive ? <FileArchive className="size-8" /> : <FileText className="size-8" />}</div><p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#a896ff]">PUBLIC FILE</p><h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{file.originalName}</h1><p className="mt-3 text-sm text-[#aaa6b2]">{formatBytes(file.sizeBytes)} · {file.mimeType}</p><Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-[#a896ff] px-6 font-semibold text-[#191523] hover:bg-[#b9adff]"><a href={file.storageUrl} target="_blank" rel="noreferrer" download={file.originalName}><ArrowDownToLine className="mr-2 size-4" /> Download file</a></Button><p className="mt-7 flex items-center justify-center gap-2 text-xs text-[#77727f]"><LockKeyhole className="size-3.5" /> Shared securely with DropVault</p></>}</div></section></main>;
}

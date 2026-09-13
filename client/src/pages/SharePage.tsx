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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9fc] px-6 py-8 text-[#2a2030]">
      <div className="pointer-events-none absolute -left-24 bottom-0 size-72 rounded-full bg-[#ffd4e7]/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-0 size-80 rounded-full bg-[#ddd5ff]/70 blur-3xl" />
      <nav className="relative z-10 mx-auto flex max-w-5xl items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border-2 border-[#2a2030] bg-[#f5b8d2] shadow-[3px_3px_0_#2a2030]"><CloudUpload className="size-5" /></span><span className="text-lg font-black tracking-tight">DropVault</span></nav>
      <section className="relative z-10 mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center"><div className="w-full rounded-[1.5rem] border-2 border-[#2a2030] bg-white p-7 text-center shadow-[6px_6px_0_#2a2030] sm:p-12">{fileQuery.isLoading ? <p className="font-medium text-[#756b7c]">Memuat file...</p> : fileQuery.isError || !file ? <><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border-2 border-[#2a2030] bg-[#fff0f6] text-[#b76388] shadow-[3px_3px_0_#2a2030]"><LockKeyhole className="size-6" /></div><h1 className="text-2xl font-black">Link tidak tersedia</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#756b7c]">File ini mungkin sudah dihapus atau link yang kamu buka sudah tidak valid.</p></> : <><div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border-2 border-[#2a2030] bg-[#eeeaff] text-[#7565cb] shadow-[4px_4px_0_#f5b8d2]">{isArchive ? <FileArchive className="size-8" /> : <FileText className="size-8" />}</div><p className="mb-3 inline-flex rounded-full border border-[#2a2030] bg-[#f5b8d2] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">PUBLIC FILE</p><h1 className="mt-4 break-words text-2xl font-black tracking-tight sm:text-3xl">{file.originalName}</h1><p className="mt-3 text-sm font-medium text-[#756b7c]">{formatBytes(file.sizeBytes)} · {file.mimeType}</p><Button asChild size="lg" className="mt-8 h-12 rounded-xl border-2 border-[#2a2030] bg-[#bdb2ff] px-6 font-bold text-[#2a2030] shadow-[4px_4px_0_#2a2030] hover:-translate-y-0.5 hover:bg-[#c9c0ff]"><a href={file.storageUrl} target="_blank" rel="noreferrer" download={file.originalName}><ArrowDownToLine className="mr-2 size-4" /> Download file</a></Button><p className="mt-7 flex items-center justify-center gap-2 text-xs font-medium text-[#756b7c]"><LockKeyhole className="size-3.5 text-[#7565cb]" /> Shared securely with DropVault</p></>}</div></section>
    </main>
  );
}

import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  CloudUpload,
  Copy,
  FileArchive,
  FileText,
  Files,
  HardDrive,
  Link2,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function fileIcon(mimeType: string) {
  if (mimeType.includes("zip") || mimeType.includes("compressed") || mimeType.includes("archive")) {
    return <FileArchive className="size-5 text-[#c680a8]" />;
  }
  return <FileText className="size-5 text-[#7565cb]" />;
}

async function toBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(index, index + chunkSize)));
  }
  return btoa(binary);
}

const border = "border-2 border-[#2a2030]";
const softShadow = "shadow-[5px_5px_0_#2a2030]";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const filesQuery = trpc.files.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const uploadMutation = trpc.files.upload.useMutation({
    onSuccess: async () => {
      await utils.files.list.invalidate();
      toast.success("File berhasil diupload");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.files.delete.useMutation({
    onSuccess: async () => {
      await utils.files.list.invalidate();
      toast.success("File dihapus dari dashboard");
    },
    onError: (error) => toast.error(error.message),
  });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const files = filesQuery.data ?? [];
  const totalBytes = files.reduce((total, file) => total + file.sizeBytes, 0);

  async function handleUpload(file?: File) {
    if (!file || uploadMutation.isPending) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Ukuran file maksimal 25 MB");
      return;
    }
    try {
      toast.info("Menyiapkan file untuk upload...");
      const base64 = await toBase64(file);
      await uploadMutation.mutateAsync({ filename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, base64 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function copyShareLink(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
    setCopiedToken(token);
    toast.success("Link publik disalin");
    window.setTimeout(() => setCopiedToken(null), 1800);
  }

  if (loading) return <div className="min-h-screen bg-[#fff9fc]" />;

  if (!isAuthenticated) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#fff9fc] text-[#2a2030]">
        <div className="pointer-events-none absolute -left-28 top-24 size-80 rounded-full bg-[#ffd4e7]/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-0 size-[30rem] rounded-full bg-[#ddd5ff]/75 blur-3xl" />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
          <div className="flex items-center gap-3 text-lg font-bold tracking-tight"><span className={`grid size-10 place-items-center rounded-xl bg-[#f5b8d2] ${border} shadow-[3px_3px_0_#2a2030]`}><CloudUpload className="size-5" /></span>Val0x2C</div>
          <Button onClick={startLogin} variant="outline" className={`${border} rounded-xl bg-white font-semibold shadow-[3px_3px_0_#2a2030] hover:bg-[#fff0f6]`}>Masuk</Button>
        </nav>
        <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-6 pb-20 pt-14 lg:grid-cols-[1fr_0.85fr] lg:px-10 lg:pb-32 lg:pt-24">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-[#2a2030] bg-[#f5b8d2] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] shadow-[3px_3px_0_#2a2030]"><span className="size-2 rounded-full bg-[#fff9fc]" /> File hosting yang simpel</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.06em] sm:text-7xl">Simpan sekali.<br /><span className="text-[#7565cb] [text-shadow:2px_2px_0_#f5b8d2]">Sebar sesuka hati.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#665d6b]">Upload file, dapatkan link publik, lalu kirim ke siapa pun. Rapi, ringan, dan tidak perlu folder yang ribet.</p>
            <div className="mt-10 flex flex-wrap items-center gap-4"><Button onClick={startLogin} size="lg" className={`h-13 rounded-xl bg-[#bdb2ff] px-6 text-base font-bold text-[#2a2030] ${border} ${softShadow} hover:-translate-y-0.5 hover:bg-[#c9c0ff]`}>Mulai upload <ArrowUpRight className="ml-2 size-4" /></Button><div className="flex items-center gap-2 text-sm font-medium text-[#665d6b]"><ShieldCheck className="size-4 text-[#7565cb]" /> Link publik aman & unik</div></div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-3 -top-3 size-14 rotate-6 rounded-lg border-2 border-[#2a2030] bg-[#f5b8d2]" />
            <div className={`relative rounded-[1.4rem] bg-white p-5 ${border} ${softShadow}`}>
              <div className="mb-5 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-[#756b7c]"><span>VAL0X2C / MY FILES</span><MoreHorizontal className="size-4" /></div>
              <div className="rounded-2xl border-2 border-dashed border-[#7565cb] bg-[#f4f1ff] p-8 text-center"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border-2 border-[#2a2030] bg-[#bdb2ff] text-[#2a2030] shadow-[3px_3px_0_#2a2030]"><UploadCloud className="size-6" /></span><p className="font-bold">Drop file di sini</p><p className="mt-1 text-xs text-[#756b7c]">Maksimal 25 MB per file</p></div>
              <div className="mt-4 space-y-3"><div className="flex items-center gap-3 rounded-xl border border-[#e7dce5] bg-[#fff7fb] p-3"><span className="grid size-9 place-items-center rounded-lg bg-[#eeeaff]"><FileText className="size-4 text-[#7565cb]" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">project-brief.pdf</p><p className="text-xs text-[#756b7c]">2.4 MB · Public link</p></div><Link2 className="size-4 text-[#7565cb]" /></div><div className="flex items-center gap-3 rounded-xl border border-[#e7dce5] bg-[#fff7fb] p-3"><span className="grid size-9 place-items-center rounded-lg bg-[#fff0f6]"><FileArchive className="size-4 text-[#c680a8]" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">assets-pack.zip</p><p className="text-xs text-[#756b7c]">18.7 MB · Public link</p></div><Link2 className="size-4 text-[#7565cb]" /></div></div>
            </div>
          </div>
        </section>
        <div className="relative z-10 mx-auto flex max-w-7xl flex-wrap gap-x-10 gap-y-3 border-t-2 border-[#2a2030] px-6 py-6 text-sm font-medium text-[#756b7c] lg:px-10"><span className="flex items-center gap-2"><LockKeyhole className="size-4 text-[#7565cb]" /> Storage terproteksi</span><span className="flex items-center gap-2"><Link2 className="size-4 text-[#7565cb]" /> Link siap dibagikan</span><span className="flex items-center gap-2"><HardDrive className="size-4 text-[#7565cb]" /> Dashboard ringan</span></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff9fc] text-[#2a2030]">
      <header className="border-b-2 border-[#2a2030] bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl bg-[#f5b8d2] ${border} shadow-[3px_3px_0_#2a2030]`}><CloudUpload className="size-5" /></span><span className="text-lg font-black tracking-tight">Val0x2C</span><span className="hidden rounded-full border border-[#2a2030] bg-[#eeeaff] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider sm:inline">Personal</span></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-bold">{user?.name || "Your workspace"}</p><p className="text-xs text-[#756b7c]">{user?.email || "Account aktif"}</p></div><Button onClick={() => logout()} variant="ghost" size="icon" className="rounded-xl border-2 border-transparent hover:border-[#2a2030] hover:bg-[#fff0f6]"><LogOut className="size-4" /></Button></div></div></header>
      <div className="mx-auto max-w-7xl px-6 py-9 lg:px-10 lg:py-12">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#7565cb]">MY FILES</p><h1 className="text-4xl font-black tracking-[-0.05em]">File kamu, satu tempat.</h1><p className="mt-2 text-[#756b7c]">Upload file dan bagikan link-nya dalam hitungan detik.</p></div><Button onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending} className={`h-11 rounded-xl bg-[#bdb2ff] px-5 font-bold text-[#2a2030] ${border} shadow-[4px_4px_0_#2a2030] hover:-translate-y-0.5 hover:bg-[#c9c0ff]`}><CloudUpload className="mr-2 size-4" />{uploadMutation.isPending ? "Uploading..." : "Upload file"}</Button></div>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} />
        <div className="mb-9 grid gap-4 sm:grid-cols-3"><div className={`rounded-2xl bg-white p-5 ${border} shadow-[4px_4px_0_#f5b8d2]`}><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl border border-[#2a2030] bg-[#eeeaff] text-[#7565cb]"><Files className="size-4" /></span><span className="text-xs font-bold text-[#756b7c]">TOTAL</span></div><p className="text-3xl font-black tracking-tight">{files.length}</p><p className="mt-1 text-sm text-[#756b7c]">file tersimpan</p></div><div className={`rounded-2xl bg-white p-5 ${border} shadow-[4px_4px_0_#bdb2ff]`}><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl border border-[#2a2030] bg-[#fff0f6] text-[#c680a8]"><HardDrive className="size-4" /></span><span className="text-xs font-bold text-[#756b7c]">STORAGE</span></div><p className="text-3xl font-black tracking-tight">{formatBytes(totalBytes)}</p><p className="mt-1 text-sm text-[#756b7c]">dipakai saat ini</p></div><div className={`rounded-2xl bg-white p-5 ${border} shadow-[4px_4px_0_#f5b8d2]`}><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl border border-[#2a2030] bg-[#eaf8f2] text-[#4d9c79]"><Link2 className="size-4" /></span><span className="text-xs font-bold text-[#756b7c]">LINKS</span></div><p className="text-3xl font-black tracking-tight">{files.length}</p><p className="mt-1 text-sm text-[#756b7c]">link publik aktif</p></div></div>
        <section className={`overflow-hidden rounded-2xl bg-white ${border} ${softShadow}`}><div className="flex items-center justify-between border-b-2 border-[#2a2030] px-5 py-4"><div><h2 className="font-black">Recent uploads</h2><p className="mt-0.5 text-sm text-[#756b7c]">Semua file yang pernah kamu upload</p></div><Button variant="ghost" size="sm" onClick={() => void filesQuery.refetch()} className="rounded-lg font-bold hover:bg-[#fff0f6]">Refresh</Button></div>{filesQuery.isLoading ? <div className="px-5 py-14 text-center text-sm text-[#756b7c]">Memuat file...</div> : files.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border-2 border-[#2a2030] bg-[#eeeaff] text-[#7565cb] shadow-[3px_3px_0_#2a2030]"><UploadCloud className="size-5" /></span><p className="font-bold">Belum ada file</p><p className="mt-1 text-sm text-[#756b7c]">Upload file pertamamu untuk mendapatkan link publik.</p><Button onClick={() => inputRef.current?.click()} variant="outline" className={`mt-5 rounded-xl font-bold ${border} hover:bg-[#fff0f6]`}>Pilih file</Button></div> : <div className="divide-y divide-[#eadfe7]">{files.map((file) => { const link = `${window.location.origin}/s/${file.shareToken}`; return <div key={file.id} className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[#fff7fb] sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#2a2030] bg-[#f4f1ff]">{fileIcon(file.mimeType)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{file.originalName}</p><p className="mt-1 text-xs text-[#756b7c]">{formatBytes(file.sizeBytes)} · {new Date(file.createdAt).toLocaleDateString()}</p></div></div><div className="flex items-center gap-2 sm:shrink-0"><a href={link} target="_blank" rel="noreferrer" className="flex min-w-0 max-w-[220px] items-center gap-2 rounded-lg border border-[#bdb2ff] bg-[#f4f1ff] px-3 py-2 text-xs font-bold text-[#5f50b7] hover:bg-[#eeeaff]"><Link2 className="size-3.5 shrink-0" /><span className="truncate">{link.replace(window.location.origin, "")}</span></a><Button onClick={() => void copyShareLink(file.shareToken)} variant="ghost" size="icon" className="size-9 rounded-lg border-2 border-transparent hover:border-[#2a2030] hover:bg-[#fff0f6]">{copiedToken === file.shareToken ? <Check className="size-4 text-[#4d9c79]" /> : <Copy className="size-4" />}</Button><Button onClick={() => deleteMutation.mutate({ id: file.id })} disabled={deleteMutation.isPending} variant="ghost" size="icon" className="size-9 rounded-lg border-2 border-transparent text-[#a66b83] hover:border-[#2a2030] hover:bg-[#fff0f6]"><Trash2 className="size-4" /></Button></div></div>; })}</div>}</section>
        <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#756b7c]"><LockKeyhole className="size-3.5 text-[#7565cb]" /> File disimpan di object storage terproteksi. Link publik hanya bisa diakses selama file masih ada.</div>
      </div>
    </main>
  );
}

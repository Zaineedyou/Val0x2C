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
    return <FileArchive className="size-5 text-[#e8a75d]" />;
  }
  return <FileText className="size-5 text-[#9c8aff]" />;
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
      await uploadMutation.mutateAsync({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        base64,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function copyShareLink(token: string) {
    const link = `${window.location.origin}/s/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Link publik disalin");
    window.setTimeout(() => setCopiedToken(null), 1800);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0d0d10]" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#0d0d10] text-[#f7f4ee]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(114,89,255,0.18),transparent_35%),radial-gradient(circle_at_10%_80%,rgba(222,148,70,0.10),transparent_30%)]" />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
          <div className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-[#a896ff] text-[#16131e]"><CloudUpload className="size-5" /></span>
            DropVault
          </div>
          <Button onClick={startLogin} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">Masuk</Button>
        </nav>
        <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-6 pb-20 pt-14 lg:grid-cols-[1fr_0.85fr] lg:px-10 lg:pb-32 lg:pt-24">
          <div>
            <p className="mb-6 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.22em] text-[#b5a9ff]"><span className="size-2 rounded-full bg-[#b5a9ff]" /> File hosting yang simpel</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-7xl">Simpan sekali.<br /><span className="text-[#a896ff]">Sebar sesuka hati.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#aaa6b2]">Upload file, dapatkan link publik, lalu kirim ke siapa pun. DropVault dibuat buat berbagi tanpa folder yang ribet.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button onClick={startLogin} size="lg" className="h-13 rounded-xl bg-[#a896ff] px-6 text-base font-semibold text-[#191523] hover:bg-[#b9adff]">Mulai upload <ArrowUpRight className="ml-2 size-4" /></Button>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-[#aaa6b2]"><ShieldCheck className="size-4 text-[#a896ff]" /> Link publik aman & unik</div>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-5 rounded-[2rem] border border-[#a896ff]/20 bg-[#a896ff]/5 blur-xl" />
            <div className="relative rounded-[1.65rem] border border-white/10 bg-[#16151b] p-5 shadow-2xl shadow-black/40">
              <div className="mb-5 flex items-center justify-between text-xs text-[#85818e]"><span>DROPVAULT / MY FILES</span><MoreHorizontal className="size-4" /></div>
              <div className="rounded-2xl border border-dashed border-[#a896ff]/45 bg-[#a896ff]/[0.07] p-8 text-center"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[#a896ff]/15 text-[#a896ff]"><UploadCloud className="size-6" /></span><p className="font-medium">Drop file di sini</p><p className="mt-1 text-xs text-[#85818e]">Maksimal 25 MB per file</p></div>
              <div className="mt-4 space-y-3"><div className="flex items-center gap-3 rounded-xl bg-white/[0.045] p-3"><span className="grid size-9 place-items-center rounded-lg bg-[#9c8aff]/10"><FileText className="size-4 text-[#9c8aff]" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm">project-brief.pdf</p><p className="text-xs text-[#85818e]">2.4 MB · Public link</p></div><Link2 className="size-4 text-[#a896ff]" /></div><div className="flex items-center gap-3 rounded-xl bg-white/[0.045] p-3"><span className="grid size-9 place-items-center rounded-lg bg-[#e8a75d]/10"><FileArchive className="size-4 text-[#e8a75d]" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm">assets-pack.zip</p><p className="text-xs text-[#85818e]">18.7 MB · Public link</p></div><Link2 className="size-4 text-[#a896ff]" /></div></div>
            </div>
          </div>
        </section>
        <div className="relative z-10 mx-auto flex max-w-7xl flex-wrap gap-x-10 gap-y-3 border-t border-white/10 px-6 py-6 text-sm text-[#85818e] lg:px-10"><span className="flex items-center gap-2"><LockKeyhole className="size-4" /> Storage terproteksi</span><span className="flex items-center gap-2"><Link2 className="size-4" /> Link siap dibagikan</span><span className="flex items-center gap-2"><HardDrive className="size-4" /> Dashboard ringan</span></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f3ef] text-[#19181d]">
      <header className="border-b border-[#e4e0d9] bg-[#fbfaf8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#7060db] text-white"><CloudUpload className="size-5" /></span><span className="text-lg font-semibold tracking-tight">DropVault</span><span className="hidden rounded-full bg-[#ece9ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6555c5] sm:inline">Personal</span></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium">{user?.name || "Your workspace"}</p><p className="text-xs text-[#8b8790]">{user?.email || "Account aktif"}</p></div><Button onClick={() => logout()} variant="ghost" size="icon" className="rounded-xl text-[#77727b] hover:bg-[#ece9e3] hover:text-[#19181d]"><LogOut className="size-4" /></Button></div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-9 lg:px-10 lg:py-12">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-[#776cc2]">MY FILES</p><h1 className="text-4xl font-semibold tracking-[-0.04em]">File kamu, satu tempat.</h1><p className="mt-2 text-[#78737b]">Upload file dan bagikan link-nya dalam hitungan detik.</p></div><Button onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending} className="h-11 rounded-xl bg-[#7060db] px-5 font-semibold text-white shadow-lg shadow-[#7060db]/15 hover:bg-[#5f50ca]"><CloudUpload className="mr-2 size-4" />{uploadMutation.isPending ? "Uploading..." : "Upload file"}</Button></div>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} />
        <div className="mb-9 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#e7e2da] bg-[#fbfaf8] p-5"><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#eeeaff] text-[#7060db]"><Files className="size-4" /></span><span className="text-xs text-[#9b9690]">TOTAL</span></div><p className="text-3xl font-semibold tracking-tight">{files.length}</p><p className="mt-1 text-sm text-[#88828a]">file tersimpan</p></div><div className="rounded-2xl border border-[#e7e2da] bg-[#fbfaf8] p-5"><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#fbefd9] text-[#c9852d]"><HardDrive className="size-4" /></span><span className="text-xs text-[#9b9690]">STORAGE</span></div><p className="text-3xl font-semibold tracking-tight">{formatBytes(totalBytes)}</p><p className="mt-1 text-sm text-[#88828a]">dipakai saat ini</p></div><div className="rounded-2xl border border-[#e7e2da] bg-[#fbfaf8] p-5"><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#e2f2eb] text-[#3b9467]"><Link2 className="size-4" /></span><span className="text-xs text-[#9b9690]">LINKS</span></div><p className="text-3xl font-semibold tracking-tight">{files.length}</p><p className="mt-1 text-sm text-[#88828a]">link publik aktif</p></div></div>
        <section className="overflow-hidden rounded-2xl border border-[#e7e2da] bg-[#fbfaf8]">
          <div className="flex items-center justify-between border-b border-[#eeeae4] px-5 py-4"><div><h2 className="font-semibold">Recent uploads</h2><p className="mt-0.5 text-sm text-[#88828a]">Semua file yang pernah kamu upload</p></div><Button variant="ghost" size="sm" onClick={() => void filesQuery.refetch()} className="text-[#77727b]">Refresh</Button></div>
          {filesQuery.isLoading ? <div className="px-5 py-14 text-center text-sm text-[#88828a]">Memuat file...</div> : files.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#7060db]"><UploadCloud className="size-5" /></span><p className="font-medium">Belum ada file</p><p className="mt-1 text-sm text-[#88828a]">Upload file pertamamu untuk mendapatkan link publik.</p><Button onClick={() => inputRef.current?.click()} variant="outline" className="mt-5 rounded-xl border-[#d9d3ff] text-[#6555c5] hover:bg-[#f4f1ff]">Pilih file</Button></div> : <div className="divide-y divide-[#eeeae4]">{files.map((file) => { const link = `${window.location.origin}/s/${file.shareToken}`; return <div key={file.id} className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[#f8f6f2] sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0edff]">{fileIcon(file.mimeType)}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{file.originalName}</p><p className="mt-1 text-xs text-[#99939a]">{formatBytes(file.sizeBytes)} · {new Date(file.createdAt).toLocaleDateString()}</p></div></div><div className="flex items-center gap-2 sm:shrink-0"><a href={link} target="_blank" rel="noreferrer" className="flex min-w-0 max-w-[220px] items-center gap-2 rounded-lg bg-[#f3f0ff] px-3 py-2 text-xs font-medium text-[#6555c5] hover:bg-[#eae5ff]"><Link2 className="size-3.5 shrink-0" /><span className="truncate">{link.replace(window.location.origin, "")}</span></a><Button onClick={() => void copyShareLink(file.shareToken)} variant="ghost" size="icon" className="size-9 rounded-lg text-[#77727b] hover:bg-[#ece9e3]">{copiedToken === file.shareToken ? <Check className="size-4 text-[#3b9467]" /> : <Copy className="size-4" />}</Button><Button onClick={() => deleteMutation.mutate({ id: file.id })} disabled={deleteMutation.isPending} variant="ghost" size="icon" className="size-9 rounded-lg text-[#a39da3] hover:bg-[#fff0ee] hover:text-[#ce655a]"><Trash2 className="size-4" /></Button></div></div>; })}</div>}
        </section>
        <div className="mt-6 flex items-center gap-2 text-xs text-[#9a9590]"><LockKeyhole className="size-3.5" /> File disimpan di object storage terproteksi. Link publik hanya bisa diakses selama file masih ada.</div>
      </div>
    </main>
  );
}

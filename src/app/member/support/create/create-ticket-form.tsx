'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createTicketAction } from '@/lib/actions/support';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export function CreateTicketForm() {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            // Validate size (e.g., 2MB)
            if (selectedFile.size > 2 * 1024 * 1024) {
                toast.error("Ukuran file maksimal 2MB");
                return;
            }
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const removeFile = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData(e.currentTarget);
            
            // Upload file if exists
            let screenshotUrl = '';
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `tickets/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('support-attachments')
                    .upload(filePath, file);

                if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

                const { data: { publicUrl } } = supabase.storage
                    .from('support-attachments')
                    .getPublicUrl(filePath);
                
                screenshotUrl = publicUrl;
            }

            // Add screenshot_url to formData
            if (screenshotUrl) {
                formData.append('screenshot_url', screenshotUrl);
            }

            // Call Server Action
            await createTicketAction(formData);
            
            toast.success("Laporan berhasil dikirim");
            // Redirect handled by server action
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Gagal mengirim laporan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
            <div className="space-y-2">
                <Label htmlFor="subject">Judul Masalah</Label>
                <Input id="subject" name="subject" placeholder="Contoh: Tidak bisa login, Error saat transaksi" required minLength={5} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select name="category" required defaultValue="bug">
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ui_ux">UI/UX (Tampilan)</SelectItem>
                            <SelectItem value="bug">Bug / Error</SelectItem>
                            <SelectItem value="feature_request">Permintaan Fitur</SelectItem>
                            <SelectItem value="question">Pertanyaan</SelectItem>
                            <SelectItem value="other">Lainnya</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="priority">Prioritas</Label>
                    <Select name="priority" required defaultValue="medium">
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Prioritas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Rendah</SelectItem>
                            <SelectItem value="medium">Sedang</SelectItem>
                            <SelectItem value="high">Tinggi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="message">Deskripsi Detail (Opsional)</Label>
                <Textarea 
                    id="message" 
                    name="message" 
                    placeholder="Jelaskan masalah anda secara detail..." 
                    className="min-h-[150px]"
                />
            </div>

            <div className="space-y-2">
                <Label>Screenshot (Opsional)</Label>
                {!file ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer relative">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <Upload className="h-8 w-8 text-slate-400" />
                        <span className="text-sm text-slate-500">Klik atau tarik gambar ke sini</span>
                        <span className="text-xs text-slate-400">Maksimal 2MB (JPG, PNG)</span>
                    </div>
                ) : (
                    <div className="relative border rounded-lg p-2 flex items-center gap-4">
                        {previewUrl && (
                            <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-md" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengirim Laporan...
                    </>
                ) : (
                    'Kirim Laporan'
                )}
            </Button>
        </form>
    );
}

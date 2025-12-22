'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Plus, ExternalLink, FileText, Download, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";

interface RatDocument {
  id: string;
  year: number;
  title: string;
  category: string;
  file_url: string;
  created_at: string;
}

interface RatViewProps {
  documents: RatDocument[];
}

export function RatView({ documents }: RatViewProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [isOpen, setIsOpen] = useState(false);

  // Mock Form State
  const [formData, setFormData] = useState({
      title: '',
      category: 'laporan_pertanggungjawaban',
      file_url: ''
  });

  const filteredDocs = documents.filter(d => d.year.toString() === selectedYear);

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const categories = {
      laporan_pertanggungjawaban: 'Laporan Pertanggungjawaban (LPJ)',
      rencana_kerja: 'Rencana Kerja & RAB',
      notulen_rat: 'Notulen / Berita Acara RAT',
      lainnya: 'Dokumen Pendukung Lainnya'
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Here you would call a Server Action
      alert("Simulasi: Dokumen berhasil disimpan (Memerlukan tabel database 'rat_documents').");
      setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="space-y-1">
            <label className="text-sm font-medium">Tahun Buku</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>

        <div className="ml-auto">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Dokumen
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah Dokumen RAT</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Judul Dokumen</Label>
                            <Input 
                                placeholder="Contoh: LPJ Pengurus Tahun 2024" 
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Kategori</Label>
                            <Select 
                                value={formData.category} 
                                onValueChange={v => setFormData({...formData, category: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(categories).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Link File (Google Drive / PDF URL)</Label>
                            <Input 
                                placeholder="https://..." 
                                value={formData.file_url}
                                onChange={e => setFormData({...formData, file_url: e.target.value})}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Masukkan link dokumen eksternal.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocs.length === 0 ? (
            <div className="col-span-full p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground">
                <Archive className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Belum ada dokumen yang diunggah untuk tahun {selectedYear}.</p>
            </div>
        ) : (
            filteredDocs.map(doc => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className="mb-2">
                                {(categories as any)[doc.category] || doc.category}
                            </Badge>
                            {/* Actions could go here */}
                        </div>
                        <CardTitle className="text-base line-clamp-2" title={doc.title}>
                            {doc.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                            <FileText className="h-4 w-4" />
                            <span>Diunggah {new Date(doc.created_at).toLocaleDateString('id-ID')}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="w-full" asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Buka
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>
    </div>
  );
}

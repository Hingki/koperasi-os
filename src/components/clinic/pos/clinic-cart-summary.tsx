'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, User, Stethoscope } from 'lucide-react';
import { CartItem } from '@/components/retail/pos/pos-layout';
import { searchPatientByPhone } from '@/lib/actions/clinic';
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Link from 'next/link';

export function ClinicCartSummary({
    cart,
    onUpdateQty,
    onRemove,
    onClear,
    onCheckout,
    selectedPatient,
    setSelectedPatient,
}: {
    cart: CartItem[],
    onUpdateQty: (id: string, qty: number) => void,
    onRemove: (id: string) => void,
    onClear: () => void,
    onCheckout: () => void,
    selectedPatient: any,
    setSelectedPatient: (c: any) => void,
}) {
    const total = cart.reduce((sum, item) => sum + (item.price_sell_public * item.qty), 0);
    const [openPatientSearch, setOpenPatientSearch] = useState(false);
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchPatient = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) return;
        
        try {
            const result = await searchPatientByPhone(query);
            if (result.success) {
                setPatientSearchResults(result.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b space-y-3 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Data Pasien</h3>
                </div>
                
                <Popover open={openPatientSearch} onOpenChange={setOpenPatientSearch}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openPatientSearch}
                            className="w-full justify-between bg-white"
                        >
                            {selectedPatient
                                ? selectedPatient.name
                                : "Cari Pasien (No. Telp)..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-2" align="start">
                        <Input 
                            placeholder="Ketik nomor telepon..." 
                            value={searchQuery}
                            onChange={(e) => handleSearchPatient(e.target.value)}
                            className="mb-2"
                        />
                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                            {patientSearchResults.length === 0 ? (
                                <div className="text-sm text-slate-500 text-center py-2">
                                    {searchQuery.length < 3 ? 'Ketik minimal 3 digit' : 'Tidak ditemukan'}
                                    <div className="mt-2">
                                        <Link href="/dashboard/clinic/patients/new" target="_blank">
                                            <Button variant="link" size="sm">
                                                + Daftar Pasien Baru
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                patientSearchResults.map((patient) => (
                                    <button
                                        key={patient.id}
                                        onClick={() => {
                                            setSelectedPatient(patient);
                                            setOpenPatientSearch(false);
                                            setSearchQuery('');
                                        }}
                                        className="w-full flex items-center justify-between p-2 text-sm rounded hover:bg-slate-100 text-left"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{patient.name}</span>
                                            <span className="text-xs text-slate-500">{patient.phone}</span>
                                        </div>
                                        {selectedPatient?.id === patient.id && (
                                            <Check className="h-4 w-4 text-slate-900" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                {selectedPatient && (
                     <div className="text-sm bg-blue-100 text-blue-800 p-3 rounded-md border border-blue-200">
                        <div className="font-bold">{selectedPatient.name}</div>
                        <div className="text-xs mt-1">
                            {selectedPatient.phone}
                            {selectedPatient.metadata?.nik && ` • NIK: ${selectedPatient.metadata.nik}`}
                        </div>
                        {selectedPatient.address && <div className="text-xs mt-1 opacity-80">{selectedPatient.address}</div>}
                     </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800">Resep & Layanan</h3>
                </div>
                {cart.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm border-2 border-dashed rounded-lg">
                        Belum ada item dipilih
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex gap-3 items-start group bg-slate-50 p-2 rounded-lg">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900">{item.name}</div>
                                <div className="text-xs text-slate-500">Rp {item.price_sell_public.toLocaleString('id-ID')} / {item.unit}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-6 w-6 bg-white"
                                    onClick={() => onUpdateQty(item.id, item.qty - 1)}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-6 w-6 bg-white"
                                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => onRemove(item.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t bg-slate-50 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Tagihan</span>
                    <span>Rp {total.toLocaleString('id-ID')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={onClear} disabled={cart.length === 0}>
                        Batal
                    </Button>
                    <Button onClick={onCheckout} disabled={cart.length === 0 || !selectedPatient} className="bg-blue-600 hover:bg-blue-700">
                        Proses Pembayaran
                    </Button>
                </div>
            </div>
        </div>
    );
}

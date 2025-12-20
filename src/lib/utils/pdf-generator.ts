import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateLoanContract = (
    application: any,
    member: any,
    product: any,
    schedule: any[]
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("KOPERASI OS", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("Jalan Teknologi No. 1, Jakarta Selatan", pageWidth / 2, 27, { align: "center" });
    doc.text("Telp: (021) 123-4567 | Email: admin@koperasi-os.com", pageWidth / 2, 33, { align: "center" });
    
    // Line Separator
    doc.setLineWidth(0.5);
    doc.line(15, 38, pageWidth - 15, 38);

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("SURAT PERJANJIAN PINJAMAN", pageWidth / 2, 50, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Nomor: PK-${application.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 56, { align: "center" });

    // Content - Pihak
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 70;
    
    doc.text("Yang bertanda tangan di bawah ini:", 15, y);
    y += 7;

    // Member Details
    doc.text("Nama", 25, y);
    doc.text(`: ${member.nama_lengkap}`, 60, y);
    y += 6;
    doc.text("NIK", 25, y);
    doc.text(`: ${member.nik}`, 60, y);
    y += 6;
    doc.text("Alamat", 25, y);
    doc.text(`: ${member.alamat_lengkap}`, 60, y);
    y += 6;
    doc.text("No. Telp", 25, y);
    doc.text(`: ${member.phone}`, 60, y);
    y += 10;
    
    doc.text("Selanjutnya disebut sebagai PIHAK PERTAMA (PEMINJAM).", 15, y);
    y += 10;

    doc.text("Dalam hal ini bertindak untuk dan atas nama KOPERASI OS, selanjutnya disebut sebagai", 15, y);
    y += 6;
    doc.text("PIHAK KEDUA (PEMBERI PINJAMAN).", 15, y);
    y += 10;

    doc.text("Kedua belah pihak sepakat untuk mengadakan perjanjian pinjaman dengan ketentuan sebagai berikut:", 15, y);
    y += 10;

    // Loan Details
    doc.setFont('helvetica', 'bold');
    doc.text("PASAL 1: RINCIAN PINJAMAN", 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');

    const amountFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(application.amount);
    
    doc.text("Jenis Pinjaman", 25, y);
    doc.text(`: ${product.name}`, 70, y);
    y += 6;
    doc.text("Jumlah Pinjaman", 25, y);
    doc.text(`: ${amountFmt}`, 70, y);
    y += 6;
    doc.text("Jangka Waktu", 25, y);
    doc.text(`: ${application.tenor_months} Bulan`, 70, y);
    y += 6;
    doc.text("Bunga", 25, y);
    doc.text(`: ${product.interest_rate}% per tahun (${product.interest_type})`, 70, y);
    y += 6;
    doc.text("Tujuan", 25, y);
    doc.text(`: ${application.purpose}`, 70, y);
    y += 15;

    // Installment Table (Schedule Preview)
    doc.setFont('helvetica', 'bold');
    doc.text("PASAL 2: JADWAL ANGSURAN (ESTIMASI)", 15, y);
    y += 5;
    
    // AutoTable
    const tableData = schedule.map((row, i) => [
        i + 1,
        new Date().toLocaleDateString(), // Placeholder date logic
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.principal),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.interest),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.total)
    ]);

    autoTable(doc, {
        startY: y,
        head: [['Bulan', 'Jatuh Tempo', 'Pokok', 'Bunga', 'Total Angsuran']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 15, right: 15 }
    });
    
    y = (doc as any).lastAutoTable.finalY + 15;

    // Signatures
    if (y > 250) {
        doc.addPage();
        y = 30;
    }

    doc.text("Jakarta, " + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }), 15, y);
    y += 10;

    doc.text("PIHAK PERTAMA", 15, y);
    doc.text("PIHAK KEDUA", 120, y);
    y += 25;

    doc.text(`( ${member.nama_lengkap} )`, 15, y);
    doc.text("( Pengurus Koperasi )", 120, y);

    // Save
    doc.save(`Perjanjian_Kredit_${application.id.slice(0,6)}.pdf`);
};

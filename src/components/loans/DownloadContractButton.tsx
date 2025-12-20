'use client';

import { FileText } from 'lucide-react';
import { generateLoanContract } from '@/lib/utils/pdf-generator';

interface DownloadContractButtonProps {
    application: any;
    member: any;
    product: any;
}

export function DownloadContractButton({ application, member, product }: DownloadContractButtonProps) {
    
    const handleDownload = () => {
        // Generate mock schedule for PDF (since we might not have it yet if not disbursed)
        // Or if disbursed, we could pass real schedule.
        // For now, calculate standard flat schedule on the fly for the preview
        const monthlyPrincipal = application.amount / application.tenor_months;
        const monthlyInterest = (application.amount * (product.interest_rate / 100)) / 12;
        
        const mockSchedule = Array.from({ length: application.tenor_months }).map((_, i) => ({
            principal: monthlyPrincipal,
            interest: monthlyInterest,
            total: monthlyPrincipal + monthlyInterest
        }));

        generateLoanContract(application, member, product, mockSchedule);
    };

    return (
        <button 
            onClick={handleDownload}
            className="w-full flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 text-sm font-medium border border-slate-300"
        >
            <FileText className="w-4 h-4 mr-2" /> Download Contract (PDF)
        </button>
    );
}

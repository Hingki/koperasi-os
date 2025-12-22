import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ReactNode } from "react";

interface RatioData {
    liquidity: { 
        currentRatio: number; 
        currentAssets: number; 
        currentLiabilities: number;
    };
    solvency: { 
        debtToEquityRatio: number; 
        debtToAssetRatio: number;
        totalLiabilities: number; 
        totalEquity: number;
    };
    profitability: { 
        netProfitMargin: number; 
        returnOnAssets: number; 
        returnOnEquity: number; 
        netProfit: number; 
        totalRevenue: number;
    };
}

const RatioCard = ({ 
    title, 
    value, 
    description, 
    benchmark, 
    details 
}: { 
    title: string, 
    value: string | number, 
    description: string, 
    benchmark?: string,
    details?: ReactNode 
}) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold mb-2">{value}</div>
            {benchmark && <p className="text-xs text-muted-foreground mb-4">Benchmark: {benchmark}</p>}
            {details && <div className="text-sm pt-2 border-t text-muted-foreground">{details}</div>}
        </CardContent>
    </Card>
);

export function RatiosView({ data }: { data: RatioData }) {
    return (
        <div className="space-y-8">
            {/* Liquidity */}
            <section>
                <h3 className="text-xl font-semibold mb-4">Likuiditas (Liquidity)</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <RatioCard 
                        title="Current Ratio" 
                        value={data.liquidity.currentRatio.toFixed(2)} 
                        description="Kemampuan membayar kewajiban jangka pendek dengan aset lancar."
                        benchmark="> 1.5 (Sehat)"
                        details={
                            <div className="flex justify-between">
                                <span>Aset Lancar: {formatCurrency(data.liquidity.currentAssets)}</span>
                                <span className="mx-2">/</span>
                                <span>Kewajiban Lancar: {formatCurrency(data.liquidity.currentLiabilities)}</span>
                            </div>
                        }
                    />
                </div>
            </section>

            {/* Solvency */}
            <section>
                <h3 className="text-xl font-semibold mb-4">Solvabilitas (Solvency)</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <RatioCard 
                        title="Debt to Equity Ratio (DER)" 
                        value={data.solvency.debtToEquityRatio.toFixed(2)} 
                        description="Proporsi utang terhadap modal sendiri."
                        benchmark="< 1.0 (Konservatif)"
                        details={
                            <div className="flex justify-between">
                                <span>Total Liabilitas: {formatCurrency(data.solvency.totalLiabilities)}</span>
                                <span className="mx-2">/</span>
                                <span>Total Ekuitas: {formatCurrency(data.solvency.totalEquity)}</span>
                            </div>
                        }
                    />
                    <RatioCard 
                        title="Debt to Asset Ratio (DAR)" 
                        value={data.solvency.debtToAssetRatio.toFixed(2)} 
                        description="Seberapa besar aset dibiayai oleh utang."
                        benchmark="< 0.5 (Aman)"
                    />
                </div>
            </section>

            {/* Profitability */}
            <section>
                <h3 className="text-xl font-semibold mb-4">Profitabilitas (Profitability)</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <RatioCard 
                        title="Net Profit Margin (NPM)" 
                        value={`${data.profitability.netProfitMargin.toFixed(2)}%`} 
                        description="Persentase laba bersih dari total pendapatan."
                        benchmark="> 10% (Baik)"
                        details={
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span>Laba Bersih:</span>
                                    <span>{formatCurrency(data.profitability.netProfit)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Pendapatan:</span>
                                    <span>{formatCurrency(data.profitability.totalRevenue)}</span>
                                </div>
                            </div>
                        }
                    />
                    <RatioCard 
                        title="Return on Assets (ROA)" 
                        value={`${data.profitability.returnOnAssets.toFixed(2)}%`} 
                        description="Efisiensi penggunaan aset untuk menghasilkan laba."
                        benchmark="> 5% (Cukup)"
                    />
                    <RatioCard 
                        title="Return on Equity (ROE)" 
                        value={`${data.profitability.returnOnEquity.toFixed(2)}%`} 
                        description="Pengembalian atas modal anggota."
                        benchmark="> 15% (Sangat Baik)"
                    />
                </div>
            </section>
        </div>
    );
}

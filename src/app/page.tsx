import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShieldCheck, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Koperasi OS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              prefetch={false}
              className="text-sm font-medium text-slate-700 hover:text-red-600"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              prefetch={false}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
              Koperasi Kelurahan <br className="hidden sm:inline" />
              <span className="text-red-600">Merah Putih Duri Kosambi</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 md:text-xl">
              Digitalisasi Koperasi untuk Kesejahteraan Anggota. Kelola simpanan, pinjaman, dan akuntansi dalam satu platform terintegrasi.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-red-700 transition-all hover:scale-105"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/register"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition-all"
              >
                Become a Member
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                Punya usaha? <Link href="/register/mitra" className="font-medium text-red-600 hover:underline">Daftar sebagai Mitra UMKM</Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                  <LayoutDashboard className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Comprehensive Dashboard</h3>
                <p className="text-slate-600">
                  Real-time insights into your cooperative's financial health, member activities, and loan performance.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Savings & Loans</h3>
                <p className="text-slate-600">
                  Streamlined workflows for member deposits, withdrawals, loan applications, and automated interest calculations.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-teal-100 rounded-xl flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Secure & Compliant</h3>
                <p className="text-slate-600">
                  Built with double-entry accounting standards and robust role-based security to protect member data.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-12">
        <div className="container mx-auto px-4 text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} Koperasi OS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

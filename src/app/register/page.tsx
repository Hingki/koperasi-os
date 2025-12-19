// src/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  memberRegistrationSchema,
  safeValidateMemberRegistration,
} from '@/lib/validations/member';
import type { MemberRegistrationInput } from '@/lib/validations/member';

interface FormErrors {
  [key: string]: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrors({});
    setMessageType('error');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Prepare member registration data
    const memberData: MemberRegistrationInput = {
      nama_lengkap: formData.get('nama_lengkap') as string,
      nik: formData.get('nik') as string,
      phone: formData.get('phone') as string,
      email: email || undefined,
      alamat_lengkap: formData.get('alamat_lengkap') as string,
    };

    // Client-side validation with Zod
    const validation = safeValidateMemberRegistration(memberData);
    if (!validation.success) {
      const formErrors: FormErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        formErrors[field] = err.message;
      });
      setErrors(formErrors);
      setMessage('Mohon perbaiki kesalahan pada form di bawah.');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      // Step 1: Register user to Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama_lengkap: memberData.nama_lengkap,
          },
        },
      });

      if (authError) {
        setMessage(`Error: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setMessage('Registrasi gagal. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      // Step 2: Register member profile via API endpoint
      // This ensures RLS compliance and proper validation
      const response = await fetch('/api/members/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation.data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle API validation errors
        if (result.details && Array.isArray(result.details)) {
          const formErrors: FormErrors = {};
          result.details.forEach((detail: { field: string; message: string }) => {
            formErrors[detail.field] = detail.message;
          });
          setErrors(formErrors);
        }
        setMessage(result.error || 'Gagal membuat profil anggota.');
        setLoading(false);
        return;
      }

      // Success!
      setMessageType('success');
      setMessage(
        result.message ||
          'Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.'
      );

      // Redirect to login or dashboard after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Registrasi Anggota Koperasi
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Lengkapi data diri Anda untuk menjadi anggota koperasi
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label
                htmlFor="nama_lengkap"
                className="block text-sm font-medium text-gray-700"
              >
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="nama_lengkap"
                name="nama_lengkap"
                type="text"
                required
                disabled={loading}
                className={`mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.nama_lengkap ? 'border-red-500' : ''
                }`}
              />
              {errors.nama_lengkap && (
                <p className="mt-1 text-sm text-red-500">{errors.nama_lengkap}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="nik"
                className="block text-sm font-medium text-gray-700"
              >
                NIK <span className="text-red-500">*</span>
              </label>
              <input
                id="nik"
                name="nik"
                type="text"
                required
                maxLength={16}
                disabled={loading}
                placeholder="16 digit angka"
                className={`mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.nik ? 'border-red-500' : ''
                }`}
              />
              {errors.nik && (
                <p className="mt-1 text-sm text-red-500">{errors.nik}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                No. HP <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                disabled={loading}
                placeholder="08xx-xxxx-xxxx"
                className={`mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.phone ? 'border-red-500' : ''
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="alamat_lengkap"
                className="block text-sm font-medium text-gray-700"
              >
                Alamat Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                id="alamat_lengkap"
                name="alamat_lengkap"
                rows={3}
                required
                disabled={loading}
                className={`mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.alamat_lengkap ? 'border-red-500' : ''
                }`}
              />
              {errors.alamat_lengkap && (
                <p className="mt-1 text-sm text-red-500">{errors.alamat_lengkap}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                className={`mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={loading}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimal 8 karakter
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </div>
        </form>
        {message && (
          <div
            className={`mt-4 rounded-md p-3 text-center text-sm ${
              messageType === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

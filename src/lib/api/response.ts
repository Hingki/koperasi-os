import { NextResponse } from 'next/server';
import { z } from 'zod';

type ErrorDetail = {
  field?: string;
  message: string;
  code?: string;
};

type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
};

type ApiSuccessBody<T = unknown> = {
  success: true;
  message?: string;
  data?: T;
};

export function respondSuccess<T = unknown>(data?: T, message?: string, status = 200) {
  const body: ApiSuccessBody<T> = { success: true, message, data };
  return NextResponse.json(body, { status });
}

export function respondError(code: string, message: string, status = 400, details?: ErrorDetail[]) {
  const body: ApiErrorBody = { success: false, error: { code, message, details } };
  return NextResponse.json(body, { status });
}

export function respondZodError(err: z.ZodError, status = 400) {
  const details: ErrorDetail[] = err.errors.map((e) => ({
    field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
    message: e.message,
    code: e.code,
  }));
  return respondError('VALIDATION_ERROR', 'Payload validation failed', status, details);
}

export function respondServiceError(e: unknown) {
  const msg: string = e instanceof Error ? e.message : 'Transaction failed';
  let code = 'INTERNAL_SERVER_ERROR';
  let status = 500;
  let details: ErrorDetail[] | undefined;

  if (msg.includes('Melebihi batas maksimum setoran')) {
    code = 'MAX_DEPOSIT_EXCEEDED';
    status = 400;
    details = [{ field: 'amount', message: msg }];
  } else if (msg.includes('Kurang dari minimum setoran')) {
    code = 'MIN_DEPOSIT_NOT_MET';
    status = 400;
    details = [{ field: 'amount', message: msg }];
  } else if (msg.includes('Withdrawals are not allowed')) {
    code = 'WITHDRAWAL_NOT_ALLOWED';
    status = 400;
    details = [{ field: 'accountId', message: msg }];
  } else if (msg.includes('Insufficient balance')) {
    code = 'INSUFFICIENT_BALANCE';
    status = 400;
    details = [{ field: 'amount', message: msg }];
  } else if (msg.includes('Account is not active')) {
    code = 'ACCOUNT_INACTIVE';
    status = 400;
    details = [{ field: 'accountId', message: msg }];
  } else if (msg.includes('Amount must be positive')) {
    code = 'AMOUNT_NOT_POSITIVE';
    status = 400;
    details = [{ field: 'amount', message: msg }];
  } else if (msg.includes('Savings account not found')) {
    code = 'NOT_FOUND';
    status = 404;
    details = [{ field: 'accountId', message: msg }];
  }

  return respondError(code, msg, status, details);
}


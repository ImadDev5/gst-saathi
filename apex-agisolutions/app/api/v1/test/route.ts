import { NextResponse } from 'next/server';
import { parseCSV } from '@/inngest/functions';
import * as fs from 'fs';

export async function GET() {
  const buf = fs.readFileSync('../business_bank_statement_sample.csv');
  const res = parseCSV(buf, '1', '2');
  return NextResponse.json(res);
}

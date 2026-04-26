import React from "react";
import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck, Zap } from "lucide-react";

export default function TrialPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Experience <span className="text-blue-500">GSTSaathi</span>
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto backdrop-blur-sm">
            Start your free 14-day trial today. Process unformatted GST invoices
            and PDFs in seconds. No credit card required.
          </p>
        </div>

        {/* Features / Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-12 bg-neutral-900/50 p-8 rounded-2xl border border-neutral-800">
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
              <FileSearch className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg">AI-Powered Parsing</h3>
            <p className="text-neutral-400 text-sm">
              Upload messy PDFs. Get clean, compliant Line-Item ITC matching.
            </p>
          </div>

          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">Instant GSTR-2B Recon</h3>
            <p className="text-neutral-400 text-sm">
              Real-time matching against supplier filings. Catch discrepancies
              early.
            </p>
          </div>

          <div className="space-y-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-lg">
              Chartered Accountant Ready
            </h3>
            <p className="text-neutral-400 text-sm">
              Export read-only portals and standardized Excel sheets instantly.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="pt-12">
          <p className="text-neutral-300 mb-6">
            We are currently rolling out access to select organizations.
          </p>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] cursor-pointer"
          >
            Request Access <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="pt-8 text-neutral-500 text-sm">
          Strictly compliant with ISO 27001, HIPAA, GDPR, & SOC 2 standards.
        </div>
      </div>
    </div>
  );
}

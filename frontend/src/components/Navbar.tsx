'use client';

import { Database } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="glass" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Database size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white font-['Space_Grotesk']">AskMyDB</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/app"
              className="btn-primary text-sm px-5 py-2.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

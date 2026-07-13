'use client';

import { Database, GitBranch, Mail, FileText } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Database size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold font-['Space_Grotesk']">AskMyDB</span>
            </div>
            <p className="text-sm text-gray-400">
              Chat with your data. No SQL required.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                  <GitBranch size={14} /> GitHub
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                  <FileText size={14} /> Docs
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                  <Mail size={14} /> Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Powered By</h3>
            <p className="text-sm text-gray-400">
              OpenRouter AI · Next.js · FastAPI · Three.js
            </p>
          </div>
        </div>
        <div className="border-t border-white/5 mt-8 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} AskMyDB. Built by M Harish Gautham.
        </div>
      </div>
    </footer>
  );
}

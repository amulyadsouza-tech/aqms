import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface DocumentationPageProps {
  isStandalone?: boolean;
  onNavigateHome?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({
  onNavigateHome,
  onNavigateAdmin,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md p-8 rounded-3xl border border-slate-200 dark:border-[#303030] shadow-xl">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-institute-blue dark:text-sky-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          SJEC AQMS Administration
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          Please access the administrative configuration consoles for hardware, telemetry, and access management.
        </p>
        <div className="flex flex-col gap-3">
          {onNavigateAdmin && (
            <button
              onClick={onNavigateAdmin}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors shadow-sm"
            >
              Go to Admin Console
            </button>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              Return to Public Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;

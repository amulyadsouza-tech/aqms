import React, { useState } from 'react';
import { BrandingConfig } from '../../types';
import { saveBranding, storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Image as ImageIcon, 
  Upload, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  School,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { DEFAULT_BRANDING } from '../../services/firebase';

interface BrandingTabProps {
  branding: BrandingConfig;
  onBrandingUpdated: (updated: BrandingConfig) => void;
  isFirebaseReady: boolean;
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export const BrandingTab: React.FC<BrandingTabProps> = ({
  branding,
  onBrandingUpdated,
  isFirebaseReady,
}) => {
  const [formData, setFormData] = useState<BrandingConfig>(branding);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(branding.logoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatusMessage({
        type: 'error',
        text: `File exceeds maximum allowed size of 2 MB. Selected: ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
      });
      return;
    }

    // 2. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setStatusMessage({
        type: 'error',
        text: `Unsupported image format (${file.type}). Allowed formats: PNG, JPG, WebP, SVG.`,
      });
      return;
    }

    // 3. Create Safe Object URL for Preview (avoid injecting raw SVG HTML)
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setStatusMessage(null);

    try {
      let finalUrl = previewUrl;

      if (isFirebaseReady && storage) {
        // Upload to Firebase Storage bucket under branding/
        const storageRef = ref(storage, `branding/sjec-logo-${Date.now()}.${selectedFile.name.split('.').pop()}`);
        const snapshot = await uploadBytes(storageRef, selectedFile, {
          contentType: selectedFile.type,
        });
        finalUrl = await getDownloadURL(snapshot.ref);
      } else {
        // Standalone/Local preview data URL
        const reader = new FileReader();
        finalUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      const updated = {
        ...formData,
        logoUrl: finalUrl,
        isCustomLogo: true,
        lastUpdated: Date.now(),
      };

      if (isFirebaseReady) {
        await saveBranding(updated);
      }
      setFormData(updated);
      onBrandingUpdated(updated);
      setSelectedFile(null);
      setStatusMessage({
        type: 'success',
        text: 'Logo updated successfully! Changes are immediately live on the public dashboard.',
      });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to upload logo to Firebase Storage.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetToDefaultLogo = async () => {
    const updated = {
      ...formData,
      logoUrl: null,
      isCustomLogo: false,
      lastUpdated: Date.now(),
    };
    try {
      if (isFirebaseReady) {
        await saveBranding(updated);
      }
      setFormData(updated);
      setPreviewUrl(null);
      setSelectedFile(null);
      onBrandingUpdated(updated);
      setStatusMessage({
        type: 'success',
        text: 'Reset to default institutional placeholder logo.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleSaveTextMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = {
        ...formData,
        lastUpdated: Date.now(),
      };
      if (isFirebaseReady) {
        await saveBranding(updated);
      }
      onBrandingUpdated(updated);
      setStatusMessage({
        type: 'success',
        text: 'Site titles and institutional details saved successfully.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Status Alert */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2 text-xs ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Logo Management Card */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex items-center space-x-2 pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <ImageIcon className="w-5 h-5 text-institute-blue dark:text-sky-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Institution Logo Management
          </h3>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Logo Preview Box */}
          <div className="md:col-span-4 flex flex-col items-center p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Current Header Logo
            </span>
            <div className="w-28 h-28 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-sm overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="SJEC Logo Preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-institute-blue dark:text-sky-400">
                  <School className="w-10 h-10" />
                  <span className="text-xs font-bold mt-1">SJEC</span>
                </div>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 font-mono">
              {formData.isCustomLogo ? 'Custom Official Logo' : 'Default College Emblem'}
            </span>
          </div>

          {/* Upload Controls */}
          <div className="md:col-span-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Upload New Logo (SVG, PNG, JPG, or WebP)
              </label>
              <input
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp"
                onChange={handleFileSelect}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-institute-blue/10 file:text-institute-blue dark:file:bg-sky-950 dark:file:text-sky-300 hover:file:bg-institute-blue/20 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Max file size: 2 MB. SVG files are safely rendered via image elements without inline markup injection.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleUploadLogo}
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading to Storage...' : 'Save & Deploy Logo'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefaultLogo}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5 border border-slate-300 dark:border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Placeholder</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Titles and Institution Details */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex items-center space-x-2 pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <FileCheck className="w-5 h-5 text-institute-blue dark:text-sky-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Portal Title & Location Configuration
          </h3>
        </div>

        <form onSubmit={handleSaveTextMetadata} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Institution Name
              </label>
              <input
                type="text"
                required
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Website Primary Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Subtitle
              </label>
              <input
                type="text"
                required
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Geographic Campus Location
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Title Settings'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

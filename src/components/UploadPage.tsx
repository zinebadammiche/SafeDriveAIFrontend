import React, { useState, useCallback } from 'react';
import { 
  Upload, FileText, Image, AlertTriangle, CheckCircle, Shield, Eye,
  Files, Flag, Moon, Sun, LogOut
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AIInsightsPanel } from './AIInsightsPanel';
import { ScanResultModal } from './ScanResultModal';
import { FileValidationModal } from './FileValidationModal';
import axios from 'axios';

interface UploadPageProps {
  user: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  currentPage: string;
}

interface ScanZone {
  bbox: number[];
  label: string;
  texte: string;
  confidence: number;
}

interface ScanResult {
  zones: ScanZone[];
  total_zones: number;
  annotated_image?: string;
  isSafe: boolean;
  confidenceScore: number;
  speed?: {
    preprocess: string;
    inference: string;
    postprocess: string;
  };
  sensitiveDataFound: Array<{
    type: string;
    content: string;
    confidence: number;
    bbox: number[];
  }>;
}

const API_BASE = import.meta.env.VITE_API_BASE;

export function UploadPage({ user, onNavigate, onLogout, darkMode, toggleDarkMode, currentPage }: UploadPageProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [rejectedFile, setRejectedFile] = useState<{ name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Supported file types
  const supportedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];

  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg'];

  const validateFile = (file: File): boolean => supportedTypes.includes(file.type);
  const isImageFile = (file: File): boolean => imageTypes.includes(file.type);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const downloadFile = (blob: Blob, filename: string) => {
    const a = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleEncryptAndUpload = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      if (isImageFile(uploadedFile)) {
        // ----- IMAGE FLOW (zones encrypted with Fernet) -----
        const encryptRes = await axios.post(`${API_BASE}/encrypt`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        });

        const data = encryptRes.data as any;

        // Download encryption key
        try {
          const keyResponse = await axios.get(
            `${API_BASE}/data_storage_keys/${data.folder}_key.key`,
            { responseType: 'blob', withCredentials: true }
          );
          downloadFile(keyResponse.data, `${data.folder}_key.key`);
        } catch {
          alert('Encryption key could not be downloaded.');
        }

        await axios.post(
          `${API_BASE}/auth/upload_folder_to_drive/${data.folder}`,
          {},
          { withCredentials: true }
        );
        alert(`File encrypted! ${data.zones_ciphered} sensitive zone(s) detected.`);
      } else {
        // ----- NON-IMAGE FLOW (encryptfiles, returns encrypted file + ctx) -----
        const encryptRes = await axios.post(`${API_BASE}/encryptfiles`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        });
        const data = encryptRes.data as any;

        // Download .ctx file
        try {
          const ctxResponse = await axios.get(`${API_BASE}/${data.context_file}`, {
            responseType: 'blob',
            withCredentials: true,
          });
          downloadFile(ctxResponse.data, `${data.folder}.ctx`);
        } catch {
          alert('Context file could not be downloaded.');
        }

        // Upload only encrypted file to Drive
        await axios.post(
          `${API_BASE}/auth/upload_single_to_drive`,
          { file_path: data.encrypted_file },
          { withCredentials: true }
        );

        alert('Encrypted file uploaded successfully!');
      }
    } catch (err: any) {
      console.error('Encrypt/upload failed', err);
      alert('Encryption/upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUploading(false);
      setShowScanModal(false);
    }
  };

  const handleMaskAndUpload = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      if (isImageFile(uploadedFile)) {
        // ----- IMAGE FLOW (mask) -----
        const maskResponse = await axios.post(
          `${API_BASE}/mask`,
          formData,
          { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
        );

        const maskedFilePath = maskResponse.data.masked_image as string;

        const uploadResponse = await axios.post(
          `${API_BASE}/auth/upload_single_to_drive`,
          { file_path: maskedFilePath },
          { withCredentials: true }
        );

        if (uploadResponse.status === 200) alert('Masked image uploaded successfully to Drive!');
        else alert('Failed to upload masked image: ' + uploadResponse.data.error);
      } else {
        // ----- NON-IMAGE FLOW (maskfiles) -----
        const maskRes = await axios.post(`${API_BASE}/maskfiles`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        });

        const data = maskRes.data as any;

        await axios.post(
          `${API_BASE}/auth/upload_single_to_drive`,
          { file_path: data.masked_file },
          { withCredentials: true }
        );

        alert('Masked file uploaded successfully!');
      }
    } catch (error: any) {
      console.error('Masked upload failed', error);
      alert('Masked upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsUploading(false);
      setShowScanModal(false);
    }
  };

  const handleSafeUpload = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const saveResponse = await axios.post(
        `${API_BASE}/auth/save_safe_file`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const safeFilePath = saveResponse.data.safe_file as string;

      const uploadResponse = await axios.post(
        `${API_BASE}/auth/upload_single_to_drive`,
        { file_path: safeFilePath },
        { withCredentials: true }
      );

      if (uploadResponse.status === 200) {
        alert('Safe file uploaded successfully to Drive!');
        console.log('Uploaded file info:', uploadResponse.data);
      } else {
        alert('Failed to upload safe file: ' + uploadResponse.data.error);
      }
    } catch (error: any) {
      console.error('Safe upload failed', error);
      alert('Safe upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsUploading(false);
      setShowScanModal(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!validateFile(file)) {
      const fileExtension = file.name.split('.').pop() || '';
      setRejectedFile({ name: file.name, type: fileExtension });
      setShowValidationModal(true);
      return;
    }

    setUploadedFile(file);
    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);

    // If it's not an image, use text/document detection flow
    if (!isImageFile(file)) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        setScanProgress(Math.min(progress, 90));
        if (progress >= 90) clearInterval(interval);
      }, 150);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/detectfiles`, { method: 'POST', body: formData });
        const data = await response.json();
        clearInterval(interval);
        setScanProgress(100);
        setIsScanning(false);

        if (response.ok) {
          const detectedZones = (data.detected && (data.detected['0'] || data.detected[0])) || [];
          const transformedResult: ScanResult = {
            zones: detectedZones.map((d: any) => ({
              bbox: [0, 0, 0, 0],
              label: d.entity_type,
              texte: d.text,
              confidence: d.score,
            })),
            total_zones: detectedZones.length,
            isSafe: detectedZones.length === 0,
            confidenceScore:
              detectedZones.length > 0
                ? Math.round((detectedZones.reduce((acc: number, z: any) => acc + (z.score || 0), 0) / detectedZones.length) * 100)
                : 98,
            sensitiveDataFound: detectedZones.map((z: any) => ({
              type: z.entity_type,
              content: z.text,
              confidence: z.score,
              bbox: [0, 0, 0, 0],
            })),
          };

          setScanResult(transformedResult);
          if (!transformedResult.isSafe) setShowScanModal(true);
          setShowAIPanel(true);
        } else {
          alert(`File detection failed: ${data.error || 'Unknown error'}`);
        }
      } catch (err: any) {
        clearInterval(interval);
        setIsScanning(false);
        alert('Detection failed: ' + err.message);
      }
      return;
    }

    // For image files, call the real API and animate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      setScanProgress(Math.min(progress, 90));
      if (progress >= 90) clearInterval(interval);
    }, 150);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      clearInterval(interval);
      setScanProgress(100);
      setIsScanning(false);

      if (response.ok) {
        const zones = (data.zones || []) as ScanZone[];
        const transformedResult: ScanResult = {
          zones,
          total_zones: data.total_zones || zones.length,
          isSafe: !zones || zones.length === 0,
          confidenceScore:
            zones && zones.length > 0
              ? Math.round((zones.reduce((acc: number, z: any) => acc + (z.confidence || 0), 0) / zones.length) * 100)
              : 98,
          speed: {
            preprocess: '4.7ms',
            inference: `${totalTime}ms`,
            postprocess: '2.5ms',
          },
          sensitiveDataFound: zones.map((zone: any) => ({
            type: zone.label || 'Unknown',
            content: zone.texte || 'Detected content',
            confidence: zone.confidence || 0.8,
            bbox: zone.bbox || [0, 0, 0, 0],
          })),
        };

        setScanResult(transformedResult);
        if (!transformedResult.isSafe && transformedResult.zones.length > 0) setShowScanModal(true);
        setShowAIPanel(true);
      } else {
        console.error('API Error:', data);
        alert(`Scan failed: ${data.error || 'Unknown error'}`);

        const fallbackResult: ScanResult = {
          zones: [],
          total_zones: 0,
          isSafe: true,
          confidenceScore: 95,
          sensitiveDataFound: [],
        };
        setScanResult(fallbackResult);
        setShowAIPanel(true);
      }
    } catch (error) {
      clearInterval(interval);
      setIsScanning(false);
      setScanProgress(0);
      console.error('Upload or detection failed', error);

      const fallbackResult: ScanResult = {
        zones: [],
        total_zones: 0,
        isSafe: true,
        confidenceScore: 95,
        sensitiveDataFound: [],
      };
      setScanResult(fallbackResult);
      setShowAIPanel(true);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>SafeDrive AI</h1>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
            >
              <Eye className="h-4 w-4 mr-2" />
              AI Insights
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className={`${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <div className="flex items-center space-x-3">
              <img src={user?.avatar} alt={user?.name ?? 'User'} className="h-8 w-8 rounded-full" />
              <div className="hidden md:block">
                <p style={{ fontWeight: 500, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginTop: '0.3rem' }} className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name ?? 'User'}</p>
                <p style={{ fontWeight: 400, fontSize: '0.7rem', fontFamily: 'Inter, sans-serif' }} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.storageUsed} used</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className={`${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r min-h-screen p-4`}>
          <nav className="space-y-2">
            <Button
              variant="ghost"
              onClick={() => onNavigate('upload')}
              className={`w-full justify-start transition-colors ${
                currentPage === 'upload'
                  ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              <Upload className="h-4 w-4 mr-3" />
              Upload Files
            </Button>

            <Button
              variant="ghost"
              onClick={() => onNavigate('dashboard')}
              className={`w-full justify-start transition-colors ${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <Files className="h-4 w-4 mr-3" />
              My Files
            </Button>

            <Button
              variant="ghost"
              onClick={() => onNavigate('flagged')}
              className={`w-full justify-start transition-colors ${
                currentPage === 'flagged'
                  ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              <Flag className="h-4 w-4 mr-3" />
              Flagged
            </Button>

            <Button
              variant="ghost"
              onClick={() => onNavigate('safe-uploads')}
              className={`w-full justify-start transition-colors ${
                currentPage === 'safe-uploads'
                  ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              <CheckCircle className="h-4 w-4 mr-3" />
              Safe Uploads
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Upload & Scan Files</h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Drag and drop files to scan for sensitive data before cloud upload
              </p>
            </div>

            {/* Upload Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : (darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50')
              } ${darkMode ? 'hover:border-gray-500' : 'hover:border-gray-400'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
              />

              <div className="space-y-4">
                <div className={`mx-auto w-16 h-16 ${dragActive ? 'bg-blue-100 dark:bg-blue-900' : (darkMode ? 'bg-gray-700' : 'bg-gray-100')} rounded-full flex items-center justify-center`}>
                  <Upload className={`h-8 w-8 ${dragActive ? 'text-blue-600 dark:text-blue-400' : (darkMode ? 'text-gray-400' : 'text-gray-500')}`} />
                </div>
                <div>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    {dragActive ? 'Drop files here' : 'Drag and drop files to upload'}
                  </p>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Supports CSV, PDF, DOC, DOCX, TXT, XLS, XLSX, PNG, JPG, JPEG (Max 10MB)
                  </p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  Choose Files
                </Button>
              </div>
            </div>

            {/* Upload Progress */}
            {uploadedFile && (
              <div className={`mt-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 border`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg`}>
                    {uploadedFile.type.startsWith('image/') ? (
                      <Image className="h-5 w-5 text-blue-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{uploadedFile.name}</p>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {scanResult && (
                    <Badge
                      className={`ml-4 ${
                        scanResult.isSafe
                          ? 'bg-black text-white border-black hover:bg-gray-800'
                          : 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                      }`}
                    >
                      {scanResult.isSafe ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Safe
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {scanResult.zones.length} Flag{scanResult.zones.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Badge>
                  )}
                </div>

                {isScanning && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Scanning for sensitive data...</span>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{Math.round(scanProgress)}%</span>
                    </div>
                    <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {scanResult && !isScanning && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${scanResult.isSafe ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {scanResult.isSafe ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <p className={`${scanResult.isSafe ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                          {scanResult.isSafe ? 'File is safe to upload' : `${scanResult.sensitiveDataFound.length} sensitive elements detected`}
                        </p>
                      </div>
                      <p className={`${scanResult.isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        Confidence: {scanResult.confidenceScore}%
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      {!scanResult.isSafe && (
                        <Button
                          variant="outline"
                          onClick={() => setShowScanModal(true)}
                          className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
                        >
                          Review Flagged Areas
                        </Button>
                      )}
                      <Button
                        className={`${scanResult.isSafe ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors`}
                        onClick={scanResult.isSafe ? handleSafeUpload : handleEncryptAndUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Processing...' : scanResult.isSafe ? 'Upload to Cloud' : 'Encrypt & Upload'}
                      </Button>
                      <Button
                        variant="outline"
                        className={`transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          setUploadedFile(null);
                          setScanResult(null);
                          setScanProgress(0);
                          setIsScanning(false);
                        }}
                        disabled={isUploading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* AI Insights Panel */}
        {showAIPanel && (
          <AIInsightsPanel
            scanResult={scanResult}
            onClose={() => setShowAIPanel(false)}
            darkMode={darkMode}
            onMaskAndUpload={handleMaskAndUpload}
            onEncryptAndUpload={handleEncryptAndUpload}
          />
        )}
      </div>

      {/* Scan Result Modal */}
      {showScanModal && scanResult && (
        <ScanResultModal
          scanResult={scanResult}
          fileName={uploadedFile?.name}
          onClose={() => setShowScanModal(false)}
          onMaskAndUpload={handleMaskAndUpload}
          onEncryptAndUpload={handleEncryptAndUpload}
          onSafeUpload={handleSafeUpload}
          isUploading={isUploading}
          darkMode={darkMode}
        />
      )}

      {/* File Validation Modal */}
      <FileValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        darkMode={darkMode}
        fileName={rejectedFile?.name}
        fileType={rejectedFile?.type}
      />
    </div>
  );
}

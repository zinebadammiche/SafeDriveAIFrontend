import React from 'react';
import { X, AlertTriangle, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface ScanResultModalProps {
  scanResult: {
    zones: Array<{
      bbox: number[];
      label: string;
      texte: string;
      confidence: number;
    }>;
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
  };
  fileName?: string;
  onClose: () => void;
  onMaskAndUpload: () => void;
  onEncryptAndUpload: () => void;
  onSafeUpload: () => void;
  isUploading: boolean;
  darkMode: boolean;
}

export function ScanResultModal({
  scanResult,
  fileName,
  onClose,
  onMaskAndUpload,
  onEncryptAndUpload,
  onSafeUpload,
  isUploading,
  darkMode
}: ScanResultModalProps) {
  const [maskedItems, setMaskedItems] = React.useState(new Set<number>());

  const toggleMask = (index: number) => {
    const newMaskedItems = new Set(maskedItems);
    if (newMaskedItems.has(index)) {
      newMaskedItems.delete(index);
    } else {
      newMaskedItems.add(index);
    }
    setMaskedItems(newMaskedItems);
  };

  // Handle safe files
  if (scanResult.isSafe) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className={`max-w-2xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span>File Scan Complete</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                File: <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{fileName}</span>
              </p>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                No sensitive data detected. This file is safe to upload to the cloud.
              </p>
            </div>

            {scanResult.annotated_image && (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Scanned Image</h4>
                <img
                  src={`data:image/png;base64,${scanResult.annotated_image}`}
                  alt="Scanned file"
                  className="w-full max-h-64 object-contain rounded border"
                />
              </div>
            )}

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-200'} border`}>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className={`mb-1 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>Safe to Upload</h4>
                  <p className={`${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    This file passed all security checks with {scanResult.confidenceScore || 0}% confidence.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className={`transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white transition-colors"
                onClick={onSafeUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload to Drive'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle sensitive files
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span>Sensitive Data Detected</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              File: <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{fileName}</span>
            </p>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Found {scanResult.zones.length} sensitive elements that may need attention before uploading to the cloud.
            </p>
          </div>

          {scanResult.annotated_image && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Scanned Image</h4>
              <img
                src={`data:image/png;base64,${scanResult.annotated_image}`}
                alt="Scanned file with detected zones"
                className="w-full max-h-80 object-contain rounded border"
              />
            </div>
          )}

          {/* Detected zones */}
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {scanResult.zones.map((zone: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-red-600 text-white border-red-600 hover:bg-red-700">
                      {zone.label}
                    </Badge>
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Confidence: {Math.round((zone.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMask(index)}
                    className={`transition-colors ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                  >
                    {maskedItems.has(index) ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Show
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Mask
                      </>
                    )}
                  </Button>
                </div>

                <div className={`p-3 rounded font-mono ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  {maskedItems.has(index) ? (
                    <span className="text-gray-400">████████████</span>
                  ) : (
                    <span className={`${darkMode ? 'text-red-400' : 'text-red-700'} bg-red-100 dark:bg-red-900/30 px-1 rounded`}>
                      {zone.texte || 'Detected content'}
                    </span>
                  )}
                </div>

                <div className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p><strong>Risk:</strong> This {zone.label.toLowerCase()} could be used to identify individuals</p>
                  <p><strong>Recommendation:</strong> Review and redact if necessary</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border-blue-600' : 'bg-blue-50 border-blue-200'} border`}>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className={`mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Encryption Options</h4>
                <p className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  You can still upload this file with end-to-end encryption enabled.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className={`transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              disabled={isUploading}
            >
              Cancel Upload
            </Button>

            <Button
              variant="outline"
              onClick={onMaskAndUpload}
              className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
              disabled={isUploading}
            >
              {isUploading ? 'Processing...' : 'Mask & Upload'}
            </Button>

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              onClick={onEncryptAndUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Processing...' : 'Encrypt & Upload'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

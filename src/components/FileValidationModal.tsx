import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface FileValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  fileName?: string;
  fileType?: string;
}

export function FileValidationModal({ isOpen, onClose, darkMode, fileName, fileType }: FileValidationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span>Unsupported File Type</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            {fileName && (
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                File: <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{fileName}</span>
                {fileType && (
                  <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>(.{fileType})</span>
                )}
              </p>
            )}
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-200'} border`}>
              <p className={`${darkMode ? 'text-red-300' : 'text-red-800'} mb-2`}>
                We're sorry, but we currently don't support this file type.
              </p>
              <p className={`${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                <strong>Supported formats:</strong> CSV, PDF, DOCX, DOC, TXT, XLSX, XLS, PNG, JPG, JPEG
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Try Another File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
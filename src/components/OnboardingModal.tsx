import React, { useState } from 'react';
import { Shield, Upload, Eye, Cloud, Lock, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';

interface OnboardingModalProps {
  onClose: () => void;
  darkMode: boolean;
}

export function OnboardingModal({ onClose, darkMode }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Shield,
      title: 'Welcome to SafeDrive AI',
      description: 'Your intelligent and secure cloud gateway that protects your sensitive data before it reaches the cloud.',
      content: 'SafeDrive AI uses advanced AI to scan your files for sensitive information like personal data, financial details, and confidential documents before uploading to cloud storage.'
    },
    {
      icon: Upload,
      title: 'Smart File Upload',
      description: 'Simply drag and drop files into our secure upload zone.',
      content: 'Our system supports various file types including PDFs, documents, images, and more. Each file is processed locally on your device for maximum privacy.'
    },
    {
      icon: Eye,
      title: 'AI-Powered Detection',
      description: 'Advanced AI models scan for sensitive data like emails, phone numbers, and personal information.',
      content: 'We use YOLOv8 for image analysis and specialized NLP models for text processing to detect potentially sensitive information with high accuracy.'
    },
    {
      icon: Lock,
      title: 'Encryption & Security',
      description: 'Files are encrypted locally before being transferred to your cloud storage.',
      content: 'Your data is protected with end-to-end encryption. Even if sensitive data is detected, you can choose to mask it or encrypt it before upload.'
    },
    {
      icon: Cloud,
      title: 'Seamless Cloud Integration',
      description: 'Connect with Google Drive and other cloud services with OAuth security.',
      content: 'Once your files are validated and encrypted, they are securely transferred to your preferred cloud storage service with full OAuth protection.'
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`absolute -top-2 -right-2 transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="text-center py-8">
            <div className={`mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6`}>
              <IconComponent className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>

            <h2 className={`mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentStepData.title}
            </h2>

            <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {currentStepData.description}
            </p>

            <div className={`text-left p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-8`}>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {currentStepData.content}
              </p>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center space-x-2 mb-8">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    index === currentStep
                      ? 'bg-blue-600'
                      : index < currentStep
                      ? 'bg-blue-300 dark:bg-blue-700'
                      : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`px-6 transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                Previous
              </Button>

              <Button
                onClick={nextStep}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
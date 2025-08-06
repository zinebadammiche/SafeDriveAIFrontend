import React from 'react';
import { X, AlertTriangle, CheckCircle, Eye, Shield, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface AIInsightsPanelProps {
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
  } | null;
  onClose: () => void;
  onMaskAndUpload: () => void;      // ADD
  onEncryptAndUpload: () => void;   // ADD
  darkMode: boolean;
}

export function AIInsightsPanel({
  scanResult,
  onClose,
  onMaskAndUpload,
  onEncryptAndUpload,
  darkMode
}: AIInsightsPanelProps) {
  return (
    <div className={`w-80 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-l min-h-screen p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🧠</span>
          <h3 className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>AI Insights</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {scanResult ? (
        <div className="space-y-6">
          {/* Overall Status */}
          <div
            className={`p-4 rounded-lg ${
              scanResult.isSafe ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              {scanResult.isSafe ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`${
                  scanResult.isSafe ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'
                }`}
              >
                {scanResult.isSafe ? 'Clean File' : 'Sensitive Data Found'}
              </span>
            </div>
            <p
              className={`${
                scanResult.isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              Analysis complete with {scanResult.confidenceScore || 0}%
              confidence
            </p>
          </div>

          {/* Confidence Score */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Confidence Score</span>
              <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{scanResult.confidenceScore || 0}%</span>
            </div>
            <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
              <div
                className={`${
                  scanResult.isSafe ? 'bg-emerald-600' : 'bg-red-600'
                } h-2 rounded-full transition-all duration-300`}
                style={{ width: `${scanResult.confidenceScore || 0}%` }}
              />
            </div>
          </div>

          {/* Detected Items */}
          {scanResult.zones && scanResult.zones.length > 0 && (
            <div>
              <h4 className={`mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Detected Zones ({scanResult.zones.length})
              </h4>
              <div className="space-y-3">
                {scanResult.zones.map((zone: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="bg-red-600 text-white border-red-600 hover:bg-red-700">
                        {zone.label}
                      </Badge>
                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {Math.round((zone.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} font-mono text-sm`}>
                      {zone.texte || 'Detected content'}
                    </p>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mt-1`}>
                      Box: [{zone.bbox.join(', ')}]
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          <div>
            <h4 className={`mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Suggested Actions</h4>
            <div className="space-y-2">
              {!scanResult.isSafe ? (
                <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMaskAndUpload}
                  className={`w-full justify-start transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mask Sensitive Sections
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEncryptAndUpload}
                  className={`w-full justify-start transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Encrypt Before Upload
                </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Proceed to Cloud Upload
                </Button>
              )}
            </div>
          </div>

          {/* Analysis Details */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Analysis Details</h4>
            <div className={`space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <div className="flex justify-between">
                <span>Model:</span>
                <span>YOLOv8 + EasyOCR</span>
              </div>
              {scanResult.speed && (
                <>
                  <div className="flex justify-between">
                    <span>Preprocessing:</span>
                    <span>{scanResult.speed.preprocess}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inference:</span>
                    <span>{scanResult.speed.inference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Postprocessing:</span>
                    <span>{scanResult.speed.postprocess}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Zones found:</span>
                <span>{scanResult.total_zones}</span>
              </div>
              <div className="flex justify-between">
                <span>Scan depth:</span>
                <span>Deep analysis</span>
              </div>
            </div>
          </div>

          {/* Detection Metrics */}
          {scanResult.zones && scanResult.zones.length > 0 && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Detection Metrics</h4>
              <div className={`space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="flex justify-between">
                  <span>Avg. Confidence:</span>
                  <span>
                    {Math.round(
                      (scanResult.zones.reduce((acc, zone) => acc + (zone.confidence || 0), 0) /
                        scanResult.zones.length) *
                        100
                    )}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Min. Confidence:</span>
                  <span>
                    {Math.round(Math.min(...scanResult.zones.map(zone => zone.confidence || 0)) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Max. Confidence:</span>
                  <span>
                    {Math.round(Math.max(...scanResult.zones.map(zone => zone.confidence || 0)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="text-6xl mb-4 opacity-50">🧠</div>
          <p>Upload a file to see AI insights</p>
          <p className="text-sm mt-2">Real-time analysis powered by YOLOv8</p>
        </div>
      )}
    </div>
  );
}

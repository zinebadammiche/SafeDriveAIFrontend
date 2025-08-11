import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Shield, Upload, Files, Flag, CheckCircle, Search, Grid, List, MoreVertical,
  Download, Share, Trash2, Lock, Moon, Sun, LogOut, Filter
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from './ui/dropdown-menu';
const API_BASE =  process.env.API_BASE;

type ViewMode = 'grid' | 'list';

interface FileItem {
  id: string;
  name: string;
  size: string;           // already formatted
  folder: string;         // where it lives in /data_storage on backend
  uploadDate: string;     // YYYY-MM-DD
  type: 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'file';
  status: 'unverified' | 'masked' | 'safe' | string;
  encrypted: boolean;
  flags: number;
  thumbnail?: string | null;
}

interface DashboardProps {
  user: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  filterMode?: 'safe' | 'flagged';
  currentPage: string;
}

/* ---------- helpers ---------- */
const getFileType = (filename: string): FileItem['type'] => {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'document';
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'spreadsheet';
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'presentation';
  if (name.endsWith('.zip') || name.endsWith('.rar')) return 'archive';
  return 'file';
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (isoString?: string): string => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFileIcon = (type: FileItem['type']) => {
  switch (type) {
    case 'pdf': return '📄';
    case 'document': return '📝';
    case 'spreadsheet': return '📊';
    case 'presentation': return '📺';
    case 'archive': return '🗂';
    default: return '🗂';
  }
};
/* -------------------------------- */

export function Dashboard({
  user,
  onNavigate,
  onLogout,
  darkMode,
  toggleDarkMode,
  filterMode,
  currentPage
}: DashboardProps) {

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [driveFiles, setDriveFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        const response = await axios.get(`${API_BASE}/auth/drive`, { withCredentials: true });
        const filesFromDrive: any[] = response.data || [];

        const mapped: FileItem[] = filesFromDrive.map((file: any) => {
          const name: string = file.name ?? 'Untitled';
          const folder = file.folder || name.replace(/\.[^/.]+$/, '');
          return {
            id: file.id,
            name,
            size: formatFileSize(Number(file.size)),
            folder,
            uploadDate: formatDate(file.modifiedTime),
            type: getFileType(name),
            status: (file.status as FileItem['status']) || 'unverified',
            encrypted: Boolean(file.encrypted),
            flags: Number(file.flags) || 0,
            thumbnail: null,
          };
        });

        setDriveFiles(mapped);
      } catch (error) {
        console.error('Failed to fetch drive files:', error);
      }
    };

    fetchDriveFiles();
  }, []);

  const handleDelete = async (fileId: string) => {
    try {
      const response = await axios.delete(`${API_BASE}/auth/delete/${fileId}`, {
        withCredentials: true,
      });

      if (response.status === 200) {
        setDriveFiles(prev => prev.filter(f => f.id !== fileId));
        alert('File deleted successfully');
      } else {
        alert(`Failed to delete file: ${response.data?.error ?? 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error deleting file: ${error.response?.data?.error || error.message}`);
    }
  };

  // Decrypt for images encrypted by /encrypt (zones with Fernet)
  const handleDecrypt = async (file: FileItem) => {
    try {
      const keyFileInput = document.createElement('input');
      keyFileInput.type = 'file';
      keyFileInput.accept = '.key';

      keyFileInput.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const keyFile = target.files?.[0];
        if (!keyFile) return;

        const formData = new FormData();
        formData.append('key', keyFile);

        // backend expects folder name without extension, base of original
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        formData.append('image_name', baseName);

        const resp = await axios.post(`${API_BASE}/decrypt`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        });

        const restoredPath: string = resp.data.restored;
        const downloadResponse = await axios.get(`${API_BASE}/${restoredPath}`, {
          responseType: 'blob',
          withCredentials: true
        });

        const url = window.URL.createObjectURL(downloadResponse.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${baseName}_restored.png`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      };

      keyFileInput.click();
    } catch (error) {
      console.error('Decrypt failed', error);
      alert('Failed to decrypt file. Make sure you selected the correct key.');
    }
  };

  // Decrypt for non-images encrypted by /encryptfiles (TenSEAL ctx + metadata)
  const handleDecryptFile = async (file: FileItem) => {
    try {
      const contextInput = document.createElement('input');
      contextInput.type = 'file';
      contextInput.accept = '.ctx';

      contextInput.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const contextFile = target.files?.[0];
        if (!contextFile) return;

        // Download encrypted file & metadata from backend storage
        const encryptedUrl = `${API_BASE}/data_storage/${file.folder}/${file.name}`;
        const metaUrl = `${API_BASE}/data_storage/${file.folder}/${file.name}_encrypted_data.json`;

        const [encryptedResponse, metadataResponse] = await Promise.all([
          axios.get(encryptedUrl, { responseType: 'blob', withCredentials: true }),
          axios.get(metaUrl, { responseType: 'blob', withCredentials: true }),
        ]);

        const formData = new FormData();
        formData.append('file', encryptedResponse.data, file.name);
        formData.append('metadata', metadataResponse.data, `${file.name}_encrypted_data.json`);
        formData.append('context', contextFile);

        const response = await axios.post(`${API_BASE}/decryptfiles`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob',
          withCredentials: true,
        });

        const blob = response.data as Blob;
        if (!(blob instanceof Blob)) {
          alert('No decrypted file returned from server!');
          console.error('Response was not a Blob:', response);
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `decrypted_${file.name}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        alert('File decrypted successfully!');
      };

      contextInput.click();
    } catch (error) {
      console.error('Decrypt failed', error);
      alert('Failed to decrypt file.');
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await axios.get(
        `${API_BASE}/auth/download/${file.id}`,
        { responseType: 'blob', withCredentials: true }
      );

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
      alert('Failed to download file.');
    }
  };

  const filteredFiles = driveFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterMode === 'flagged') return matchesSearch && file.flags > 0;
    if (filterMode === 'safe') return matchesSearch && file.status === 'safe';

    return matchesSearch; // default "My Files"
  });

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className={`${darkMode ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '1.3rem', fontWeight: 400 }}>
              SafeDrive AI
            </h1>
          </div>

          <div className="flex items-center space-x-4">
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
                <p
                  className={`${darkMode ? 'text-white' : 'text-gray-900'}`}
                  style={{ fontWeight: 500, fontSize: '0.85rem', marginTop: '0.3rem', fontFamily: 'Inter, sans-serif' }}
                >
                  {user?.name ?? 'User'}
                </p>
                <p
                  className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                  style={{ fontWeight: 400, fontSize: '0.7rem', fontFamily: 'Inter, sans-serif' }}
                >
                  {user?.storageUsed} used
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className={`${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-900 hover:text-gray-900 hover:bg-gray-100'} transition-colors`}
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
                darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                         : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Upload className="h-4 w-4 mr-3" />
              Upload Files
            </Button>

            <Button
              variant="ghost"
              onClick={() => onNavigate('dashboard')}
              className={`w-full justify-start transition-colors ${
                currentPage === 'dashboard'
                  ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                  : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100')
              }`}
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
                  : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100')
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
                  : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100')
              }`}
            >
              <CheckCircle className="h-4 w-4 mr-3" />
              Safe Uploads
            </Button>
          </nav>

          {/* Storage Usage */}
          <div className={`mt-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '0.85rem', fontWeight: 500 }}>
              Storage Usage
            </h4>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${
                    (parseFloat(String(user?.storageUsed || '0')) / parseFloat(String(user?.storageTotal || '1'))) * 100
                  }%`,
                }}
              />
            </div>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: '0.7rem' }}>
              {user?.storageUsed} of {user?.storageTotal} used
            </p>
          </div>
        </aside>

        {/* Main Section */}
        <main className="flex-1 p-8">
          {/* Title */}
          <div className="mb-8">
            <h2 className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-2`} style={{ fontSize: '1.7rem', fontWeight: 600 }}>
              My Files
            </h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Manage your securely uploaded files
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 w-80 border-0 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-gray-300
                    ${darkMode ? 'bg-gray-800 placeholder-gray-200 text-white'
                               : 'bg-white placeholder-gray-400 text-gray-700'}`}
                  style={{ fontSize: '0.9rem', lineHeight: '1.1rem' }}
                />
              </div>

              {/* Filter Button (UI only here) */}
              <Button
                variant="outline"
                size="sm"
                className={`rounded-md flex items-center transition-colors ${
                  darkMode ? 'bg-gray-800 border border-gray-600 text-white hover:bg-gray-700'
                           : 'bg-white border border-gray-300 text-black hover:bg-gray-100'
                }`}
                style={{ fontSize: '0.85rem', fontWeight: 500, padding: '0.4rem 0.75rem' }}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`transition-colors w-8 h-8 rounded-md ${
                  viewMode === 'grid' ? 'bg-black text-white hover:bg-black'
                                      : 'bg-white text-black border border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setViewMode('list')}
                className={`transition-colors w-8 h-8 rounded-md ${
                  viewMode === 'list' ? 'bg-black text-white hover:bg-black'
                                      : 'bg-white text-black border border-gray-300 hover:bg-gray-100'
                }`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grid Mode */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`${
                    darkMode ? 'bg-gray-800 border border-gray-700'
                             : 'bg-white border border-gray-200'
                  } w-[270px] h-[160px] rounded-xl p-4 mx-auto flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-none hover:shadow-[0_3px_10px_rgba(0,0,0,0.08)]`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{getFileIcon(file.type)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white shadow-lg border border-gray-200">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        {file.encrypted && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() =>
                              file.type === 'document' || file.type === 'spreadsheet' || file.type === 'pdf'
                                ? handleDecryptFile(file)
                                : handleDecrypt(file)
                            }
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Decrypt
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => handleDelete(file.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className={`text-sm font-medium truncate mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {file.name}
                  </h3>

                  <div className="text-xs text-[#737789] flex justify-between mt-1" style={{ fontSize: '0.75rem' }}>
                    <span>{file.size}</span>
                    <span>{file.uploadDate}</span>
                  </div>

                  <div className="flex items-center space-x-2 mt-2">
                    {file.encrypted && (
                      <Badge className="bg-[#eceef2] text-black text-[10px] px-2 py-[2px] rounded-md shadow-none">
                        <Lock className="h-3 w-3 mr-1" />
                        Encrypted
                      </Badge>
                    )}
                    {file.status === 'masked' && (
                      <Badge className="bg-orange-600 text-white text-[10px] px-2 py-[2px] rounded-md shadow-none">
                        Masked
                      </Badge>
                    )}
                    {file.flags > 0 && (
                      <Badge className="bg-red-600 text-white text-[10px] px-2 py-[2px] rounded-md shadow-none">
                        {file.flags} Flags
                      </Badge>
                    )}
                    {file.status === 'unverified' && (
                      <Badge className="bg-[#e05b00] text-white text-[10px] px-2 py-[2px] rounded-md">
                        <Flag className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                    {file.status === 'safe' && (
                      <Badge className="bg-black text-white text-[10px] px-2 py-[2px] rounded-md">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Safe
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List Mode */
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl overflow-hidden`}>
              {/* Header Row */}
              <div
                className={`grid grid-cols-6 gap-0 p-4 border-b text-sm font-medium ${
                  darkMode ? 'border-gray-700 bg-gray-700 text-gray-300'
                           : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                <div className="pr-3">Name</div>
                <div className="pl-2">Size</div>
                <div className="pl-2">Upload Date</div>
                <div className="pl-2">Status</div>
                <div className="pl-2">Security</div>
                <div className="pl-2">Actions</div>
              </div>

              {/* File Rows */}
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`
                    grid grid-cols-6 gap-0 items-center
                    p-4 border-b transition-all duration-200 cursor-pointer
                    ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                               : 'bg-white border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  {/* Name */}
                  <div className="flex items-center space-x-3 pr-3">
                    <span className="text-xl">{getFileIcon(file.type)}</span>
                    <span className={`truncate font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {file.name}
                    </span>
                  </div>

                  {/* Size */}
                  <div className="text-xs pl-2" style={darkMode ? { color: '#9CA3AF' } : { color: '#737789' }}>
                    {file.size}
                  </div>

                  {/* Upload Date */}
                  <div className="text-xs pl-2" style={darkMode ? { color: '#9CA3AF' } : { color: '#737789' }}>
                    {file.uploadDate}
                  </div>

                  {/* Status */}
                  <div className="pl-2">
                    {file.status === 'unverified' && (
                      <Badge className="bg-[#f8aa1a] text-white border-[#f8aa1a] hover:bg-[#f7a116] text-[10px] px-2 py-[2px] rounded-md">
                        <Flag className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                    {file.status === 'masked' && (
                      <Badge className="bg-orange-600 text-white text-[10px] px-2 py-[2px] rounded-md">
                        Masked
                      </Badge>
                    )}
                    {file.status === 'safe' && (
                      <Badge className="bg-[#e6e6e6] text-black border-[#e6e6e6] text-[10px] px-2 py-[2px] rounded-md">
                        Safe
                      </Badge>
                    )}
                  </div>

                  {/* Security */}
                  <div className="pl-2">
                    {file.encrypted && (
                      <Badge className="bg-[#eceef2] text-black border-[#eceef2] text-[10px] px-2 py-[2px] rounded-md">
                        <Lock className="h-3 w-3 mr-1" />
                        Encrypted
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pl-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        {file.encrypted && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() =>
                              file.type === 'document' || file.type === 'spreadsheet' || file.type === 'pdf'
                                ? handleDecryptFile(file)
                                : handleDecrypt(file)
                            }
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Decrypt
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(file.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

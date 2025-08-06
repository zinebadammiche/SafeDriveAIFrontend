import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Shield, Upload, Files, Users, Flag, CheckCircle, Search, Grid, List, MoreVertical,
  Download, Share, Trash2, Lock, Moon, Sun, LogOut, Filter
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from './ui/dropdown-menu';
const API_BASE = "http://localhost:5000";
interface DashboardProps {
  user: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function Dashboard({ user, onNavigate, onLogout, darkMode, toggleDarkMode }: DashboardProps) {
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        const response = await axios.get('http://localhost:5000/auth/drive', { withCredentials: true });
        const filesFromDrive = response.data || [];

        const mapped = filesFromDrive.map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size ? formatFileSize(file.size) : '—',
          uploadDate: file.modifiedTime ? formatDate(file.modifiedTime) : '—',
          type: getFileType(file.name),
          status: file.status || 'unverified',   // status from metadata
          encrypted: file.encrypted || false,    // encrypted flag from metadata
          flags: file.flags || 0,                // flags count from metadata
          thumbnail: null
        }));

        setDriveFiles(mapped);
      } catch (error) {
        console.error('Failed to fetch drive files:', error);
      }
    };

    fetchDriveFiles();
  }, []);

  const getFileType = (filename: string) => {
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) return 'document';
    if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return 'spreadsheet';
    if (filename.endsWith('.ppt') || filename.endsWith('.pptx')) return 'presentation';
    if (filename.endsWith('.zip') || filename.endsWith('.rar')) return 'archive';
    return 'file';
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'document': return '📝';
      case 'spreadsheet': return '📊';
      case 'presentation': return '📺';
      case 'archive': return '🗂️';
      default: return '🗂️';
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await axios.delete(`http://localhost:5000/auth/delete/${fileId}`, {
        withCredentials: true,
      });

      if (response.status === 200) {
        alert("File deleted successfully");
        setDriveFiles((prevFiles) => prevFiles.filter(file => file.id !== fileId));
      } else {
        alert("Failed to delete file: " + response.data.error);
      }
    } catch (error: any) {
      alert("Error deleting file: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDecrypt = async (file: any) => {
    try {
      const keyFileInput = document.createElement("input");
      keyFileInput.type = "file";
      keyFileInput.accept = ".key";

      keyFileInput.onchange = async (e: any) => {
        const keyFile = e.target.files[0];
        if (!keyFile) return;

        const formData = new FormData();
        formData.append("key", keyFile);
        // Remove both _encrypted suffix and extension
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        formData.append("image_name", baseName);


        const response = await axios.post("http://localhost:5000/decrypt", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true
        });

        const restoredPath = response.data.restored;

        const downloadResponse = await axios.get(`http://localhost:5000/${restoredPath}`, {
          responseType: "blob",
          withCredentials: true
        });

        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${file.name.replace(/\.[^/.]+$/, "")}_restored.png`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      };

      keyFileInput.click();
    } catch (error) {
      console.error("Decrypt failed", error);
      alert("Failed to decrypt file. Make sure you selected the correct key.");
    }
  };

const handleDecryptFile = async (file: any) => {
  try {
    // Ask user for context (.ctx) file
    const contextInput = document.createElement("input");
    contextInput.type = "file";
    contextInput.accept = ".ctx";

    contextInput.onchange = async (e: any) => {
      const contextFile = e.target.files[0];
      if (!contextFile) return;

      // Download encrypted file from backend
      const encryptedResponse = await axios.get(
        `${API_BASE}/data_storage/${file.name.replace(/\.[^/.]+$/, '')}/${file.name}`,
        { responseType: "blob", withCredentials: true }
      );

      // Download JSON metadata file from backend
      const metadataResponse = await axios.get(
        `${API_BASE}/data_storage/${file.name.replace(/\.[^/.]+$/, '')}/${file.name}_encrypted_data.json`,
        { responseType: "blob", withCredentials: true }
      );

      // Prepare form data
      const formData = new FormData();
      formData.append("file", encryptedResponse.data, file.name);
      formData.append("metadata", metadataResponse.data, `${file.name}_encrypted_data.json`);
      formData.append("context", contextFile);

      // Send to decryptfiles API
      const response = await axios.post(`${API_BASE}/decryptfiles`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
        withCredentials: true,
      });

      if (!response.data || !(response.data instanceof Blob)) {
        alert("No decrypted file returned from server!");
        console.error("Response was not a Blob:", response);
        return;
      }

      // Trigger download
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `decrypted_${file.name}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert("File decrypted successfully!");
    };

    contextInput.click();
  } catch (error) {
    console.error("Decrypt failed", error);
    alert("Failed to decrypt file.");
  }
};

const handleDownload = async (file: any) => {
  try {
    const fileUrl = `${API_BASE}/data_storage/${file.name}`;

    const response = await axios.get(fileUrl, {
      responseType: "blob",
      withCredentials: true,
    });

    if (!response.data) {
      alert("Failed to download file: no data returned.");
      return;
    }

    // Create a download link
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name; // download with original name
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed", error);
    alert("Failed to download file.");
  }
};


  const filteredFiles = driveFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 400 }} className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>SafeDrive AI</h1>
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
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
              <div className="hidden md:block">
                <p style={{ fontWeight: 50, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginTop: '0.3rem' }} className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                <p style={{ fontWeight: 200, fontSize: '0.7rem', fontFamily: 'Inter, sans-serif' }} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.storageUsed} used</p>
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
  <aside
    className={`w-64 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-r min-h-screen p-4`}
  >
    <nav className="space-y-2">
      <Button
        variant="ghost"
        onClick={() => onNavigate('upload')}
        className={`w-full justify-start transition-colors ${
          darkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <Upload className="h-4 w-4 mr-3" />
        Upload Files
      </Button>
      <Button
        variant="ghost"
        className={`w-full justify-start transition-colors ${
          darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'
        }`}
      >
        <Files className="h-4 w-4 mr-3" />
        My Files
      </Button>
      <Button
        variant="ghost"
        className={`w-full justify-start transition-colors ${
          darkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <Users className="h-4 w-4 mr-3" />
        Shared
      </Button>
      <Button
        variant="ghost"
        className={`w-full justify-start transition-colors ${
          darkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <Flag className="h-4 w-4 mr-3" />
        Flagged
      </Button>
      <Button
        variant="ghost"
        className={`w-full justify-start transition-colors ${
          darkMode
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <CheckCircle className="h-4 w-4 mr-3" />
        Safe Uploads
      </Button>
    </nav>

    {/* Storage Usage */}
    <div
      className={`mt-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
    >
      <h4
        className={`mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}
        style={{ fontSize: '0.85rem', fontWeight: '50' }}
      >
        Storage Usage
      </h4>
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{
            width: `${
              (parseFloat(user.storageUsed) / parseFloat(user.storageTotal)) * 100
            }%`,
          }}
        ></div>
      </div>
      <p
        className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
        style={{ fontSize: '0.7rem' }}
      >
        {user.storageUsed} of {user.storageTotal} used
      </p>
    </div>
  </aside>

  {/* Main Section */}
  <main className="flex-1 p-8">
    {/* Title */}
    <div className="mb-8">
      <h2
        className={`${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}
        style={{ fontSize: '1.7rem', fontWeight: 100 }}
      >
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
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 w-80 border-0 rounded-md transition-all
              ${
                darkMode
                  ? 'bg-gray-800 placeholder-gray-200 text-white'
                  : 'bg-white placeholder-gray-300 text-gray-700'
              }`}
            style={{
              outline: 'none',
              fontSize: '0.85rem',
              lineHeight: '1.1rem',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = `0 0 0 1px #a1a1a1, 0 0 0 4px #cccdcd`;
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          className={`rounded-md flex items-center transition-colors
            ${
              darkMode
                ? 'bg-gray-800 border border-gray-600 text-white hover:bg-gray-700'
                : 'bg-white border border-gray-300 text-black hover:bg-gray-100'
            }`}
          style={{
            fontSize: '0.85rem',
            fontWeight: 500,
            padding: '0.4rem 0.75rem',
            borderWidth: '1px',
          }}
        >
          <Filter
            style={{ strokeWidth: 2, marginRight: '0.25rem' }}
            className="h-4 w-4"
          />
          Filter
        </Button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          onClick={() => setViewMode('grid')}
          className={`transition-colors w-8 h-8 rounded-md ${
            viewMode === 'grid'
              ? 'bg-black text-white hover:bg-black'
              : 'bg-white text-black border border-gray-300 hover:bg-gray-100'
          }`}
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => setViewMode('list')}
          className={`transition-colors w-8 h-8 rounded-md ${
            viewMode === 'list'
              ? 'bg-black text-white hover:bg-black'
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
              darkMode
                ? 'bg-gray-800 border border-gray-700'
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
                    className={`${
                      darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                    } transition-colors`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white shadow-lg border border-gray-200">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4 mr-2 cursor-pointer" />
                      Download
                    </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Share className="h-4 w-4 mr-2 cursor-pointer" />
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
                  <DropdownMenuItem
                    className="text-red-600 cursor-pointer"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2 cursor-pointer" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h3
              className={`text-sm font-medium truncate mt-1 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {file.name}
            </h3>

            <div
              className="text-xs text-[#737789] flex justify-between mt-1"
              style={{ fontSize: '0.75rem' }}
            >
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
      /* List Mode (rows like table) */
      <div
        className={`${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-xl overflow-hidden`}
      >
        {/* Header Row */}
        <div
          className={`grid grid-cols-6 gap-0 p-4 border-b text-sm font-medium ${
            darkMode
              ? 'border-gray-700 bg-gray-700 text-gray-300'
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
              ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            {/* Name */}
            <div className="flex items-center space-x-3 pr-3">
              <span className="text-xl">{getFileIcon(file.type)}</span>
              <span
                className={`truncate font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {file.name}
              </span>
            </div>

            {/* Size */}
            <div
              className="text-xs pl-2"
              style={darkMode ? { color: '#9CA3AF' } : { color: '#737789' }}
            >
              {file.size}
            </div>

            {/* Upload Date */}
            <div
              className="text-xs pl-2"
              style={darkMode ? { color: '#9CA3AF' } : { color: '#737789' }}
            >
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
                    className={`${
                      darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                    } transition-colors`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
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
                      onClick={() => handleDecrypt(file)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Decrypt
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-red-600">
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

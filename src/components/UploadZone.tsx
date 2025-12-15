import { useCallback, useState } from 'react';
import { Upload, FileText, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

const UploadZone = ({ onFilesSelected, isProcessing }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = '';
  }, [onFilesSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "upload-zone p-12 text-center cursor-pointer relative overflow-hidden",
        isDragging && "active",
        isProcessing && "pointer-events-none opacity-60"
      )}
    >
      <input
        type="file"
        accept=".pdf,image/*"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />
      
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-accent" />
        </div>
        
        <div>
          <h3 className="font-serif text-xl text-foreground mb-2">
            Upload Financial Documents
          </h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Drag and drop your bank statements, invoices, and receipts here, or click to browse
          </p>
        </div>
        
        <div className="flex items-center gap-6 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>PDF Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            <span>Images (JPG, PNG)</span>
          </div>
        </div>
      </div>
      
      {isDragging && (
        <div className="absolute inset-0 bg-accent/5 border-2 border-accent rounded-xl flex items-center justify-center">
          <span className="text-accent font-medium">Drop files here</span>
        </div>
      )}
    </div>
  );
};

export default UploadZone;

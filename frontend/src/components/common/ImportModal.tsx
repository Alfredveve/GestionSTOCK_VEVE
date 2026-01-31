import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, X, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<any>;
  title?: string;
  description?: string;
  templateUrl?: string; // Future use
}

export function ImportModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  title = "Importer des données", 
  description = "Sélectionnez un fichier Excel ou CSV pour importer vos données." 
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setResult(null);
      } else {
        toast.error("Format de fichier non supporté. Veuillez utiliser Excel (.xlsx, .xls) ou CSV.");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await onUpload(file);
      setResult({ success: true, ...res });
      // Reset file after success? Or keep it to show success state?
      // We keep it but show success message.
    } catch (error: any) {
      console.error(error);
      setResult({ 
        success: false, 
        message: error.response?.data?.error || error.message || "Erreur lors de l'importation",
        errors: error.response?.data?.errors || []
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
        <div className="bg-slate-900 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Upload className="h-5 w-5 text-white" />
              </div>
              {title}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {!result?.success ? (
            <div className="space-y-4">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                  isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                  file ? "bg-slate-50 border-blue-200" : ""
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileChange}
                  aria-label="Upload Excel or CSV file"
                  title="Upload Excel or CSV file"
                />
                
                {file ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <p className="font-bold text-slate-700 max-w-[200px] truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="mt-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      Supprimer
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Cliquez pour sélectionner un fichier</p>
                    <p className="text-xs text-slate-400 mt-1">ou glissez-déposez ici (Excel, CSV)</p>
                  </>
                )}
              </div>

              {result?.success === false && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm space-y-2 border border-rose-100">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Échec de l'importation</span>
                  </div>
                  <p>{result.message}</p>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-rose-200 text-xs space-y-1 max-h-32 overflow-y-auto">
                        {result.errors.map((err: string, i: number) => (
                            <p key={i}>{err}</p>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Importation réussie !</h3>
              <p className="text-slate-500 mb-6">{result.message}</p>
              
              {result.errors && result.errors.length > 0 && (
                <div className="w-full bg-amber-50 text-amber-700 p-4 rounded-xl text-left text-sm mb-4 border border-amber-100">
                   <p className="font-bold mb-2 flex items-center gap-2">
                     <AlertCircle className="h-4 w-4" /> 
                     Quelques avertissements :
                   </p>
                   <ul className="list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto">
                     {result.errors.map((err: string, i: number) => (
                       <li key={i}>{err}</li>
                     ))}
                   </ul>
                </div>
              )}

              <Button onClick={handleClose} className="bg-slate-900 text-white hover:bg-slate-800 px-8 rounded-xl font-bold h-12">
                Terminer
              </Button>
            </div>
          )}
        </div>

        {!result?.success && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose} disabled={isUploading} className="font-bold text-slate-500">
              Annuler
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-500/20"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importation...
                </>
              ) : (
                "Importer maintenant"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

 import { useState, useRef, useCallback } from "react";
 import { Button } from "@/components/ui/button";
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 import { 
   Camera, 
   Upload, 
   X, 
   Star, 
   Trash2, 
   ImagePlus,
   FolderOpen
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import Webcam from "react-webcam";
 
 interface ImageGalleryUploadProps {
   images: string[];
   featuredIndex: number;
   onImagesChange: (images: string[], featuredIndex: number) => void;
   pendingFiles: File[];
   onPendingFilesChange: (files: File[]) => void;
 }
 
 export const ImageGalleryUpload = ({
   images,
   featuredIndex,
   onImagesChange,
   pendingFiles,
   onPendingFilesChange
 }: ImageGalleryUploadProps) => {
   const [showCamera, setShowCamera] = useState(false);
   const [showGalleryModal, setShowGalleryModal] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const webcamRef = useRef<Webcam>(null);
 
   // Combine existing URLs with pending file previews
   const allPreviews = [
     ...images,
     ...pendingFiles.map(file => URL.createObjectURL(file))
   ];
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = Array.from(e.target.files || []);
     if (files.length > 0) {
       onPendingFilesChange([...pendingFiles, ...files]);
     }
     // Reset input
     if (fileInputRef.current) {
       fileInputRef.current.value = '';
     }
   };
 
   const capturePhoto = useCallback(() => {
     if (webcamRef.current) {
       const imageSrc = webcamRef.current.getScreenshot();
       if (imageSrc) {
         // Convert base64 to file
         fetch(imageSrc)
           .then(res => res.blob())
           .then(blob => {
             const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
             onPendingFilesChange([...pendingFiles, file]);
             setShowCamera(false);
           });
       }
     }
   }, [pendingFiles, onPendingFilesChange]);
 
   const removeImage = (index: number) => {
     if (index < images.length) {
       // Remove from existing URLs
       const newImages = images.filter((_, i) => i !== index);
       const newFeaturedIndex = featuredIndex >= newImages.length 
         ? Math.max(0, newImages.length - 1) 
         : (featuredIndex > index ? featuredIndex - 1 : featuredIndex);
       onImagesChange(newImages, newFeaturedIndex);
     } else {
       // Remove from pending files
       const pendingIndex = index - images.length;
       const newPending = pendingFiles.filter((_, i) => i !== pendingIndex);
       onPendingFilesChange(newPending);
       
       // Adjust featured index if needed
       if (featuredIndex >= index) {
         const totalAfter = images.length + newPending.length;
         const newFeaturedIndex = featuredIndex >= totalAfter 
           ? Math.max(0, totalAfter - 1) 
           : (featuredIndex > index ? featuredIndex - 1 : featuredIndex);
         onImagesChange(images, newFeaturedIndex);
       }
     }
   };
 
   const setFeatured = (index: number) => {
     onImagesChange(images, index);
   };
 
   const featuredPreview = allPreviews[featuredIndex] || allPreviews[0];
 
   return (
     <div className="space-y-3">
       {/* Main Preview / Add Button */}
       <div 
         className="relative cursor-pointer group"
         onClick={() => allPreviews.length > 0 ? setShowGalleryModal(true) : fileInputRef.current?.click()}
       >
         {featuredPreview ? (
           <div className="relative">
             <img 
               src={featuredPreview} 
               alt="Destaque" 
               className="w-full h-48 object-cover rounded-lg border-2 border-muted group-hover:border-primary transition-colors"
             />
             <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
               <Star className="h-3 w-3" />
               Destaque
             </div>
             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
               <span className="text-white text-sm font-medium">Editar Galeria ({allPreviews.length} fotos)</span>
             </div>
           </div>
         ) : (
           <div className="w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground hover:border-primary transition-colors flex flex-col items-center justify-center gap-2">
             <ImagePlus className="h-10 w-10 text-muted-foreground" />
             <span className="text-sm text-muted-foreground">Adicionar fotos</span>
           </div>
         )}
       </div>
 
       {/* Quick Actions */}
       <div className="flex gap-2">
         <Button 
           type="button" 
           variant="outline" 
           size="sm" 
           className="flex-1"
           onClick={() => setShowCamera(true)}
         >
           <Camera className="h-4 w-4 mr-2" />
           Câmera
         </Button>
         <Button 
           type="button" 
           variant="outline" 
           size="sm" 
           className="flex-1"
           onClick={() => fileInputRef.current?.click()}
         >
           <FolderOpen className="h-4 w-4 mr-2" />
           Arquivos
         </Button>
       </div>
 
       {/* Thumbnails */}
       {allPreviews.length > 1 && (
         <div className="flex gap-2 overflow-x-auto pb-2">
           {allPreviews.map((preview, index) => (
             <div 
               key={index}
               className={cn(
                 "relative flex-shrink-0 cursor-pointer rounded-md overflow-hidden border-2 transition-colors",
                 index === featuredIndex ? "border-primary" : "border-transparent hover:border-muted-foreground"
               )}
               onClick={() => setFeatured(index)}
             >
               <img 
                 src={preview} 
                 alt={`Foto ${index + 1}`} 
                 className="w-16 h-16 object-cover"
               />
               {index === featuredIndex && (
                 <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                   <Star className="h-4 w-4 text-primary fill-primary" />
                 </div>
               )}
             </div>
           ))}
         </div>
       )}
 
       {/* Hidden File Input */}
       <input
         ref={fileInputRef}
         type="file"
         accept="image/*"
         multiple
         onChange={handleFileSelect}
         className="hidden"
       />
 
       {/* Camera Modal */}
       <Dialog open={showCamera} onOpenChange={setShowCamera}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>Tirar Foto</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <Webcam
               ref={webcamRef}
               screenshotFormat="image/jpeg"
               className="w-full rounded-lg"
               videoConstraints={{
                 facingMode: "environment"
               }}
             />
             <div className="flex gap-2">
               <Button 
                 type="button" 
                 variant="outline" 
                 className="flex-1"
                 onClick={() => setShowCamera(false)}
               >
                 Cancelar
               </Button>
               <Button 
                 type="button" 
                 className="flex-1"
                 onClick={capturePhoto}
               >
                 <Camera className="h-4 w-4 mr-2" />
                 Capturar
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
 
       {/* Gallery Modal */}
       <Dialog open={showGalleryModal} onOpenChange={setShowGalleryModal}>
         <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Galeria de Fotos ({allPreviews.length})</DialogTitle>
           </DialogHeader>
           
           <div className="space-y-4">
             {/* Add More Buttons */}
             <div className="flex gap-2">
               <Button 
                 type="button" 
                 variant="outline" 
                 size="sm"
                 onClick={() => {
                   setShowGalleryModal(false);
                   setShowCamera(true);
                 }}
               >
                 <Camera className="h-4 w-4 mr-2" />
                 Tirar Foto
               </Button>
               <Button 
                 type="button" 
                 variant="outline" 
                 size="sm"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <Upload className="h-4 w-4 mr-2" />
                 Upload em Lote
               </Button>
             </div>
 
             {/* Gallery Grid */}
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {allPreviews.map((preview, index) => (
                 <div 
                   key={index}
                   className={cn(
                     "relative rounded-lg overflow-hidden border-2 transition-colors group",
                     index === featuredIndex ? "border-primary" : "border-muted"
                   )}
                 >
                   <img 
                     src={preview} 
                     alt={`Foto ${index + 1}`} 
                     className="w-full h-32 object-cover"
                   />
                   
                   {/* Overlay Actions */}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <Button 
                       type="button"
                       size="icon" 
                       variant={index === featuredIndex ? "default" : "secondary"}
                       className="h-8 w-8"
                       onClick={() => setFeatured(index)}
                       title="Definir como destaque"
                     >
                       <Star className={cn("h-4 w-4", index === featuredIndex && "fill-current")} />
                     </Button>
                     <Button 
                       type="button"
                       size="icon" 
                       variant="destructive"
                       className="h-8 w-8"
                       onClick={() => removeImage(index)}
                       title="Remover foto"
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
 
                   {/* Featured Badge */}
                   {index === featuredIndex && (
                     <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
                       <Star className="h-3 w-3 fill-current" />
                       Destaque
                     </div>
                   )}
 
                   {/* Pending Badge */}
                   {index >= images.length && (
                     <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded">
                       Pendente
                     </div>
                   )}
                 </div>
               ))}
             </div>
 
             <p className="text-sm text-muted-foreground text-center">
               Clique na ⭐ para definir a imagem destaque. Fotos pendentes serão enviadas ao salvar.
             </p>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 };
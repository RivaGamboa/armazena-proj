import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  /** Optional: all images in the gallery for arrow navigation */
  gallery?: string[];
  /** Optional: index of this image in the gallery */
  galleryIndex?: number;
}

export const ImageZoom = ({ src, alt, className, gallery, galleryIndex = 0 }: ImageZoomProps) => {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(galleryIndex);

  const images = gallery && gallery.length > 0 ? gallery : [src];
  const hasNav = images.length > 1;

  const handleOpen = () => {
    setCurrentIndex(gallery ? galleryIndex : 0);
    setOpen(true);
  };

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(i => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(i => (i + 1) % images.length);
  }, [images.length]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={cn("cursor-zoom-in", className)}
        onClick={handleOpen}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 sm:p-4 flex items-center justify-center bg-black/95 border-none">
          {hasNav && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 sm:left-4 z-10 h-12 w-12 sm:h-10 sm:w-10 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg"
              onClick={prev}
            >
              <ChevronLeft className="h-7 w-7 sm:h-6 sm:w-6" />
            </Button>
          )}

          <img
            src={images[currentIndex]}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />

          {hasNav && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 sm:right-4 z-10 h-12 w-12 sm:h-10 sm:w-10 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg"
              onClick={next}
            >
              <ChevronRight className="h-7 w-7 sm:h-6 sm:w-6" />
            </Button>
          )}

          {hasNav && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

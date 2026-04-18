import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Maximize2, X, Image as ImageIcon } from "lucide-react";

interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
}

interface HTMLGalleryProps {
  images: GalleryImage[];
}

export function HTMLGallery({ images }: HTMLGalleryProps) {
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-primary opacity-50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No images generated yet</h3>
          <p className="text-muted-foreground text-sm">
            Your generated images will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                layout: { duration: 0.3 },
              }}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-muted"
              onMouseEnter={() => setHoveredId(image.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Image */}
              <img
                src={image.url}
                alt={image.prompt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Gradient Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
                  hoveredId === image.id ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Hover Content */}
              <AnimatePresence>
                {hoveredId === image.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col justify-end p-4"
                  >
                    {/* Prompt Text */}
                    <p className="text-white text-sm mb-3 line-clamp-2 drop-shadow-lg">
                      {image.prompt}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLightboxImage(image)}
                        className="flex-1 px-3 py-2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Maximize2 className="w-4 h-4" />
                        View
                      </button>
                      <a
                        href={image.url}
                        download
                        className="px-3 py-2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-lg transition-all duration-200 flex items-center justify-center"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Corner Badge */}
              <div className="absolute top-3 right-3">
                <div className="px-2 py-1 bg-black/40 backdrop-blur-sm text-white text-xs rounded-md">
                  #{images.length - index}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="relative max-w-6xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Image */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.prompt}
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                <p className="text-white text-sm mb-3">{lightboxImage.prompt}</p>
                <a
                  href={lightboxImage.url}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Full Resolution
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

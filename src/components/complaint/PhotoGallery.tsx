import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { signedUrls, type AiDetection, type ComplaintImage } from "@/lib/complaints";
import { damageLabel } from "@/lib/constants";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function Boxes({ detections }: { detections: AiDetection[] }) {
  return (
    <>
      {detections.map((d) => {
        const b = d.bbox as { x1: number; y1: number; x2: number; y2: number };
        if (!d.image_width || !d.image_height) return null;
        const style = {
          left: `${(b.x1 / d.image_width) * 100}%`,
          top: `${(b.y1 / d.image_height) * 100}%`,
          width: `${((b.x2 - b.x1) / d.image_width) * 100}%`,
          height: `${((b.y2 - b.y1) / d.image_height) * 100}%`,
        };
        return (
          <div key={d.id} className="pointer-events-none absolute border-2 border-primary" style={style}>
            <span className="absolute -top-5 left-0 whitespace-nowrap rounded-sm bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {damageLabel(d.label)} {Math.round(d.confidence * 100)}%
            </span>
          </div>
        );
      })}
    </>
  );
}

export function PhotoGallery({
  images,
  detections = [],
  emptyText = "No photos uploaded.",
}: {
  images: ComplaintImage[];
  detections?: AiDetection[];
  emptyText?: string;
}) {
  const paths = images.map((i) => i.storage_path);
  const { data: urls = {}, isLoading, isError } = useQuery({
    queryKey: ["signed", ...paths],
    queryFn: () => signedUrls(paths),
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
  });
  const [open, setOpen] = useState<ComplaintImage | null>(null);

  if (images.length === 0)
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground">
        <ImageOff className="size-4" aria-hidden /> {emptyText}
      </div>
    );

  return (
    <>
      {isError ? <p className="mb-2 text-sm text-destructive">Photos could not be loaded.</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => {
          const url = urls[img.storage_path];
          const dets = detections.filter((d) => d.image_id === img.id);
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => url && setOpen(img)}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted"
              aria-label="Open photo"
            >
              {url ? (
                <>
                  <img src={url} alt="Road damage photo" loading="lazy" className="h-full w-full object-cover" />
                  {dets.length ? (
                    <span className="absolute bottom-1 left-1 rounded bg-foreground/80 px-1.5 text-[10px] font-semibold text-background">
                      {dets.length} detection{dets.length > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="grid h-full place-items-center text-xs text-muted-foreground">
                  {isLoading ? "Loading…" : "Unavailable"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl p-2 sm:p-3">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {open ? (
            <div className="relative">
              <img src={urls[open.storage_path]} alt="Road damage photo, full size" className="w-full rounded" />
              <Boxes detections={detections.filter((d) => d.image_id === open.id)} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

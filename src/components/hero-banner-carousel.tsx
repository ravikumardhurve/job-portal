"use client";

import { useState } from "react";
import Image from "next/image";

export function HeroBannerCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" role="group" aria-roledescription="carousel" aria-label="Company highlights">
      <Image key={images[index]} src={images[index]} alt="" fill priority={index === 0} sizes="(max-width: 1024px) 100vw, 46vw" unoptimized={images[index].startsWith("http")} className="object-cover" />
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`Show banner ${i + 1} of ${images.length}`} aria-pressed={i === index} className="grid h-8 w-8 place-items-center rounded-full"><span className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`} /></button>)}
        </div>
      )}
    </div>
  );
}

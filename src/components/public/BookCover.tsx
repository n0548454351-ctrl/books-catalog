"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
};

export default function BookCover({ src, alt, fill, className }: Props) {
  const [imgSrc, setImgSrc] = useState(src || "/placeholder-book.png");

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill}
      className={className}
      sizes="(max-width: 768px) 80vw, 320px"
      unoptimized
      onError={() => setImgSrc("/placeholder-book.png")}
    />
  );
}
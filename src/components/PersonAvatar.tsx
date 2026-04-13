"use client";

import Image from "next/image";
import { useState } from "react";
import type { Person } from "@/lib/types";
import { personIcon } from "./PersonCard";
import { personImageUrl } from "@/lib/api";

interface Props {
  person: Pick<Person, "id" | "sex" | "image_path">;
  size: number; // px — used for both width/height and font-size fallback
  className?: string;
  imageVersion?: number;
}

export default function PersonAvatar({ person, size, className = "", imageVersion }: Props) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !!person.image_path && !imgError;
  const imgSrc = `${personImageUrl(person.id)}${imageVersion ? `?v=${imageVersion}` : ""}`;

  if (hasImage) {
    return (
      <div
        className={`relative flex-shrink-0 rounded-full overflow-hidden bg-stone-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={imgSrc}
          alt=""
          fill
          className="object-cover"
          onError={() => setImgError(true)}
          sizes={`${size}px`}
          unoptimized
        />
      </div>
    );
  }

  return (
    <span
      className={`flex-shrink-0 flex items-center justify-center ${className}`}
      style={{ fontSize: size * 0.75, width: size, height: size }}
      role="img"
      aria-label={person.sex}
    >
      {personIcon(person.sex)}
    </span>
  );
}

import { type ImgHTMLAttributes, useEffect, useState } from "react";

import { requestBlob } from "@/shared/api/http";

type AuthenticatedImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  path: string;
};

export function AuthenticatedImage({
  alt,
  path,
  ...props
}: AuthenticatedImageProps) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;

    void requestBlob(path as `/${string}`)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        if (active) setSource(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!source) {
    return (
      <div
        className="image-placeholder"
        role="img"
        aria-label={`${alt} 불러오는 중`}
      />
    );
  }

  return <img {...props} alt={alt} src={source} />;
}

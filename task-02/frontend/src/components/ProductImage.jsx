import { useEffect, useState } from 'react';

export const FALLBACK_IMAGE = '/images/product-placeholder.svg';

export default function ProductImage({ src, alt, className, style }) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_IMAGE);

  useEffect(() => {
    setCurrentSrc(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt || 'Product'}
      className={className}
      style={style}
      onError={(event) => {
        event.currentTarget.onerror = null;
        setCurrentSrc(FALLBACK_IMAGE);
      }}
    />
  );
}

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  return (
    <img
      src="/brand/bina-insan-logo.svg"
      alt="Bina Insan Palu High School"
      className={`brand-logo ${compact ? "brand-logo-compact" : ""} ${className}`.trim()}
      draggable={false}
    />
  );
}

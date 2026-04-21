import Image from 'next/image';

export function FirasaLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'banner' }) {
  if (size === 'banner') {
    return (
      <div className="w-full flex justify-center">
        <Image
          src="/firasa-logo.png"
          alt="فِراسة — Firasa Trading Intelligence"
          width={800}
          height={360}
          className="object-contain w-full rounded-xl"
          style={{ maxWidth: '100%', height: 'auto' }}
          priority
        />
      </div>
    );
  }

  // sm = nav icons, md = loading screens
  const h = size === 'sm' ? 36 : 56;

  return (
    <Image
      src="/firasa-logo.png"
      alt="فِراسة — Firasa"
      width={Math.round(h * 2.22)}
      height={h}
      className="object-contain rounded-md"
      priority
    />
  );
}

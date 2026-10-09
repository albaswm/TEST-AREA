import Image from "next/image";

export default function Logo({ height = 34 }: { height?: number }) {
  return <Image src="/brand/logo-light.png" alt="Trills" width={Math.round(height * 3.99)} height={height} priority />;
}

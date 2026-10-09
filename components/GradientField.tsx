export default function GradientField({ variant = "sunset" }: { variant?: "sunset" | "dusk" }) {
  return (
    <div className={`gfield gfield-${variant}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

const cube = (
  <span className="cube" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

export default function Logo() {
  return (
    <>
      {cube}
      <span className="wordmark">Trills</span>
    </>
  );
}

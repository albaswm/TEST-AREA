import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span className="brand"><Logo /></span>
        <small>© {new Date().getFullYear()} Trills Produtora Audiovisual. Todos os direitos reservados.</small>
      </div>
    </footer>
  );
}

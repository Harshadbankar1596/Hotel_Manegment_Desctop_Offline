export function Btn({ children, onClick, primary = false, icon: Icon }) {
  return (
    <button className={primary ? "primary" : "btn"} onClick={onClick}>
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}

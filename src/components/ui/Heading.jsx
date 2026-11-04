export function Heading({ eyebrow, title, desc, action }) {
  const back = () => {
    if (window.history.length > 1) window.history.back();
    else location.hash = "#/dashboard";
  };
  return (
    <div className="heading">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      <div className="heading-tools">
        {action && <div className="actions">{action}</div>}
      </div>
    </div>
  );
}

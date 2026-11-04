export function Panel({ title, desc, children, action }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {desc && <p>{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

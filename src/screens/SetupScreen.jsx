import { Check, FolderOpen, Hotel } from "lucide-react";

export default function SetupScreen({ choose, setSetup, setup }) {
  return (
    <div className="setup">
      <div className="setup-card">
        <div className="logo">
          <Hotel />{" "}
          <b>Optimize</b>
        </div>
        <small>FIRST-TIME SETUP</small>
        <h1>
          Welcome to your
          <br />
          <em>new workspace.</em>
        </h1>
        <p>
          Choose a local folder to keep hotel settings, menu, active
          orders, and bills on your computer. No account or internet
          connection is required.
        </p>
        <div className="setup-list">
          <p>
            <Check /> Local JSON data storage
          </p>
          <p>
            <Check /> Table and menu management
          </p>
          <p>
            <Check /> Billing, receipts and reports
          </p>
        </div>
        <div className="setup-form">
          <label className="field-label">
            Hotel / restaurant name
            <input
              value={setup.name}
              maxLength={80}
              placeholder="e.g. Hotel Sunrise"
              onChange={(e) => setSetup({ ...setup, name: e.target.value })}
            />
          </label>
          <label className="field-label">
            GSTIN (optional)
            <input
              value={setup.gstin}
              maxLength={15}
              placeholder="15-character GSTIN"
              onChange={(e) => setSetup({ ...setup, gstin: e.target.value })}
            />
          </label>
          <label className="setup-check">
            <input type="checkbox" checked={setup.tax} onChange={(e) => setSetup({ ...setup, tax: e.target.checked })} />
            Charge GST on bills
            {setup.tax && (
              <>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={setup.rate}
                  onChange={(e) => setSetup({ ...setup, rate: e.target.value })}
                  aria-label="GST rate percent"
                />
                %
              </>
            )}
          </label>
          <small className="subtle">You can change all of this later in Settings.</small>
        </div>
        <button className="primary wide" onClick={choose}>
          <FolderOpen size={17} /> Choose data folder →
        </button>
        <small className="subtle">
          Offline-ready · Your data stays on this device
        </small>
      </div>
      <div className="setup-art">
        <span>YOUR DAILY OVERVIEW</span>
        <h2>
          A clearer view
          <br />
          of your business.
        </h2>
        <div className="fake-card">
          <small>Today's sales</small>
          <h2>₹24,580</h2>
          <span>↑ Your business, at a glance</span>
          <div className="bars">
            {[
              30, 50, 40, 65, 48, 85, 60, 96, 70, 52, 77, 88, 62, 100, 73, 57,
              81, 66, 91, 61,
            ].map((h, i) => (
              <i key={i} style={{ height: h + "%" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThankYou() {
  return (
    <div className="page" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 560, padding: "60px 8vw", textAlign: "center" }}>
        <p className="eyebrow">Thank You</p>
        <h1>We received your request.</h1>
        <p className="subhead" style={{ marginTop: 16 }}>
          Our team will review the details and get back to you shortly.
        </p>
        <a href="/" className="button" style={{ marginTop: 24 }}>
          Back to Home
        </a>
      </div>
    </div>
  );
}

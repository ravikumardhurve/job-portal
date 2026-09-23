import { ImageResponse } from "next/og";

export const alt = "CG Job Care - Jobs and trusted local services across Chhattisgarh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#0e3d31", color: "white", padding: "72px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", width: 430, height: 430, borderRadius: 999, background: "#157a4a", right: -80, top: -120, opacity: 0.75 }} />
      <div style={{ position: "absolute", width: 260, height: 260, borderRadius: 999, background: "#d4b04a", right: 110, bottom: -150, opacity: 0.55 }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", width: 82, height: 82, borderRadius: 22, alignItems: "center", justifyContent: "center", background: "#f4c95d", color: "#18382f", fontSize: 31, fontWeight: 900 }}>CG</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 800 }}>CG Job Care</span>
            <span style={{ marginTop: 6, color: "#cfe0d8", fontSize: 17, letterSpacing: 3 }}>JOBS &amp; FACILITY SERVICES</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}>
          <span style={{ color: "#ffe093", fontSize: 21, fontWeight: 800, letterSpacing: 2 }}>RAIPUR · CHHATTISGARH</span>
          <span style={{ marginTop: 22, fontSize: 65, lineHeight: 1.06, fontWeight: 900 }}>Jobs aur trusted local services, ek hi jagah.</span>
          <span style={{ marginTop: 25, color: "#d7e7e0", fontSize: 25 }}>Recruitment · Security · Baby Care · Housekeeping · Pest Control</span>
        </div>
      </div>
    </div>,
    size,
  );
}

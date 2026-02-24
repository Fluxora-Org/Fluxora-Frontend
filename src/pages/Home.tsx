import GetStartedCTA from "../components/GetStartedCTA";

export default function Home() {
  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "800px" }}>
        <GetStartedCTA />
      </div>
    </div>
  );
}

const SITE_VERSIYON = "v1.0.0";

document.addEventListener("DOMContentLoaded", () => {
    const rozet = document.createElement("div");
    rozet.id = "siteVersiyonRozeti";
    rozet.innerText = SITE_VERSIYON;

    Object.assign(rozet.style, {
        position: "fixed",
        bottom: "10px",
        left: "12px",
        zIndex: "9999",
        fontSize: "12px",
        fontWeight: "600",
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        color: "#e2e8f0",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        padding: "4px 10px",
        borderRadius: "6px",
        letterSpacing: "0.4px",
        pointerEvents: "none", // Altındaki butonlara (örn. Çıkış Yap) tıklamayı engellemez
        userSelect: "none"
    });

    document.body.appendChild(rozet);
});

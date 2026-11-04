export const readLogo = (file, kind = "logo") =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(Error("Please choose an image file"));
    if (file.size > 8 * 1024 * 1024) return reject(Error("Image is too large (max 8 MB)"));
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const max = 320;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const g = c.getContext("2d");
      if (kind === "photo") {
        g.fillStyle = "#fff";
        g.fillRect(0, 0, c.width, c.height);
      }
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(kind === "photo" ? c.toDataURL("image/jpeg", 0.82) : c.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Could not read this image"));
    };
    img.src = url;
  });

import { Utensils } from "lucide-react";

/* Soft, stable colour per dish so a menu without photos still looks friendly. */
const hueOf = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

export default function FoodThumb({ dish, size = "sm" }) {
  const hue = hueOf(dish?.name);
  const style = dish?.imageDataUrl
    ? undefined
    : { "--h": hue };
  return (
    <div className={"food-thumb " + size + (dish?.imageDataUrl ? "" : " no-photo")} style={style}>
      {dish?.imageDataUrl ? (
        <img src={dish.imageDataUrl} alt={dish.name || "Food"} loading="lazy" />
      ) : (
        <span>
          {size === "lg" ? (dish?.name || "?").trim().charAt(0).toUpperCase() : <Utensils size={16} />}
        </span>
      )}
    </div>
  );
}

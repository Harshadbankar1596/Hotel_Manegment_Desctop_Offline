import { Image } from "lucide-react";

const palettes = ["food-saffron", "food-rose", "food-green", "food-cream", "food-plum"];
export default function FoodThumb({ dish = {} }) {
  const seed = String(dish.id || dish.name || "dish").split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  const palette = palettes[seed % palettes.length];
  const name = String(dish.name || "").toLowerCase();
  const icon = name.includes("paneer") || name.includes("tikka") ? "🍢" : name.includes("biryani") || name.includes("rice") ? "🍛" : name.includes("pizza") ? "🍕" : name.includes("burger") ? "🍔" : name.includes("tea") || name.includes("coffee") ? "☕" : name.includes("salad") ? "🥗" : name.includes("cake") || name.includes("sweet") ? "🍰" : "🍽️";
  return <span className={`food-thumb ${palette}`} aria-label={`${dish.name || "Dish"} image`}><span>{icon}</span></span>;
}

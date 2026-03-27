import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
}

export function StarRating({ rating, max = 5, size = 16, className }: StarRatingProps) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= Math.floor(rating);
        const half = !filled && i + 0.5 < rating;
        return (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              "flex-shrink-0",
              filled || half ? "text-amber-400 fill-amber-400" : "text-gray-300 fill-gray-100"
            )}
          />
        );
      })}
    </span>
  );
}

interface InteractiveStarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  className?: string;
}

export function InteractiveStarRating({ value, onChange, size = 28, className }: InteractiveStarRatingProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="focus:outline-none transition-transform hover:scale-110"
          aria-label={`${i + 1} estrellas`}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              i < value ? "text-amber-400 fill-amber-400" : "text-gray-300 fill-gray-100",
              "transition-colors"
            )}
          />
        </button>
      ))}
    </span>
  );
}

import type { IconType } from "react-icons";
import { BiCoffeeTogo, BiSolidCoffeeTogo } from "react-icons/bi";
import { IoRestaurant, IoRestaurantOutline } from "react-icons/io5";
import {
  PiBread,
  PiBreadFill,
  PiSquaresFour,
  PiSquaresFourFill,
} from "react-icons/pi";

export type Category = {
  id: string;
  label: string;
  /** Outline icon, shown when the category isn't selected. */
  icon: IconType;
  /** Filled icon, shown when the category is selected. */
  activeIcon: IconType;
};

// The order here is the order in the side navigation.
export const categories: Category[] = [
  { id: "all", label: "All", icon: PiSquaresFour, activeIcon: PiSquaresFourFill },
  { id: "coffee", label: "Coffee", icon: BiCoffeeTogo, activeIcon: BiSolidCoffeeTogo },
  { id: "sides", label: "Sides", icon: PiBread, activeIcon: PiBreadFill },
  { id: "pasta", label: "Pasta", icon: IoRestaurantOutline, activeIcon: IoRestaurant },
];

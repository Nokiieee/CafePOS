export type MenuItem = {
  id: string;
  name: string;
  /** Matches a category id in categories.ts. */
  categoryId: string;
  /** Path inside /public, so "/menu/coffee/iced-latte.png" is public/menu/coffee/iced-latte.png. */
  image: string;
};

// The menu, in the order it appears on screen. Prices come later.
export const menuItems: MenuItem[] = [
  // Coffee
  { id: "iced-latte", name: "Iced Latte", categoryId: "coffee", image: "/menu/coffee/iced-latte.png" },
  { id: "caramel-macchiato", name: "Caramel Macchiato", categoryId: "coffee", image: "/menu/coffee/caramel-macchiato.png" },
  { id: "iced-mocha", name: "Iced Mocha", categoryId: "coffee", image: "/menu/coffee/iced-mocha.png" },
  { id: "iced-long-black", name: "Iced Long Black", categoryId: "coffee", image: "/menu/coffee/iced-long-black.png" },
  { id: "cold-brew", name: "Cold Brew", categoryId: "coffee", image: "/menu/coffee/cold-brew.png" },
  { id: "vanilla-cream-cold-brew", name: "Vanilla Cream Cold Brew", categoryId: "coffee", image: "/menu/coffee/vanilla-cream-cold-brew.png" },

  // Sides
  { id: "fries", name: "Fries", categoryId: "sides", image: "/menu/sides/fries.png" },
  { id: "banana-bread", name: "Banana Bread", categoryId: "sides", image: "/menu/sides/banana-bread.png" },

  // Pasta
  { id: "spaghetti-bolognese", name: "Spaghetti Bolognese", categoryId: "pasta", image: "/menu/pasta/spaghetti-bolognese.png" },
  { id: "chicken-mushroom-penne", name: "Chicken Mushroom Penne", categoryId: "pasta", image: "/menu/pasta/chicken-mushroom-penne.png" },
];

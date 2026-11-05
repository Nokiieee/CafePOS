export type MenuItem = {
  id: string;
  name: string;
  /** Matches a category id in categories.ts. */
  categoryId: string;
  /** Price in cents, so 650 is $6.50. Whole numbers avoid rounding errors. */
  price: number;
  /** Path inside /public, so "/menu/coffee/iced-latte.png" is public/menu/coffee/iced-latte.png. */
  image: string;
};

// The menu, in the order it appears on screen.
export const menuItems: MenuItem[] = [
  // Coffee
  { id: "iced-latte", name: "Iced Latte", categoryId: "coffee", price: 600, image: "/menu/coffee/iced-latte.png" },
  { id: "caramel-macchiato", name: "Caramel Macchiato", categoryId: "coffee", price: 650, image: "/menu/coffee/caramel-macchiato.png" },
  { id: "iced-mocha", name: "Iced Mocha", categoryId: "coffee", price: 650, image: "/menu/coffee/iced-mocha.png" },
  { id: "iced-long-black", name: "Iced Long Black", categoryId: "coffee", price: 550, image: "/menu/coffee/iced-long-black.png" },
  { id: "cold-brew", name: "Cold Brew", categoryId: "coffee", price: 600, image: "/menu/coffee/cold-brew.png" },
  { id: "vanilla-cream-cold-brew", name: "Vanilla Cream Cold Brew", categoryId: "coffee", price: 675, image: "/menu/coffee/vanilla-cream-cold-brew.png" },

  // Sides
  { id: "fries", name: "Fries", categoryId: "sides", price: 450, image: "/menu/sides/fries.png" },
  { id: "banana-bread", name: "Banana Bread", categoryId: "sides", price: 400, image: "/menu/sides/banana-bread.png" },

  // Pasta
  { id: "spaghetti-bolognese", name: "Spaghetti Bolognese", categoryId: "pasta", price: 1200, image: "/menu/pasta/spaghetti-bolognese.png" },
  { id: "chicken-mushroom-penne", name: "Chicken Mushroom Penne", categoryId: "pasta", price: 1300, image: "/menu/pasta/chicken-mushroom-penne.png" },
];

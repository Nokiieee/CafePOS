export type MenuItem = {
  id: string;
  name: string;
  /** One short sentence shown in the item's options popup. */
  description: string;
  /** Matches a category id in categories.ts. */
  categoryId: string;
  /** Price in cents, so 650 is $6.50. Whole numbers avoid rounding errors. For drinks, this is the Medium price. */
  price: number;
  /** Path inside /public, so "/menu/coffee/iced-latte.png" is public/menu/coffee/iced-latte.png. */
  image: string;
};

// The menu, in the order it appears on screen.
export const menuItems: MenuItem[] = [
  // Coffee
  {
    id: "iced-latte",
    name: "Iced Latte",
    description: "Espresso and cold milk poured over ice.",
    categoryId: "coffee",
    price: 600,
    image: "/menu/coffee/iced-latte.png",
  },
  {
    id: "iced-hazelnut-latte",
    name: "Iced Hazelnut Latte",
    description: "Espresso, hazelnut syrup and cold milk over ice.",
    categoryId: "coffee",
    price: 650,
    image: "/menu/coffee/iced-hazelnut-latte.png",
  },
  {
    id: "iced-honey-oat-latte",
    name: "Iced Honey Oat Latte",
    description: "Espresso and oat milk sweetened with honey, over ice.",
    categoryId: "coffee",
    price: 675,
    image: "/menu/coffee/iced-honey-oat-latte.png",
  },
  {
    id: "caramel-macchiato",
    name: "Caramel Macchiato",
    description: "Vanilla milk and espresso over ice, finished with caramel drizzle.",
    categoryId: "coffee",
    price: 650,
    image: "/menu/coffee/caramel-macchiato.png",
  },
  {
    id: "iced-mocha",
    name: "Iced Mocha",
    description: "Espresso, chocolate sauce and milk over ice.",
    categoryId: "coffee",
    price: 650,
    image: "/menu/coffee/iced-mocha.png",
  },
  {
    id: "iced-americano",
    name: "Iced Americano",
    description: "Espresso topped with cold water and ice.",
    categoryId: "coffee",
    price: 500,
    image: "/menu/coffee/iced-americano.png",
  },
  {
    id: "iced-long-black",
    name: "Iced Long Black",
    description: "A double shot of espresso over cold water and ice.",
    categoryId: "coffee",
    price: 550,
    image: "/menu/coffee/iced-long-black.png",
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    description: "Coffee steeped cold for hours, smooth and low in bitterness.",
    categoryId: "coffee",
    price: 600,
    image: "/menu/coffee/cold-brew.png",
  },
  {
    id: "vanilla-cream-cold-brew",
    name: "Vanilla Cream Cold Brew",
    description: "Cold brew topped with sweet vanilla cream.",
    categoryId: "coffee",
    price: 675,
    image: "/menu/coffee/vanilla-cream-cold-brew.png",
  },

  // Sides
  {
    id: "fries",
    name: "Fries",
    description: "Crispy golden fries, lightly salted.",
    categoryId: "sides",
    price: 450,
    image: "/menu/sides/fries.png",
  },
  {
    id: "onion-rings",
    name: "Onion Rings",
    description: "Thick onion rings in a crunchy golden batter.",
    categoryId: "sides",
    price: 500,
    image: "/menu/sides/onion-rings.png",
  },
  {
    id: "cheesy-garlic-bread",
    name: "Cheesy Garlic Bread",
    description: "Toasted garlic butter bread under melted cheese.",
    categoryId: "sides",
    price: 500,
    image: "/menu/sides/cheesy-garlic-bread.png",
  },
  {
    id: "banana-bread",
    name: "Banana Bread",
    description: "A thick, moist slice of banana bread.",
    categoryId: "sides",
    price: 400,
    image: "/menu/sides/banana-bread.png",
  },

  // Pasta
  {
    id: "spaghetti-bolognese",
    name: "Spaghetti Bolognese",
    description: "Spaghetti in a rich beef and tomato sauce, topped with parmesan.",
    categoryId: "pasta",
    price: 1200,
    image: "/menu/pasta/spaghetti-bolognese.png",
  },
  {
    id: "chicken-mushroom-penne",
    name: "Chicken Mushroom Penne",
    description: "Penne with chicken and mushrooms in a creamy sauce.",
    categoryId: "pasta",
    price: 1300,
    image: "/menu/pasta/chicken-mushroom-penne.png",
  },
  {
    id: "aglio-e-olio",
    name: "Aglio e Olio",
    description: "Spaghetti tossed in olive oil, garlic and chili flakes.",
    categoryId: "pasta",
    price: 1050,
    image: "/menu/pasta/aglio-e-olio.png",
  },
  {
    id: "baked-mac-cheese",
    name: "Baked Mac & Cheese",
    description: "Macaroni in a creamy cheese sauce, baked until golden on top.",
    categoryId: "pasta",
    price: 1150,
    image: "/menu/pasta/baked-mac-cheese.png",
  },
];

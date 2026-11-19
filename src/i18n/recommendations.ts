import { defineMessages } from "./define";

export const recommendations = defineMessages(
  {
    boughtTogetherTitle: "Frequently bought together",
    boughtTogetherDescription: "Customers who bought this product also took these.",
    thisItem: "This item",
    include: (name: string) => `Include ${name}`,
    addSelected: (count: number) => (count === 1 ? "Add 1 item to cart" : `Add ${count} items to cart`),
    chooseOptions: "Choose options",
    cartTitle: "Complete your order",
    bestSellersTitle: "Best sellers",
    add: (name: string) => `Add ${name} to cart`,
  },
  {
    "pt-BR": {
      boughtTogetherTitle: "Compre junto",
      boughtTogetherDescription: "Quem comprou este produto também levou estes.",
      thisItem: "Este produto",
      include: (name: string) => `Incluir ${name}`,
      addSelected: (count: number) =>
        count === 1 ? "Adicionar 1 item ao carrinho" : `Adicionar ${count} itens ao carrinho`,
      chooseOptions: "Escolher opções",
      cartTitle: "Complete seu pedido",
      bestSellersTitle: "Mais vendidos",
      add: (name: string) => `Adicionar ${name} ao carrinho`,
    },
    es: {
      boughtTogetherTitle: "Comprados juntos con frecuencia",
      boughtTogetherDescription: "Quienes compraron este producto también llevaron estos.",
      thisItem: "Este producto",
      include: (name: string) => `Incluir ${name}`,
      addSelected: (count: number) =>
        count === 1 ? "Agregar 1 artículo al carrito" : `Agregar ${count} artículos al carrito`,
      chooseOptions: "Elegir opciones",
      cartTitle: "Completa tu pedido",
      bestSellersTitle: "Más vendidos",
      add: (name: string) => `Agregar ${name} al carrito`,
    },
  },
);

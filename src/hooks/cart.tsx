import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-community/async-storage';

interface Product {
  id: string;
  title: string;
  image_url: string;
  price: number;
  quantity: number;
}

interface CartContext {
  products: Product[];
  addToCart(item: Omit<Product, 'quantity'>): void;
  increment(id: string): void;
  decrement(id: string): void;
}

const CartContext = createContext<CartContext | null>(null);

const CartProvider: React.FC = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  const loadProducts = async (): Promise<void> => {
    const cartProductsId = await AsyncStorage.getAllKeys();

    if (!cartProductsId) {
      return;
    }

    const cartProducts = await AsyncStorage.multiGet(cartProductsId);

    const cartProductsParsed = cartProducts.map(cartProduct => {
      const [, cartProductData] = cartProduct;

      return cartProductData ? JSON.parse(cartProductData) : undefined;
    });

    setProducts(cartProductsParsed.filter(cartProduct => !!cartProduct));
  };

  const getProduct = async (id: string): Promise<Product | null> => {
    const product = await AsyncStorage.getItem(id);

    return product ? JSON.parse(product) : null;
  };

  const updateCart = (product: Product): Promise<void> => {
    if (product.quantity && product.quantity > 0) {
      return AsyncStorage.mergeItem(product.id, JSON.stringify(product));
    }

    if (!product.quantity || product.quantity === 0) {
      return AsyncStorage.removeItem(product.id);
    }

    return Promise.resolve();
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addToCart = useCallback(async product => {
    const cartProduct = await getProduct(product.id);

    if (!cartProduct) {
      const cartProductToAdd = {
        ...product,
        quantity: 1,
      };

      await AsyncStorage.setItem(
        cartProductToAdd.id,
        JSON.stringify(cartProductToAdd),
      );
    } else {
      cartProduct.quantity += 1;

      await updateCart(cartProduct);
    }

    loadProducts();
  }, []);

  const increment = useCallback(async id => {
    const cartProduct = await getProduct(id);

    if (cartProduct) {
      cartProduct.quantity += 1;

      await updateCart(cartProduct);
      loadProducts();
    }
  }, []);

  const decrement = useCallback(async id => {
    const cartProduct = await getProduct(id);

    if (cartProduct) {
      cartProduct.quantity -= 1;

      await updateCart(cartProduct);
      loadProducts();
    }
  }, []);

  const value = React.useMemo(
    () => ({ addToCart, increment, decrement, products }),
    [products, addToCart, increment, decrement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

function useCart(): CartContext {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(`useCart must be used within a CartProvider`);
  }

  return context;
}

export { CartProvider, useCart };

const ecommerceDataDefaultValue = {
    ecommerce: {
        value: 0,
        currency: 'IDR',
        items: [],
    }
}
let ga4EcommerceDataPDP = {...ecommerceDataDefaultValue};
let ga4EcommerceDataCart = {...ecommerceDataDefaultValue};
let ga4EcommerceDataDeletedCart = {...ecommerceDataDefaultValue};

const GA_TYPE = {
    PDP: 'PDP',
    CART: 'CART',
    DELETE_CART: 'DELETE_CART',
}

function unEscape(text = '') {
    let unEscapeText = text.replace(/&lt;/g, "<");
    unEscapeText = unEscapeText.replace(/&gt;/g, ">");
    unEscapeText = unEscapeText.replace(/&quot;/g, "\"");
    unEscapeText = unEscapeText.replace(/&#39;/g, "\'");
    unEscapeText = unEscapeText.replace(/&amp;/g, "&");
    return unEscapeText;
}

const reformatCollections = (collections = []) => {
    const filter = ["All", "All Collections"];
    return collections.filter((item,) => !filter.includes(item)).slice(0, 4).map((item, currentIndex) => ({
        key: `item_category${currentIndex + 2}`,
        value: item,
    })).reduce((obj, item, currentIndex) => {
        return {
            ...obj,
            [item.key]: unEscape(item.value),
        };
    }, {});
}
const reformatItems = (items = []) => {
    return items.map((item, index) => {
        const price = Number(item?.price || 0);
        const comparedAtPrice = Number(item?.compare_at_price || 0);
        let discount = 0;
        if (comparedAtPrice > 0) {
            discount = (comparedAtPrice * 0.01) - (price * 0.01)
        }

        const datum = {
            item_id: item?.item_id || '',
            item_name: item?.item_name || '',
            discount,
            index: item?.index || index,
            item_brand: item?.item_brand || '',
            item_category: item?.item_category || '',
            item_list_id: item?.item_list_id || '',
            item_list_name: item?.item_list_name || '',
            item_variant: item?.item_variant || '',
            location_id: item?.location_id || item?.location_id || '',
            price: item?.price || 0,
            quantity: item?.quantity || 0,
            compare_at_price: item?.compare_at_price || 0,
            collections: item?.collections || [],
        }
        const newCollections = reformatCollections(datum?.collections);
        const {collections, compare_at_price, ...rest} = datum;
        if (rest.item_variant === 'Default Title') {
            rest.item_variant = '';
        }
        return {
            ...rest,
            ...newCollections,
            item_name: unEscape(rest.item_name),
            item_brand: unEscape(rest.item_brand),
            item_variant: unEscape(rest.item_variant),
            price: Number(datum.price) * 0.01,
            quantity: Number(datum.quantity),
        }
    });
}

function sendToGA4Ecommerce(event, type = GA_TYPE.PDP) {
    let data;
    switch (type) {
        case GA_TYPE.PDP:
            data = ga4EcommerceDataPDP;
            break;
        case GA_TYPE.DELETE_CART:
            data = ga4EcommerceDataDeletedCart;
            break;
        case GA_TYPE.CART:
        default:
            data = ga4EcommerceDataCart;
            break;

    }
    dataLayer.push({'ecommerce': null});
    dataLayer.push({event, ...data});
    console.log('dataLayer', dataLayer);
}

const updateGa4PDP = () => {
    const item = ecommerceItems;
    if (Object.keys(item).length === 0) return false;
    const newItem = reformatItems([item]);
    ga4EcommerceDataPDP = {
        ecommerce: {
            ...ga4EcommerceDataPDP.ecommerce,
            items: newItem,
            value: newItem[0].price,
        }
    }
};

const onChangeVariantPDP = (updatedItem) => {
    const item = ga4EcommerceDataPDP.ecommerce.items[0];
    updatedItem.collections = ecommerceItems.collections;
    if (Object.keys(item).length === 0) return false;
    const appendItem = {...item, ...updatedItem};
    const newItem = reformatItems([appendItem]);
    ga4EcommerceDataPDP = {
        ecommerce: {
            ...ga4EcommerceDataPDP.ecommerce,
            items: newItem,
            value: newItem[0].price,
        }
    }
};

const updateGa4Cart = () => {
    ga4EcommerceDataCart = {
        ecommerce: {
            ...ga4EcommerceDataCart.ecommerce,
            items: reformatItems(ecommerceCartItems),
            value: totalPriceCart * 0.01,
        }
    };
}

const addToCartGa4PDP = ({quantity = 0}) => {
    let qty = Number(quantity);
    const item = ga4EcommerceDataPDP.ecommerce.items[0];
    const cartItems = [...ga4EcommerceDataCart.ecommerce.items];
    let newItem = {
        ...item,
        quantity: qty,
    }
    ga4EcommerceDataPDP.ecommerce.items[0] = newItem;
    //cart handler
    const getIndexCart = cartItems.findIndex(cartItem => (cartItem.item_id === newItem.item_id));
    if (getIndexCart >= 0) {
        cartItems[getIndexCart] = {...cartItems[getIndexCart], ...newItem};
    } else {
        ga4EcommerceDataCart.ecommerce.items.unshift(newItem);
        ga4EcommerceDataCart.ecommerce.items = ga4EcommerceDataCart.ecommerce.items.map((item, index) => ({
            ...item,
            index,
        }))
    }
}

function navbarDeleteCart(index) {
    const item = ga4EcommerceDataCart.ecommerce.items[index];
    ga4EcommerceDataDeletedCart = {
        ecommerce: {
            ...ga4EcommerceDataCart.ecommerce,
            items: [item],
            value: item.price,
        }
    }
    sendToGA4Ecommerce('remove_from_cart', GA_TYPE.DELETE_CART);
    ga4EcommerceDataCart = {
        ecommerce: {
            ...ga4EcommerceDataCart.ecommerce,
            items: ga4EcommerceDataCart.ecommerce.items.filter((data, i) => index !== i),
            value: item.price,
        }
    }
    ga4EcommerceDataDeletedCart = {
        ecommerce: {
            ...ecommerceDataDefaultValue,
            value: 0,
            items: [],
        }
    };
}

function cartUpdateData(response) {
    const cartItems = response.items;
    const price = response.total_price * 0.01;
    let items = ecommerceCartItems.map((item, index) => {
        return {
            ...item,
            quantity: cartItems[index].quantity
        }
    });

    items = reformatItems(items);
    ga4EcommerceDataCart = {
        ecommerce: {
            ...ga4EcommerceDataCart.ecommerce,
            items: items,
            value: price,
        }
    }
}

function cartUpdateDeleteData(response, index) {
    debugger;
    const cartItems = response.items_removed;
    const price = response.total_price * 0.01;
    const item = ga4EcommerceDataCart.ecommerce.items[index];
    item.quantity = cartItems[0].quantity;
    ga4EcommerceDataDeletedCart = {
        ecommerce: {
            ...ga4EcommerceDataCart.ecommerce,
            items: [item],
            value: price,
        }
    }
    sendToGA4Ecommerce('remove_from_cart', GA_TYPE.DELETE_CART);
    ga4EcommerceDataCart = {
        ecommerce: {
            ...ga4EcommerceDataCart.ecommerce,
            items: ga4EcommerceDataCart.ecommerce.items.filter((data, i) => index !== i),
            value: price,
        }
    }
    ga4EcommerceDataDeletedCart = {
        ecommerce: {
            ...ecommerceDataDefaultValue,
            value: 0,
            items: [],
        }
    };
}
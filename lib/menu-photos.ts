import { createHash } from 'crypto'

// Admin-uploaded menu photos that have a cream-background studio edit in /public/menu-photos.
// Each edit is keyed by a fingerprint of the original upload, so replacing a photo in admin
// shows the new upload instead of the old edit.
const editedPhotos = new Set([
  'b153c22c60f6a21307fe', // Americano
  'd032ddad6535467e744a', // Apple - Medium
  '28339fdac22c8559d362', // Avocado
  'fcc1893a282fe63e7328', // Avocado - Large
  'a8ff1e0b0492b08f0ee8', // Avocado - Medium
  '2b6129e74a5f5a2ed736', // Big Cheesecake serves 12 person
  'd1a894d3e115f3b798f4', // Blue Hawaii
  '093417e3ec3abd3594ef', // Cappuccino
  '9bac85ae4c27987cb58d', // Caramel
  '5b15f3f9247045bd3732', // Caramel Latte
  '432a8c7b29c1213577b9', // Carrot - Medium
  'bec753e7508acffbd17e', // cheese cake
  '8ff6cd391e58d6081703', // Cocktail Pieces - Large
  'dca065c0d1cb2cd27d59', // Cocktail Pieces - Medium
  '459e3e159c448d9e82f4', // Cocktaillo
  'da5bc0da3dcbc9719abc', // Coctail L
  '2de13694343c1c728516', // Crepe - Chocolate
  '91081cda918e29ea6cac', // Crepe - Kinder
  '8a0735e76c6a41294aaf', // Crepe - Lotus
  '52b8779099835b87bd5a', // Crepe - Nutella
  '7728775923c84b0de954', // Crepe - Pistachio
  '322ea94dced8187ce2dc', // Crepe - White Chocolate
  '9eff2d6e5e5818863fb2', // cup chocolatmou L
  '1abb8c4a3bcb01858795', // cup chocolatmou M
  '3a66df229f676041d7d6', // Custard
  '575743f62c89350168aa', // Energy Drink
  'd9467276ea3dfd96f743', // Espresso
  '8f79d89c4f2c6fc63048', // Fettuccine Crepe
  'd42b1908adbb6555aaa7', // Fruit Salad M
  '36086c7137d35524d7fd', // Fruit Salad with Nutella
  '377b7c548f652905f3b0', // Hot Chocolate
  'ef11dc0a24f35eb647cb', // Iced Americano
  '2f8ec9b258de369b5b98', // Iced Coffee
  '569492bcd7cdf6fc75fc', // Iced Mocha
  '8533341f2abe2353dcd7', // Jalapeño Bites (4 pcs)
  '765b8dfa0bf570684896', // Jamaika
  '2f8429b1389cfc6ffa04', // Jelly
  '9c088d9378ba07bb9a5e', // Kinder
  '70d28ba73459ef74526e', // Lemonade - Medium
  '7e68ffe4614bd39664be', // Mango - Medium
  '700eea67d144f00d2582', // Minted Lemonade - Medium
  '90191cb7f5892c6c84f1', // Nescafe
  'a4499377bb853e0c50f3', // Orange - Large
  '2c235de07d8ce7069a2d', // Orange - Medium
  'f81602e338d5b6ddb929', // Pancake 12 pcs - Chocolate
  '35b8485c4b066d85b941', // Pancake 12 pcs - Lotus
  'e927968506715ddd2d69', // Pancake 12 pcs - Mix
  '7db692cefa74c7d1ac32', // Pancake 6 pcs - Chocolate
  '92dde2d4a65e5ad94d71', // Pancake 6 pcs - Lotus
  '8dfd0267c961c223ae75', // Pancake 6 pcs - Nutella
  '1ed15ece861f7e527b03', // Pancake 6 pcs - Pistachio
  '3f81ef021abb5683f8c3', // Pineapple - Medium
  '97e339d4a5e87ba5d489', // Snickers
  '8dca512aaf870ebee6e1', // Sparkling Water
  '5874ee119e29c8bec4d1', // Sparkling Water Bottle
  'f2e91b6c43d6d19fcacd', // Special Fettuccine Crepe
  '7bc120538f8bf2dfed14', // Strawberry
  '6e65b134c6daa5a7ee2b', // Strawberry & Banana - Large
  '599a22f2176c14a886a5', // Strawberry - Large
  '514d577d79ab33b4becc', // Strawberry - Medium
  'a6581126e3c00971f1c7', // Sushi Crepe
  '9338b16dff5e2e13abff', // Waffle - Chocolate
  '8d84bb68dec5a56d7b31', // Waffle - Kinder
  '2102096e6dcb545ee984', // Waffle - Lotus
  'ad48ec1b09f1c082ac9c', // Waffle - Nutella
  'a22a579a3a36356973b7', // Waffle - Oreo
  '32af2102dcf05075770c', // Waffle - Pistachio
  'f18a6025b80f11b250cd', // Waffle - White Chocolate
])

// Items without their own upload: a size or close flavour of a Cocktaillo photo, or a
// public-domain placeholder (see /public/menu-photos/CREDITS.txt). Any admin upload wins.
const sharedPhotos: Record<string, string> = {
  'anise': 'stock-tea', // Anise
  'apple l': 'd032ddad6535467e744a', // Apple L
  'apple large': 'd032ddad6535467e744a', // Apple - Large
  'apple m': 'd032ddad6535467e744a', // Apple M
  'avocado strawberry banana large': 'fcc1893a282fe63e7328', // Avocado Strawberry & Banana - Large
  'avocado strawberry banana medium': 'a8ff1e0b0492b08f0ee8', // Avocado Strawberry & Banana - Medium
  'beef mozzarella': 'stock-beef-burger', // Beef Mozzarella
  'caesar salad': 'stock-caesar', // Caesar Salad
  'carrot l': '432a8c7b29c1213577b9', // Carrot L
  'carrot large': '432a8c7b29c1213577b9', // Carrot - Large
  'carrot m': '432a8c7b29c1213577b9', // Carrot M
  'chamomile': 'stock-tea', // Chamomile
  'chicken caesar salad': 'stock-caesar', // Chicken Caesar Salad
  'chicken mozzarella': 'stock-crispy-sandwich', // Chicken Mozzarella
  'chicken sub': 'stock-fajita-wrap2', // Chicken Sub
  'classic': 'stock-mojito', // Classic
  'cocktaillo burger': 'stock-crispy-sandwich', // Cocktaillo Burger
  'cocktaillo pasta': 'stock-pink-pasta2', // Cocktaillo Pasta
  'coctail m': 'da5bc0da3dcbc9719abc', // Coctail M
  'crepe belgian chocolate': '2de13694343c1c728516', // Crepe - Belgian Chocolate
  'crepe dark chocolate': '2de13694343c1c728516', // Crepe - Dark Chocolate
  'crepe ferrero': '52b8779099835b87bd5a', // Crepe - Ferrero
  'crispy': 'stock-fajita-wrap2', // Crispy
  'crispy plate': 'stock-tenders', // Crispy Plate
  'cup fruit slide l': '8ff6cd391e58d6081703', // Cup fruit slide L
  'cup fruit slide m': 'dca065c0d1cb2cd27d59', // Cup fruit slide M
  'curly fries': 'stock-curly-fries', // Curly Fries
  'double espresso': 'd9467276ea3dfd96f743', // Double Espresso
  'energy red': 'stock-red-drink', // Energy Red
  'fahita': 'stock-fajita-wrap2', // Fahita
  'frappuccino': '9bac85ae4c27987cb58d', // Frappuccino
  'fruit salad with cream honey nuts': 'd42b1908adbb6555aaa7', // Fruit Salad with Cream, Honey & Nuts
  'fruit salad with nuts': 'd42b1908adbb6555aaa7', // Fruit Salad with Nuts
  'fruite salad l': 'd42b1908adbb6555aaa7', // fruite salad L
  'green energy': 'stock-pistachio-shake2', // Green Energy
  'green tea': 'stock-tea', // Green Tea
  'herbal tea': 'stock-tea', // Herbal Tea
  'ice cream 1 2 kg': 'ice-cream-display', // Ice Cream 1/2 kg
  'ice cream 1 kg': 'ice-cream-display', // Ice Cream 1 kg
  'iced caramel': '2f8ec9b258de369b5b98', // Iced Caramel
  'iced latte': '2f8ec9b258de369b5b98', // Iced Latte
  'iced spanish latte': '2f8ec9b258de369b5b98', // Iced Spanish Latte
  'latte': '5b15f3f9247045bd3732', // Latte
  'lebanese burger': 'stock-beef-burger', // Lebanese Burger
  'lemonade l': '70d28ba73459ef74526e', // Lemonade L
  'lemonade large': '70d28ba73459ef74526e', // Lemonade - Large
  'lemonade m': '70d28ba73459ef74526e', // Lemonade M
  'lotus s': '8a0735e76c6a41294aaf', // Lotus’s
  'lungo': 'b153c22c60f6a21307fe', // Lungo
  'macchiato': 'stock-macchiato', // Macchiato
  'mango l': '7e68ffe4614bd39664be', // Mango L
  'mango large': '7e68ffe4614bd39664be', // Mango - Large
  'mango m': '7e68ffe4614bd39664be', // Mango M
  'minted lemonade large': '700eea67d144f00d2582', // Minted Lemonade - Large
  'minted lemone l': '700eea67d144f00d2582', // minted lemone l
  'minted lemoned m': '700eea67d144f00d2582', // minted lemoned m
  'mozzarella sticks 4 pcs': 'stock-mozzarella-sticks', // Mozzarella Sticks (4 pcs)
  'orange l': '2c235de07d8ce7069a2d', // Orange L
  'orange m': '2c235de07d8ce7069a2d', // Orange M
  'pancake 12 pcs belgian chocolate': 'f81602e338d5b6ddb929', // Pancake 12 pcs - Belgian Chocolate
  'pancake 12 pcs dark chocolate': 'f81602e338d5b6ddb929', // Pancake 12 pcs - Dark Chocolate
  'pancake 12 pcs ferrero': 'f81602e338d5b6ddb929', // Pancake 12 pcs - Ferrero
  'pancake 12 pcs nutella': 'f81602e338d5b6ddb929', // Pancake 12 pcs - Nutella
  'pancake 12 pcs pistachio': '1ed15ece861f7e527b03', // Pancake 12 pcs - Pistachio
  'pancake 6 pcs belgian chocolate': '7db692cefa74c7d1ac32', // Pancake 6 pcs - Belgian Chocolate
  'pancake 6 pcs dark chocolate': '7db692cefa74c7d1ac32', // Pancake 6 pcs - Dark Chocolate
  'pancake 6 pcs ferrero': '8dfd0267c961c223ae75', // Pancake 6 pcs - Ferrero
  'pineapple large': '3f81ef021abb5683f8c3', // Pineapple - Large
  'pistachio': 'stock-pistachio-shake2', // Pistachio
  'plate fruits': 'd42b1908adbb6555aaa7', // Plate fruits
  'pomegranate': 'stock-red-drink', // Pomegranate
  'red house': 'stock-red-drink', // Red House
  'ristretto': 'd9467276ea3dfd96f743', // Ristretto
  'royal berry': 'stock-red-drink', // Royal Berry
  'smashed burger': 'stock-smash-burger2', // Smashed Burger
  'sparkling water bottle bottle': '5874ee119e29c8bec4d1', // Sparkling Water Bottle - Bottle
  'sparkling water regular': '8dca512aaf870ebee6e1', // Sparkling Water - Regular
  'spicy fahita': 'stock-fajita-wrap2', // Spicy Fahita
  'strawberry banana medium': '6e65b134c6daa5a7ee2b', // Strawberry & Banana - Medium
  'strawberry l': '514d577d79ab33b4becc', // Strawberry L
  'strawberry m': '514d577d79ab33b4becc', // Strawberry M
  'swiss mushroom burger': 'stock-smash-burger2', // Swiss Mushroom Burger
  'tea': 'stock-tea', // Tea
  'twister': 'stock-fajita-wrap2', // Twister
  'vanilla latte': '5b15f3f9247045bd3732', // Vanilla Latte
  'waffle belgian chocolate': '9338b16dff5e2e13abff', // Waffle - Belgian Chocolate
  'waffle dark chocolate': '9338b16dff5e2e13abff', // Waffle - Dark Chocolate
  'waffle ferrero': 'ad48ec1b09f1c082ac9c', // Waffle - Ferrero
  'watermelon large': 'stock-watermelon-juice', // Watermelon - Large
  'watermelon medium': 'stock-watermelon-juice', // Watermelon - Medium
  'wedges': 'stock-wedges', // Wedges
  'zinger': 'stock-crispy-sandwich', // Zinger
  'banana milk large': 'stock-banana-milk2', // Banana & Milk - Large
  'banana milk medium': 'stock-banana-milk2', // Banana & Milk - Medium
  'blue strawberry': 'd1a894d3e115f3b798f4', // Blue Strawberry
  'blueberry': 'd1a894d3e115f3b798f4', // Blueberry
  'brownies crepe': '2de13694343c1c728516', // brownies crepe
  'brownies waffle': '9338b16dff5e2e13abff', // brownies waffle
  'cake l': 'bec753e7508acffbd17e', // cake L
  'cake m': 'bec753e7508acffbd17e', // cake M
  'cake s': 'bec753e7508acffbd17e', // cake s
  'cerelac': 'stock-banana-milk2', // Cerelac
  'cheese balls 6 pcs': '8533341f2abe2353dcd7', // Cheese Balls (6 pcs)
  'chicken breast plate': 'stock-chicken-plate2', // Chicken Breast Plate
  'chicken mushroom plate': 'stock-chicken-plate2', // Chicken Mushroom Plate
  'chocolate mousse': '1abb8c4a3bcb01858795', // Chocolate Mousse
  'chocolate nutella': '9c088d9378ba07bb9a5e', // Chocolate nutella
  'coconut': 'stock-coconut', // Coconut
  'crepe marshmallow': '322ea94dced8187ce2dc', // Crepe - Marshmallow
  'crepe oreo': '91081cda918e29ea6cac', // Crepe - Oreo
  'fettuccine alfredo': 'stock-fettuccine-chicken', // Fettuccine Alfredo
  'fettuccine alfredo chicken': 'stock-fettuccine-chicken', // Fettuccine Alfredo Chicken
  'frappe|mocha': '569492bcd7cdf6fc75fc', // Frappe / Mocha
  'frappe|vanilla': 'stock-banana-milk2', // Frappe / Vanilla
  'french fries': 'stock-fries', // French Fries
  'grape mint': 'stock-f-hookah', // Grape & Mint
  'crepe|grape': 'stock-f-hookah', // Hookah: grape
  'hot beverage|mocha': '377b7c548f652905f3b0', // Hot Beverage / Mocha
  'laguna': 'd1a894d3e115f3b798f4', // Laguna
  'lemon mint': 'stock-f-hookah', // Lemon & Mint
  'love': 'stock-f-hookah', // Love
  'melon large': '7e68ffe4614bd39664be', // Melon - Large
  'melon medium': '7e68ffe4614bd39664be', // Melon - Medium
  'merry cream': 'ice-cream-display', // Merry Cream
  'moghli': '3a66df229f676041d7d6', // Moghli
  'nuttela': '9c088d9378ba07bb9a5e', // nuttela
  'onion rings 8 pcs': '8533341f2abe2353dcd7', // Onion Rings (8 pcs)
  'pancake 12 pcs kinder': 'e927968506715ddd2d69', // Pancake 12 pcs - Kinder
  'pancake 12 pcs marshmallow': 'e927968506715ddd2d69', // Pancake 12 pcs - Marshmallow
  'pancake 12 pcs oreo': 'e927968506715ddd2d69', // Pancake 12 pcs - Oreo
  'pancake 12 pcs white chocolate': 'e927968506715ddd2d69', // Pancake 12 pcs - White Chocolate
  'pancake 6 pcs kinder': 'e927968506715ddd2d69', // Pancake 6 pcs - Kinder
  'pancake 6 pcs marshmallow': 'e927968506715ddd2d69', // Pancake 6 pcs - Marshmallow
  'pancake 6 pcs oreo': 'e927968506715ddd2d69', // Pancake 6 pcs - Oreo
  'pancake 6 pcs white chocolate': 'e927968506715ddd2d69', // Pancake 6 pcs - White Chocolate
  'passion': 'stock-passion-mojito2', // Passion
  'pomegranate large': '514d577d79ab33b4becc', // Pomegranate - Large
  'pomegranate medium': '514d577d79ab33b4becc', // Pomegranate - Medium
  'rice pudding': '3a66df229f676041d7d6', // Rice Pudding
  'roll crepe': 'a6581126e3c00971f1c7', // Roll Crepe
  'rosereta': 'stock-red-drink', // Rosereta
  'shakes|lotus': '97e339d4a5e87ba5d489', // Shakes / Lotus
  'shakes|oreo': '9c088d9378ba07bb9a5e', // Shakes / Oreo
  'strawberry milk large': '7bc120538f8bf2dfed14', // Strawberry & Milk - Large
  'strawberry milk medium': '7bc120538f8bf2dfed14', // Strawberry & Milk - Medium
  'tropical large': '3f81ef021abb5683f8c3', // Tropical - Large
  'tropical medium': '3f81ef021abb5683f8c3', // Tropical - Medium
  'tropicana': '765b8dfa0bf570684896', // Tropicana
  'two apples fakher': 'stock-f-hookah', // Two Apples - Fakher
  'two apples mix': 'stock-f-hookah', // Two Apples - Mix
  'two apples nakhla': 'stock-f-hookah', // Two Apples - Nakhla
  'waffle marshmallow': 'f18a6025b80f11b250cd', // Waffle - Marshmallow
  'crab salad': 'stock-crab-salad', // Crab Salad
  'plate browni': 'stock-brownie', // plate browni
  '7up': 'stock-lemon-soda', // 7UP
  '7up can': 'stock-lemon-soda', // 7UP - Can
  'add': '2de13694343c1c728516', // add
  'add fliver': '3a66df229f676041d7d6', // add fliver
  'add fruit': 'd42b1908adbb6555aaa7', // add fruit
  'avocado extra l': 'a8ff1e0b0492b08f0ee8', // avocado extra / L
  'avocado extra m': 'a8ff1e0b0492b08f0ee8', // avocado extra / M
  'bottle juices': 'da5bc0da3dcbc9719abc', // Bottle juices
  'cocktail': '459e3e159c448d9e82f4', // Cocktail
  'cold beverage frappe': '9bac85ae4c27987cb58d', // Cold Beverage > Frappe
  'cold beverage fresh juices': '2c235de07d8ce7069a2d', // Cold Beverage > Fresh Juices
  'cold beverage iced coffee': '2f8ec9b258de369b5b98', // Cold Beverage > Iced Coffee
  'cold beverage mocktaillo': '765b8dfa0bf570684896', // Cold Beverage > Mocktaillo
  'cold beverage mojito': 'd1a894d3e115f3b798f4', // Cold Beverage > Mojito
  'cold beverage shakes': '9c088d9378ba07bb9a5e', // Cold Beverage > Shakes
  'cold beverage soft drinks': 'stock-cola', // Cold Beverage > Soft Drinks
  'dessert': '9338b16dff5e2e13abff', // Dessert / حلويات
  'dessert cold dessert': '2f8429b1389cfc6ffa04', // Dessert > Cold Dessert
  'dessert crepe': '52b8779099835b87bd5a', // Dessert > Crepe
  'dessert ice cream merry cream': 'ice-cream-display', // Dessert > Ice Cream & Merry Cream
  'dessert pancake': '92dde2d4a65e5ad94d71', // Dessert > Pancake
  'dessert waffle': '2102096e6dcb545ee984', // Dessert > Waffle
  'diet 7up': 'stock-lemon-soda', // Diet 7UP
  'diet 7up can': 'stock-lemon-soda', // Diet 7UP - Can
  'diet pepsi': 'stock-cola', // Diet Pepsi
  'diet pepsi can': 'stock-cola', // Diet Pepsi - Can
  'extra': 'dca065c0d1cb2cd27d59', // Extra
  'fiche': '2f8429b1389cfc6ffa04', // fiche
  'fresco fresh l': 'd42b1908adbb6555aaa7', // fresco fresh L
  'fresco fresh m': 'd42b1908adbb6555aaa7', // fresco fresh M
  'head change': 'stock-f-hookah', // Head Change
  'hookah': 'stock-f-hookah', // Hookah
  'hot beverage': '093417e3ec3abd3594ef', // Hot Beverage
  'knafeh': 'stock-knafeh', // Knafeh
  'large water': 'stock-water', // Large Water
  'large water large': 'stock-water', // Large Water - Large
  'mirinda': 'stock-orange-soda', // Mirinda
  'mirinda can': 'stock-orange-soda', // Mirinda - Can
  'pepsi': 'stock-cola', // Pepsi
  'pepsi can': 'stock-cola', // Pepsi - Can
  'pepsi l': 'stock-cola', // pepsi L
  'reservation': 'stock-f-hookah', // Reservation
  'salads': 'stock-caesar', // Salads
  'serves': '2b6129e74a5f5a2ed736', // serves
  'small water': 'stock-water', // Small Water
  'small water small': 'stock-water', // Small Water - Small
  'turki': '3a66df229f676041d7d6', // turki
}

const nameKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function brandedMenuPhoto(imageUrl: string | null, name = '', subcategory = '') {
  if (!imageUrl) {
    const shared = sharedPhotos[`${nameKey(subcategory)}|${nameKey(name)}`] || sharedPhotos[nameKey(name)]
    return shared ? `/menu-photos/${shared}.jpg` : null
  }
  const fingerprint = createHash('sha256').update(imageUrl).digest('hex').slice(0, 20)
  return editedPhotos.has(fingerprint) ? `/menu-photos/${fingerprint}.jpg` : imageUrl
}

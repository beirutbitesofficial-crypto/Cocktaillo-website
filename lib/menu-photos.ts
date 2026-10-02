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

export function brandedMenuPhoto(imageUrl: string | null) {
  if (!imageUrl) return null
  const fingerprint = createHash('sha256').update(imageUrl).digest('hex').slice(0, 20)
  return editedPhotos.has(fingerprint) ? `/menu-photos/${fingerprint}.jpg` : imageUrl
}

// Default storefront descriptions from the Cocktaillo digital menu.
// Descriptions saved from the admin menu editor always take precedence.
const descriptions: Record<string, string> = {
  // Sandwiches
  'fahita': 'Grilled chicken with mushrooms, corn, bell peppers, onions, soy sauce, mozzarella cheese & avocado sauce.',
  'spicy fahita': 'Grilled chicken with mushrooms, corn, bell peppers, onions, soy sauce, mozzarella cheese, mayo sauce & spicy sauce.',
  'chicken sub': 'Chicken, mushrooms, corn, bell peppers, onions, soy sauce, mozzarella cheese & avocado sauce.',
  'crispy': 'Fried chicken, coleslaw, corn, pickles & ketchup.',
  'twister': 'Fried chicken, mayonnaise sauce, lettuce, tomatoes, cheddar cheese slices & BBQ sauce.',

  // Beef burgers
  'lebanese burger': 'Beef patty, coleslaw, fries, ketchup & pickles.',
  'swiss mushroom burger': 'Beef patty, mayonnaise, rocca, Swiss mushroom sauce, sweet pickles & Emmental cheese.',
  'smashed burger': 'Burger sauce, lettuce, cheddar cheese slice, pickles & caramelized onions.',
  'beef mozzarella': 'Beef patty, mayonnaise, lettuce, fried cheese slice, BBQ sauce, burger sauce & pickles.',

  // Chicken burgers
  'zinger': 'Fried chicken fillet, mayonnaise, iceberg, tomato, cheddar cheese, pickles & hot honey sauce.',
  'chicken mozzarella': 'Grilled or fried chicken, mayonnaise, lettuce, tomato, fried cheese, BBQ sauce, cheddar & pickles or jalapeño.',
  'cocktaillo burger': 'Grilled chicken, mayonnaise, lettuce, tomato, fried cheese, honey mustard sauce & pickles.',

  // Pasta
  'fettuccine alfredo chicken': 'Pasta, mushroom sauce & parmesan.',
  'cocktaillo pasta': 'Pasta, cocktail sauce & parmesan.',

  // Platters
  'chicken breast plate': 'Chicken breast, carrots, broccoli & roasted potatoes. Mushroom sauce upon request.',
  'crispy plate': '5 crispy chicken pieces, fries, coleslaw & ketchup.',

  // Signature salads
  'caesar salad': 'Iceberg lettuce, cherry tomatoes, parmesan cheese, Caesar dressing & croutons.',
  'chicken caesar salad': 'Iceberg lettuce, cherry tomatoes, parmesan cheese, Caesar dressing & croutons.',
  'crab salad': 'Cherry tomatoes, carrots, corn, black seed, lemon & crab sauce.'
}

const descriptionKey = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export function defaultMenuDescription(name: string) {
  return descriptions[descriptionKey(name)] || null
}

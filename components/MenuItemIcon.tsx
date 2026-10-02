import { CakeSlice, Citrus, Coffee, CookingPot, CupSoda, Flame, GlassWater, Hamburger, IceCreamBowl, IceCreamCone, Martini, Popcorn, Salad, Sandwich, UtensilsCrossed, type LucideIcon } from 'lucide-react'

// Picks a branded line icon for menu items that have no photo yet.
const rules: Array<[RegExp, LucideIcon]> = [
  [/hookah|fakher|nakhla|head change|two apples/, Flame],
  [/burger|zinger|beef mozzarella|chicken mozzarella/, Hamburger],
  [/sandwich|fahita|sub\b|twister|crispy\b/, Sandwich],
  [/pasta|fettuccine alfredo/, CookingPot],
  [/platter|plate\b/, UtensilsCrossed],
  [/appetizer|fries|wedges|sticks|balls|bites|rings/, Popcorn],
  [/salad/, Salad],
  [/ice cream|merry cream/, IceCreamCone],
  [/iced|frappe|shake|frapp/, CupSoda],
  [/cocktail pieces|strawberry & banana|banana & milk|strawberry & milk|avocado|cocktail\b/, IceCreamBowl],
  [/crepe|waffle|pancake|dessert|cake|mousse|knafeh|custard|pudding|jelly|moghli|brownie/, CakeSlice],
  [/mojito|mocktaillo/, Martini],
  [/juice|lemonade|orange|carrot|apple|strawberry|melon|pomegranate|pineapple|mango|tropical/, Citrus],
  [/soft drink|pepsi|7up|mirinda|water|energy/, GlassWater],
  [/hot beverage|espresso|coffee|nescafe|latte|cappuccino|mocha|macchiato|ristretto|lungo|americano|tea|chocolate|anise|chamomile/, Coffee]
]

export default function MenuItemIcon({ name, category, subcategory }: { name: string; category: string; subcategory: string }) {
  const text = `${subcategory} ${name} ${category}`.toLowerCase()
  const Icon = rules.find(([pattern]) => pattern.test(text))?.[1] || UtensilsCrossed
  return <Icon className="menuItemIcon" strokeWidth={1.1} aria-hidden="true"/>
}
